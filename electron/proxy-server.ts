import http from 'http'
import https from 'https'
import net from 'net'
import { matchRule } from '../src/proxy/rule-engine'
import type { ProxyRule } from '../src/db/models'

let server: http.Server | null = null
let currentRules: ProxyRule[] = []
// 跟踪所有活跃连接，便于停止时快速销毁
const connections = new Set<net.Socket>()

// ========== 辅助函数 ==========

/**
 * 从 IncomingMessage 构建完整请求 URL
 */
function getFullUrl(req: http.IncomingMessage): string {
  // 浏览器通过正向代理发请求时，请求行带完整 URL
  if (req.url && /^https?:\/\//.test(req.url)) {
    return req.url
  }
  // 否则从 Host 头 + path 拼接
  const host = req.headers.host || 'localhost'
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http'
  return `${proto}://${host}${req.url || '/'}`
}

/**
 * 转发请求到目标 URL（匹配规则时使用）
 * 直接使用 http/https.request，完全控制器 URL 重写
 */
function forwardToTarget(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  targetUrl: string
): void {
  const target = new URL(targetUrl)
  const isHttps = target.protocol === 'https:'

  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: target.pathname + target.search,
    method: req.method,
    headers: cleanHeaders(req.headers, target.host)
  }

  const transport = isHttps ? https : http

  const proxyReq = transport.request(options, (proxyRes) => {
    // 透传状态码和响应头
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err: Error) => {
    console.error('[proxy-server] 转发错误:', err.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
    }
    res.end(`Forward Error: ${err.message}`)
  })

  // 将请求体 pipe 到目标
  req.pipe(proxyReq)
}

/**
 * 透明转发：不修改 URL，直连原始目标（未命中规则时使用）
 */
function forwardToOriginal(
  req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  // 从请求行解析原始目标
  let targetHost: string
  let targetPort: number
  let targetPath: string
  let isHttps = false

  if (req.url && /^https?:\/\//.test(req.url)) {
    // 请求行带完整 URL：GET http://example.com/path HTTP/1.1
    const target = new URL(req.url)
    isHttps = target.protocol === 'https:'
    targetHost = target.hostname
    targetPort = parseInt(target.port) || (isHttps ? 443 : 80)
    targetPath = target.pathname + target.search
  } else {
    // 从 Host 头解析
    const host = req.headers.host || 'localhost'
    const [hostname, portStr] = host.split(':')
    targetHost = hostname
    targetPort = parseInt(portStr) || 80
    targetPath = req.url || '/'
  }

  const options = {
    hostname: targetHost,
    port: targetPort,
    path: targetPath,
    method: req.method,
    headers: cleanHeaders(req.headers, targetHost)
  }

  const transport = isHttps ? https : http

  const proxyReq = transport.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err: Error) => {
    console.error('[proxy-server] 直连错误:', err.message)
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' })
    }
    res.end(`Connection Error: ${err.message}`)
  })

  req.pipe(proxyReq)
}

/**
 * 清理请求头，移除代理特有的头，设置正确的 Host
 */
function cleanHeaders(
  headers: http.IncomingHttpHeaders,
  targetHost: string
): Record<string, string | string[]> {
  const cleaned: Record<string, string | string[]> = {}

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    // 移除代理特有头和 hop-by-hop 头
    const lower = key.toLowerCase()
    if (
      lower === 'proxy-connection' ||
      lower === 'proxy-authorization' ||
      lower === 'proxy-authenticate' ||
      lower === 'transfer-encoding'
    ) {
      continue
    }
    cleaned[key] = value
  }

  // 设置正确的 Host 头
  cleaned['host'] = targetHost

  return cleaned
}

// ========== 公开 API ==========

export function startProxyServer(
  port: number,
  rules: ProxyRule[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      reject(new Error('代理服务器已在运行'))
      return
    }

    currentRules = JSON.parse(JSON.stringify(rules))

    server = http.createServer((req, res) => {
      const fullUrl = getFullUrl(req)
      const result = matchRule(fullUrl, currentRules)

      if (result.matched) {
        console.log(
          `[proxy-server] ✅ 命中 "${result.ruleName}": ${fullUrl} → ${result.targetUrl}`
        )
        forwardToTarget(req, res, result.targetUrl)
      } else {
        console.log(`[proxy-server] ⏭ 未命中，直连: ${fullUrl}`)
        forwardToOriginal(req, res)
      }
    })

    // CONNECT 隧道：HTTPS 请求透传，不做规则匹配
    server.on(
      'connect',
      (req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) => {
        const url = req.url || ''
        const [hostname, portStr] = url.split(':')
        const targetPort = parseInt(portStr, 10) || 443

        console.log(`[proxy-server] 🔒 CONNECT 隧道: ${hostname}:${targetPort}`)

        const targetSocket = net.connect(targetPort, hostname, () => {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
          targetSocket.write(head)
          targetSocket.pipe(clientSocket)
          clientSocket.pipe(targetSocket)
        })

        targetSocket.on('error', (err: Error) => {
          console.error('[proxy-server] CONNECT error:', err.message)
          clientSocket.end()
        })

        clientSocket.on('error', (err: Error) => {
          console.error('[proxy-server] clientSocket error:', err.message)
          targetSocket.end()
        })
      }
    )

    // 跟踪连接便于快速关闭
    server.on('connection', (socket) => {
      connections.add(socket)
      socket.on('close', () => connections.delete(socket))
    })

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`端口 ${port} 已被占用`))
      } else {
        reject(err)
      }
    })

    server.listen(port, '127.0.0.1', () => {
      console.log(`[proxy-server] 代理服务器已启动: http://127.0.0.1:${port}`)
      resolve()
    })
  })
}

export function stopProxyServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!server) {
      resolve()
      return
    }

    const s = server
    server = null
    currentRules = []

    // 1. 立即销毁所有活跃连接（不再等待 keep-alive 自然关闭）
    for (const socket of connections) {
      socket.destroy()
    }
    connections.clear()

    // 2. 关闭服务器（连接已全部销毁，close 会立即触发）
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }

    s.close((err) => {
      if (err) {
        console.error('[proxy-server] 关闭服务器错误:', err.message)
      } else {
        console.log('[proxy-server] 代理服务器已停止')
      }
      done()
    })

    // 3. 兜底：500ms 后还没触发回调则强制完成
    setTimeout(() => {
      if (!settled) {
        console.log('[proxy-server] close 未触发，强制完成')
        done()
      }
    }, 500)
  })
}

export function updateRules(rules: ProxyRule[]): void {
  currentRules = JSON.parse(JSON.stringify(rules))
  console.log(`[proxy-server] 规则已更新 (${rules.length} 条)`)
}

export function getProxyStatus(): {
  running: boolean
  port: number
  ruleCount: number
} {
  return {
    running: server !== null,
    port: server ? 8899 : 0,
    ruleCount: currentRules.length
  }
}
