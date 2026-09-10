import { execSync, execFileSync } from 'child_process'
import net from 'net'

const REG_PATH =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'

/**
 * 启用期间使用的绕过列表。
 * 只放行本机回环，其余（含 192.168.x.x / 10.x.x.x 等局域网地址）全部进入代理，
 * 否则 Windows 默认或企业下发的内网绕过规则会让测试环境请求直接绕过代理。
 */
const LOOPBACK_BYPASS = 'localhost;127.0.0.1;[::1]'

/** 需要备份/恢复的注册表项 */
interface ProxySnapshot {
  proxyEnable: string | null
  proxyServer: string | null
  proxyOverride: string | null
  autoDetect: string | null
  autoConfigURL: string | null
}

let snapshot: ProxySnapshot | null = null

// ========== 注册表读写 ==========

/**
 * 读取注册表值。
 * `reg query` 输出形如：
 * ```
 * HKEY_CURRENT_USER\...\Internet Settings
 *     ProxyServer    REG_SZ    127.0.0.1:8899
 * ```
 * 必须按行解析并校验值名，否则会取到键路径或类型名（REG_SZ）。
 */
function regQuery(name: string): string | null {
  try {
    const output = execSync(`reg query "${REG_PATH}" /v ${name} 2>nul`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    for (const rawLine of output.split(/\r?\n/)) {
      const parts = rawLine.trim().split(/\s+/)
      if (parts.length < 3) continue
      if (parts[0].toLowerCase() !== name.toLowerCase()) continue
      if (!parts[1].startsWith('REG_')) continue
      const value = parts.slice(2).join(' ').trim()
      return value === '' ? null : value
    }
    return null
  } catch {
    // 值不存在
    return null
  }
}

function regSet(name: string, type: 'REG_SZ' | 'REG_DWORD', value: string): void {
  execSync(
    `reg add "${REG_PATH}" /v ${name} /t ${type} /d "${value}" /f`,
    { stdio: 'ignore' }
  )
}

function regDelete(name: string): void {
  try {
    execSync(`reg delete "${REG_PATH}" /v ${name} /f`, { stdio: 'ignore' })
  } catch {
    // 值不存在时 reg 返回非 0 退出码，属于预期情况，忽略
  }
}

function readSnapshot(): ProxySnapshot {
  return {
    proxyEnable: regQuery('ProxyEnable'),
    proxyServer: regQuery('ProxyServer'),
    proxyOverride: regQuery('ProxyOverride'),
    autoDetect: regQuery('AutoDetect'),
    autoConfigURL: regQuery('AutoConfigURL')
  }
}

// ========== 通知系统代理已变更 ==========

/**
 * 仅改注册表不会让已运行的进程感知变化，必须广播
 * `INTERNET_OPTION_SETTINGS_CHANGED` / `INTERNET_OPTION_REFRESH`，
 * 否则浏览器仍沿用旧配置，请求根本不会进入本地代理。
 */
function notifyProxyChanged(): void {
  if (process.platform !== 'win32') return
  const script = `
$sig = @'
[DllImport("wininet.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern bool InternetSetOption(System.IntPtr hInternet, int dwOption, System.IntPtr lpBuffer, int dwBufferLength);
'@
$type = Add-Type -MemberDefinition $sig -Name WinINetProxy -Namespace ApiTool -PassThru -ErrorAction SilentlyContinue
if ($null -ne $type) {
  $type::InternetSetOption([System.IntPtr]::Zero, 39, [System.IntPtr]::Zero, 0) | Out-Null
  $type::InternetSetOption([System.IntPtr]::Zero, 37, [System.IntPtr]::Zero, 0) | Out-Null
}
`
  try {
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { stdio: 'ignore', windowsHide: true, timeout: 30000 }
    )
  } catch (err: any) {
    console.warn('[system-proxy] 广播代理变更失败:', err?.message)
  }
}

// ========== 公开 API ==========

/**
 * 启用系统代理，指向本地代理端口。
 *
 * 同时处理三件容易被忽略、且会直接导致"请求进不了代理"的事：
 * 1. 清空 ProxyOverride —— 内网绕过规则会让局域网/测试环境地址直接绕过代理
 * 2. 关闭 AutoDetect / AutoConfigURL —— WPAD 与 PAC 脚本优先级高于静态代理
 * 3. 广播设置变更 —— 让已运行的浏览器立即生效
 */
export function enableSystemProxy(port: number): void {
  if (process.platform !== 'win32') {
    console.warn('[system-proxy] 非 Windows 平台，跳过系统代理设置')
    return
  }

  // 已启用时不要重复备份，否则会把我们自己写入的值当成原始值
  if (!snapshot) {
    snapshot = readSnapshot()
  }

  const proxyAddress = `127.0.0.1:${port}`

  regSet('ProxyEnable', 'REG_DWORD', '1')
  regSet('ProxyServer', 'REG_SZ', proxyAddress)
  regSet('ProxyOverride', 'REG_SZ', LOOPBACK_BYPASS)
  regSet('AutoDetect', 'REG_DWORD', '0')
  regDelete('AutoConfigURL')

  notifyProxyChanged()

  console.log(`[system-proxy] 系统代理已启用: ${proxyAddress}`)
}

/** 禁用系统代理，完整恢复启用前的配置 */
export function disableSystemProxy(): void {
  if (process.platform !== 'win32') return

  const original = snapshot ?? readSnapshot()

  restoreValue('ProxyEnable', original.proxyEnable, 'REG_DWORD', '0')
  restoreValue('ProxyServer', original.proxyServer, 'REG_SZ', null)
  restoreValue('ProxyOverride', original.proxyOverride, 'REG_SZ', null)
  // AutoDetect 不存在时 Windows 默认启用自动检测，因此恢复时应删除而不是写成 0
  restoreValue('AutoDetect', original.autoDetect, 'REG_DWORD', null)
  restoreValue('AutoConfigURL', original.autoConfigURL, 'REG_SZ', null)

  snapshot = null
  notifyProxyChanged()

  console.log('[system-proxy] 系统代理已恢复')
}

function restoreValue(
  name: string,
  original: string | null,
  type: 'REG_SZ' | 'REG_DWORD',
  fallback: string | null
): void {
  const value = original ?? fallback
  if (value === null) {
    regDelete(name)
  } else {
    regSet(name, type, value)
  }
}

/** 读取当前系统代理配置，用于诊断与展示 */
export function getSystemProxyState(): ProxySnapshot & {
  platform: string
  supported: boolean
} {
  const current = readSnapshot()
  return {
    ...current,
    platform: process.platform,
    supported: process.platform === 'win32'
  }
}

/**
 * 检查端口是否可用
 */
export function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false)
      })
      .once('listening', () => {
        tester.close(() => resolve(true))
      })
    tester.listen(port, '127.0.0.1')
  })
}
