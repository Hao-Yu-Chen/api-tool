// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import net from 'net'
import { startProxyServer, stopProxyServer } from '../electron/proxy-server'
import type { ProxyRule } from '@/db/models'

/**
 * 代理服务器端到端测试：
 * 用本机端口模拟"局域网测试环境"，验证规则转发、直连、HTTPS 隧道改写与坏规则容错。
 */

const LAN_PORT = 45080
const LAN_HTTPS_PORT = 45443
const PROXY_PORT = 18899

let lan: http.Server
let lanTlsLike: net.Server

function fetchThroughProxy(
  absoluteUrl: string,
  method = 'GET'
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PROXY_PORT,
        method,
        path: absoluteUrl,
        headers: {
          Host: new URL(absoluteUrl).host,
          'Proxy-Connection': 'keep-alive'
        }
      },
      (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => resolve({ status: res.statusCode || 0, body }))
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/** 发送 CONNECT，返回代理的响应状态行 */
function connectThroughProxy(hostPort: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(PROXY_PORT, '127.0.0.1', () => {
      socket.write(`CONNECT ${hostPort} HTTP/1.1\r\nHost: ${hostPort}\r\n\r\n`)
    })
    let data = ''
    socket.on('data', (chunk) => {
      data += chunk.toString()
      if (data.includes('\r\n\r\n')) {
        socket.destroy()
        resolve(data.split('\r\n')[0])
      }
    })
    socket.on('error', reject)
  })
}

const rules: ProxyRule[] = [
  {
    id: 1,
    name: '转发到局域网测试环境',
    sourcePattern: 'http://xmjs.test.com:9527/api/**',
    targetAddress: `http://127.0.0.1:${LAN_PORT}/**`,
    enabled: true,
    order: 0,
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 2,
    name: 'HTTPS 隧道改写',
    sourcePattern: 'https://secure.test.com/**',
    targetAddress: `https://127.0.0.1:${LAN_HTTPS_PORT}/**`,
    enabled: true,
    order: 1,
    createdAt: 0,
    updatedAt: 0
  },
  {
    id: 3,
    name: '无效规则',
    sourcePattern: 'not a url',
    targetAddress: 'also not a url',
    enabled: true,
    order: 2,
    createdAt: 0,
    updatedAt: 0
  }
]

beforeAll(async () => {
  lan = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        host: req.headers.host,
        url: req.url,
        method: req.method
      })
    )
  })
  await new Promise<void>((r) => lan.listen(LAN_PORT, '127.0.0.1', r))

  // 模拟局域网 HTTPS 目标：只验证隧道是否被连到正确的主机与端口
  lanTlsLike = net.createServer((socket) => {
    socket.on('data', () => socket.write('hello'))
  })
  await new Promise<void>((r) =>
    lanTlsLike.listen(LAN_HTTPS_PORT, '127.0.0.1', r)
  )

  await startProxyServer(PROXY_PORT, rules)
}, 20000)

afterAll(async () => {
  await stopProxyServer()
  await new Promise<void>((r) => lan.close(() => r()))
  await new Promise<void>((r) => lanTlsLike.close(() => r()))
})

describe('proxy-server 端到端转发', () => {
  it('命中规则时转发到目标并保留路径与查询串', async () => {
    const res = await fetchThroughProxy(
      'http://xmjs.test.com:9527/api/admin-api/page?pageNo=1&pageSize=10'
    )
    expect(res.status).toBe(200)
    expect(res.body).toContain('/admin-api/page?pageNo=1&pageSize=10')
    expect(res.body).toContain(`127.0.0.1:${LAN_PORT}`)
  })

  it('未命中规则时直连，且 Host 头保留原始端口', async () => {
    const res = await fetchThroughProxy(
      `http://127.0.0.1:${LAN_PORT}/direct/path`
    )
    expect(res.status).toBe(200)
    expect(res.body).toContain('/direct/path')
    expect(res.body).toContain(`127.0.0.1:${LAN_PORT}`)
  })

  it('POST 等非 GET 方法的 method 应保持不变', async () => {
    const res = await fetchThroughProxy(
      'http://xmjs.test.com:9527/api/echo',
      'POST'
    )
    expect(res.status).toBe(200)
    expect(res.body).toContain('/echo')
    expect(res.body).toContain('POST')
  })

  it('CONNECT 命中规则时隧道应连到目标主机端口', async () => {
    const statusLine = await connectThroughProxy('secure.test.com:443')
    expect(statusLine).toContain('200')
  })

  it('无效规则被忽略，不影响其它规则匹配', async () => {
    const res = await fetchThroughProxy(
      'http://xmjs.test.com:9527/api/after-bad-rule'
    )
    expect(res.status).toBe(200)
  })
})
