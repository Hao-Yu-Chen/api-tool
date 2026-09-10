import http from 'http'
import https from 'https'
import net from 'net'
import { matchRule } from '../src/proxy/rule-engine'
import type { ProxyRule } from '../src/db/models'

let server: http.Server | null = null
let currentRules: ProxyRule[] = []
let listenPort = 0
// 跟踪所有活跃连接，便于停止时快速销毁
const connections = new Set<net.Socket>()

/** 转发到目标地址的超时时间（毫秒） */
const FORWARD_TIMEOUT = 30_000

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
 * 清理请求头，移除代理特有的头，设置正确的 Host
 */
function cleanHeaders(
  headers: http.IncomingHttpHeaders,
  hostHeader: string
): Record<string, string | string[]> {
  const cleaned: Record<string, string | string[]> = {}
  const drop = new Set([
    'proxy-connection',
    'proxy-authorization',
    'proxy-authenticate',
    'transfer-encoding',
    'connection',
    'keep-alive'
  ])

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    // 移除代理特有头和 hop-by-hop 头
    if (drop.has(key.toLowerCase())) continue
    cleaned[key] = value
  }

  // 设置正确的 Host 头（必须带端口，局域网测试环境通常依赖非 80 端口做虚拟主机路由）
  cleaned['host'] = hostHeader

  return cleaned
}

interface ForwardTarget {
  hostname: string
  port: number
  path: string
  /** 发送到目标服务器的 Host 头，包含端口 */
  hostHeader: string
  secure: boolean
  label: string
}

/**
 * 统一的转发实现：命中规则与直连共用，只是目标不同
 */
function forward(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  target: ForwardTarget
): void {
  const transport = target.secure ? https : http

  const proxyReq = transport.request(
    {
      hostname: target.hostname,
      port: target.port,
      path: target.path,
      method: req.method,
      headers: cleanHeaders(req.headers, target.hostHeader),
      // 每次请求独立建连，避免复用指向不同目标/端口的 socket
      agent: false
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.setTimeout(FORWARD_TIMEOUT, () => {
    proxyReq.destroy(new Error('转发超时'))
  })

  proxyReq.on('error', (err: Error) => {
    console.error(`[proxy-server] ${target.label} 错误:`, err.message)
    if (res.headersSent) {
      res.end()
      return
    }
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`Forward Error: ${err.message}`)
  })

  req.on('error', (err: Error) => {
    console.error('[proxy-server] 客户端请求错误:', err.message)
    proxyReq.destroy()
  })

  // 将请求体 pipe 到目标
  req.pipe(proxyReq)
}

/**
 * 转发请求到目标 URL（命中规则时使用）
 */
function forwardToTarget(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  targetUrl: string
): void {
  const target = new URL(targetUrl)
  const isHttps = target.protocol === 'https:'

  forward(req, res, {
    hostname: target.hostname,
    port: parseInt(target.port, 10) || (isHttps ? 443 : 80),
    path: target.pathname + target.search,
    hostHeader: target.host,
    secure: isHttps,
    label: `转发 ${targetUrl}`
  })
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
  let hostHeader: string
  let isHttps = false

  if (req.url && /^https?:\/\//.test(req.url)) {
    // 请求行带完整 URL：GET http://example.com/path HTTP/1.1
    const target = new URL(req.url)
    isHttps = target.protocol === 'https:'
    targetHost = target.hostname
    targetPort = parseInt(target.port, 10) || (isHttps ? 443 : 80)
    targetPath = target.pathname + target.search
    // target.host 已包含非默认端口
    hostHeader = target.host
  } else {
    // 从 Host 头解析，保留原始端口
    hostHeader = req.headers.host || 'localhost'
    const [hostname, portStr] = hostHeader.split(':')
    targetHost = hostname
    targetPort = parseInt(portStr, 10) || 80
    targetPath = req.url || '/'
  }

  forward(req, res, {
    hostname: targetHost,
    port: targetPort,
    path: targetPath,
    hostHeader,
    secure: isHttps,
    label: `直连 ${hostHeader}${targetPath}`
  })
}

// ========== HTTPS 隧道（CONNECT）主机级改写 ==========

const REGEX_SPECIAL = /[.+?^${}()|[\]\\/]/g

/**
 * 把 host 通配符片段编译为正则：
 * `**` → 多层，`*` → 单层子域名
 */
function hostPatternToRegex(host: string): RegExp | null {
  try {
    const regex = host
      .replace(/\*\*/g, '\x00')
      .replace(/\*/g, '\x01')
      .replace(REGEX_SPECIAL, '\\$&')
      .replace(/\x00/g, '(.+)')
      .replace(/\x01/g, '([^./]+)')
    return new RegExp('^' + regex + '$')
  } catch {
    return null
  }
}

interface TunnelRewrite {
  hostname: string
  port: number
  ruleName: string
}

/**
 * CONNECT 请求只带 host:port，没有路径，无法做路径级重写。
 * 但主机级改写无需 MITM 即可完成：把隧道连到规则目标对应的主机与端口，
 * 这样 HTTPS 请求也能被转发到局域网测试环境。
 */
function matchTunnelRewrite(
  hostname: string,
  port: number,
  rules: ProxyRule[]
): TunnelRewrite | null {
  const enabledRules = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.order - b.order)

  for (const rule of enabledRules) {
    try {
      // 通配符替换成占位字符，保证 URL 可解析
      const source = new URL(rule.sourcePattern.replace(/\*\*?/g, 'x'))
      if (source.protocol !== 'https:') continue

      const sourcePort = parseInt(source.port, 10) || 443
      if (sourcePort !== port) continue

      const hostRegex = hostPatternToRegex(source.hostname)
      if (!hostRegex || !hostRegex.test(hostname)) continue

      const dest = new URL(rule.targetAddress.replace(/\*\*?/g, 'x'))
      if (dest.protocol !== 'https:') {
        console.warn(
          `[proxy-server] ⚠️ 规则 "${rule.name}" 目标为 ${dest.protocol}，HTTPS 隧道无法降级为明文，已原样透传`
        )
        continue
      }

      return {
        hostname: dest.hostname,
        port: parseInt(dest.port, 10) || 443,
        ruleName: rule.name
      }
    } catch {
      // 跳过无法解析的规则
      continue
    }
  }

  return null
}

