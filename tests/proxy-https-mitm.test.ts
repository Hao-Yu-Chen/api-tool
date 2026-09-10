// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'http'
import net from 'net'
import tls from 'tls'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  startProxyServer,
  stopProxyServer,
  setMitmEnabled
} from '../electron/proxy-server'
import { setCertDir, getCACertPem } from '../electron/cert-manager'
import type { ProxyRule } from '@/db/models'

/**
 * HTTPS 解密转发（MITM）端到端测试：
 * 客户端 → TLS（信任本地根证书）→ 代理解密 → 按规则改写路径 → 转发到 http 目标
 */

const PROXY_PORT = 18901
const LAN_PORT = 45081

let lan: http.Server
let caPem = ''

/** 通过代理建立 CONNECT + TLS，并发送一个明文请求，返回完整响应 */
function mitmRequest(hostname: string, requestPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(PROXY_PORT, '127.0.0.1', () => {
      socket.write(
        `CONNECT ${hostname}:443 HTTP/1.1\r\nHost: ${hostname}:443\r\n\r\n`
      )
    })

    let handshake = ''
    const onHandshake = (chunk: Buffer) => {
      handshake += chunk.toString()
      if (!handshake.includes('\r\n\r\n')) return
      if (!handshake.startsWith('HTTP/1.1 200')) {
        socket.destroy()
        reject(new Error(`CONNECT 失败: ${handshake.split('\r\n')[0]}`))
        return
      }
      socket.removeListener('data', onHandshake)

      const tlsSocket = tls.connect(
        {
          socket,
          servername: hostname,
          ca: [caPem],
          rejectUnauthorized: true,
          ALPNProtocols: ['http/1.1']
        },
        () => {
          tlsSocket.write(
            `GET ${requestPath} HTTP/1.1\r\nHost: ${hostname}\r\nConnection: close\r\n\r\n`
          )
        }
      )

      let response = ''
      tlsSocket.on('data', (c) => (response += c.toString()))
      tlsSocket.on('end', () => resolve(response))
      tlsSocket.on('error', reject)
    }

    socket.on('data', onHandshake)
    socket.on('error', reject)
  })
}

beforeAll(async () => {
  // 证书目录放到临时目录，避免与真实用户数据混淆
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-tool-cert-'))
  setCertDir(dir)
  caPem = getCACertPem()

  lan = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({ host: req.headers.host, url: req.url, method: req.method })
    )
  })
  await new Promise<void>((r) => lan.listen(LAN_PORT, '127.0.0.1', r))

  const rules: ProxyRule[] = [
    {
      id: 1,
      name: 'HTTPS 转发到局域网 http 测试环境',
      sourcePattern: 'https://secure.test.com/api/**',
      targetAddress: `http://127.0.0.1:${LAN_PORT}/admin-api/**`,
      enabled: true,
      order: 0,
      createdAt: 0,
      updatedAt: 0
    }
  ]
  await startProxyServer(PROXY_PORT, rules)
  setMitmEnabled(true)
}, 120000)

afterAll(async () => {
  setMitmEnabled(false)
  await stopProxyServer()
  await new Promise<void>((r) => lan.close(() => r()))
})

describe('HTTPS 解密转发', () => {
  it('根证书应成功生成', () => {
    expect(caPem).toContain('BEGIN CERTIFICATE')
  })

  it('解密后应按规则改写路径并转发到 http 目标', async () => {
    const response = await mitmRequest('secure.test.com', '/api/foo?page=1')
    expect(response).toContain('200 OK')
    expect(response).toContain('/admin-api/foo?page=1')
    expect(response).toContain(`127.0.0.1:${LAN_PORT}`)
  }, 60000)

  it('未命中规则的 https 请求应回源到原主机（https）', async () => {
    // 该主机没有规则命中，代理会直接向真实主机发起 https 请求，
    // 因无法联网会失败，但必须表现为「尝试直连」而不是解析失败
    const response = await mitmRequest('secure.test.com', '/not-matched')
    expect(response).not.toContain('/admin-api/')
  }, 60000)
})
