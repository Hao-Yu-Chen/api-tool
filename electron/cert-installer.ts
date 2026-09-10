import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { app, dialog } from 'electron'
import {
  CA_COMMON_NAME,
  ensureCA,
  getCACertPath,
  hasCA,
  setCertDir
} from './cert-manager'

/**
 * 根证书在 Windows 上的安装 / 卸载 / 查询。
 * 依赖 electron（userData 与文件对话框），只在主进程使用。
 */

let certDirConfigured = false

/** 把证书目录固定到 userData，保证重启后仍使用同一张根证书 */
export function configureCertDir(): string {
  const dir = path.join(app.getPath('userData'), 'proxy-certs')
  if (!certDirConfigured) {
    setCertDir(dir)
    certDirConfigured = true
  }
  return dir
}

function runPowerShell(script: string, timeoutMs = 60000): string {
  return execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { encoding: 'utf8', windowsHide: true, timeout: timeoutMs }
  )
}

/** 根证书是否已安装到「当前用户 → 受信任的根证书颁发机构」 */
export function isCAInstalled(): boolean {
  if (process.platform !== 'win32') return false
  if (!hasCA()) return false

  const script = `
$store = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root','CurrentUser')
$store.Open('ReadOnly')
$count = @($store.Certificates | Where-Object { $_.Subject -like '*${CA_COMMON_NAME}*' }).Count
$store.Close()
Write-Output $count
`
  try {
    const out = runPowerShell(script, 30000)
    return parseInt(out.trim().split(/\r?\n/).pop() || '0', 10) > 0
  } catch (err: any) {
    console.warn('[cert-installer] 查询根证书状态失败:', err?.message)
    return false
  }
}

/**
 * 安装根证书。Windows 可能弹出「确认安装证书」对话框，用户确认后才会返回。
 */
export function installCA(): { success: boolean; error?: string; certPath?: string } {
  try {
    configureCertDir()
    ensureCA()
    const certPath = getCACertPath()

    if (process.platform !== 'win32') {
      return { success: false, error: '仅支持 Windows 自动安装', certPath }
    }

    const script = `
$cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new('${certPath}')
$store = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root','CurrentUser')
$store.Open('ReadWrite')
$store.Add($cert)
$store.Close()
`
    runPowerShell(script, 120000)
    console.log('[cert-installer] 根证书已安装:', certPath)
    return { success: true, certPath }
  } catch (err: any) {
    console.error('[cert-installer] 安装根证书失败:', err?.message)
    return { success: false, error: err?.message || '安装失败' }
  }
}

/** 从根证书存储中移除本应用签发的根证书 */
export function uninstallCA(): { success: boolean; error?: string } {
  if (process.platform !== 'win32') {
    return { success: false, error: '仅支持 Windows' }
  }
  try {
    const script = `
$store = [System.Security.Cryptography.X509Certificates.X509Store]::new('Root','CurrentUser')
$store.Open('ReadWrite')
$targets = @($store.Certificates | Where-Object { $_.Subject -like '*${CA_COMMON_NAME}*' })
foreach ($c in $targets) { $store.Remove($c) }
$store.Close()
Write-Output $targets.Count
`
    runPowerShell(script, 60000)
    return { success: true }
  } catch (err: any) {
    console.error('[cert-installer] 卸载根证书失败:', err?.message)
    return { success: false, error: err?.message || '卸载失败' }
  }
}

/** 导出根证书到用户指定位置，便于手动安装 */
export function exportCA(): { success: boolean; error?: string; path?: string } {
  try {
    configureCertDir()
    ensureCA()
    const source = getCACertPath()

    const target = dialog.showSaveDialogSync({
      title: '导出根证书',
      defaultPath: path.join(app.getPath('downloads'), 'api-tool-proxy-ca.crt'),
      filters: [{ name: '证书文件', extensions: ['crt', 'pem', 'cer'] }]
    })
    if (!target) return { success: false, error: '已取消' }

    fs.copyFileSync(source, target)
    return { success: true, path: target }
  } catch (err: any) {
    return { success: false, error: err?.message || '导出失败' }
  }
}