// ========== 规则校验 ==========

/**
 * 过滤掉无法解析的规则，避免单条坏规则在请求时抛异常影响整个代理
 */
function sanitizeRules(rules: ProxyRule[]): ProxyRule[] {
  const valid = rules.filter((rule) => {
    try {
      new URL(rule.sourcePattern.replace(/\*\*?/g, 'x'))
      new URL(rule.targetAddress.replace(/\*\*?/g, 'x'))
      return true
    } catch {
      console.warn(
        `[proxy-server] 忽略无效规则 "${rule?.name}": source=${rule?.sourcePattern} target=${rule?.targetAddress}`
      )
      return false
    }
  })
  if (valid.length !== rules.length) {
    console.warn(
      `[proxy-server] 共忽略 ${rules.length - valid.length} 条无效规则`
    )
  }
  return valid
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

    currentRules = sanitizeRules(JSON.parse(JSON.stringify(rules)))

    server = http.createServer((req, res) => {
      try {
        const fullUrl = getFullUrl(req)

        let result: ReturnType<typeof matchRule> = { matched: false }
        try {
          result = matchRule(fullUrl, currentRules)
        } catch (err: any) {
          console.error('[proxy-server] 规则匹配异常:', err?.message)
        }

        if (result.matched) {
          console.log(
            `[proxy-server] ✅ 命中 "${result.ruleName}": ${fullUrl} → ${result.targetUrl}`
          )
          forwardToTarget(req, res, result.targetUrl)
        } else {
          console.log(`[proxy-server] ⏭ 未命中，直连: ${fullUrl}`)
          forwardToOriginal(req, res)
        }
      } catch (err: any) {
        console.error('[proxy-server] 处理请求异常:', err?.message)
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
        }
        res.end(`Proxy Error: ${err?.message || 'unknown'}`)
      }
    })

    // CONNECT 隧道：HTTPS 请求。命中规则时改写隧道目标主机，否则原样透传
    server.on(
      'connect',
      (req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer) => {
        const url = req.url || ''
        const [hostname, portStr] = url.split(':')
        const targetPort = parseInt(portStr, 10) || 443

        const rewrite = matchTunnelRewrite(hostname, targetPort, currentRules)
        const destHost = rewrite ? rewrite.hostname : hostname
        const destPort = rewrite ? rewrite.port : targetPort

        if (rewrite) {
          console.log(
            `[proxy-server] 🔒 隧道改写 "${rewrite.ruleName}": ${hostname}:${targetPort} → ${destHost}:${destPort}`
          )
        } else {
          console.log(`[proxy-server] 🔒 隧道透传: ${hostname}:${targetPort}`)
        }

        const targetSocket = net.connect(destPort, destHost, () => {
          clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
          if (head && head.length > 0) targetSocket.write(head)
          targetSocket.pipe(clientSocket)
          clientSocket.pipe(targetSocket)
        })

        const destroy = (socket: net.Socket) => {
          if (!socket.destroyed) socket.destroy()
        }

        targetSocket.on('error', (err: Error) => {
          console.error('[proxy-server] CONNECT error:', err.message)
          destroy(clientSocket)
        })

        clientSocket.on('error', (err: Error) => {
          console.error('[proxy-server] clientSocket error:', err.message)
          destroy(targetSocket)
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
      listenPort = port
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
    listenPort = 0

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
  currentRules = sanitizeRules(JSON.parse(JSON.stringify(rules)))
  console.log(`[proxy-server] 规则已更新 (${currentRules.length} 条生效)`)
}

export function getProxyStatus(): {
  running: boolean
  port: number
  ruleCount: number
} {
  return {
    running: server !== null,
    port: server ? listenPort : 0,
    ruleCount: currentRules.length
  }
}
