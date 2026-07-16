import { execSync } from 'child_process'

const REG_PATH =
  'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'

/** 记录原始代理配置，用于恢复 */
let originalProxyEnable = ''
let originalProxyServer = ''

/**
 * 读取当前系统代理设置并保存
 */
function saveOriginalSettings(): void {
  try {
    originalProxyEnable = execSync(
      `reg query "${REG_PATH}" /v ProxyEnable 2>nul`,
      { encoding: 'utf8' }
    )
      .trim()
      .split(/\s+/)
      .pop() || '0x0'
  } catch {
    originalProxyEnable = '0x0'
  }

  try {
    originalProxyServer = execSync(
      `reg query "${REG_PATH}" /v ProxyServer 2>nul`,
      { encoding: 'utf8' }
    )
      .trim()
      .split('    ')[2] || ''
  } catch {
    originalProxyServer = ''
  }
}

/**
 * 启用系统代理，指向本地代理端口
 */
export function enableSystemProxy(port: number): void {
  saveOriginalSettings()

  const proxyAddress = `127.0.0.1:${port}`

  // 启用代理
  execSync(
    `reg add "${REG_PATH}" /v ProxyEnable /t REG_DWORD /d 1 /f`,
    { stdio: 'ignore' }
  )

  // 设置代理服务器地址
  execSync(
    `reg add "${REG_PATH}" /v ProxyServer /t REG_SZ /d "${proxyAddress}" /f`,
    { stdio: 'ignore' }
  )

  console.log(`[system-proxy] 系统代理已启用: ${proxyAddress}`)
}

/**
 * 禁用系统代理，恢复原始设置
 */
export function disableSystemProxy(): void {
  // 恢复原始启用状态
  const enableVal = originalProxyEnable || '0x0'
  execSync(
    `reg add "${REG_PATH}" /v ProxyEnable /t REG_DWORD /d ${enableVal} /f`,
    { stdio: 'ignore' }
  )

  // 恢复原始代理服务器地址
  if (originalProxyServer) {
    execSync(
      `reg add "${REG_PATH}" /v ProxyServer /t REG_SZ /d "${originalProxyServer}" /f`,
      { stdio: 'ignore' }
    )
  } else {
    execSync(
      `reg delete "${REG_PATH}" /v ProxyServer /f 2>nul`,
      { stdio: 'ignore' }
    )
  }

  console.log('[system-proxy] 系统代理已恢复')
}

/**
 * 检查端口是否可用
 */
export function checkPortAvailable(port: number): Promise<boolean> {
  const net = require('net')
  return new Promise<boolean>((resolve) => {
    const tester = net
      .createServer()
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false)
        } else {
          resolve(false)
        }
      })
      .once('listening', () => {
        tester.close()
        resolve(true)
      })
      .listen(port, '127.0.0.1')
  })
}
