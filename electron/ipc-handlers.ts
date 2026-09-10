import { ipcMain, BrowserWindow, Notification, app } from 'electron'
import type Store from 'electron-store'
import {
  startProxyServer,
  stopProxyServer,
  updateRules,
  getProxyStatus
} from './proxy-server'
import {
  enableSystemProxy,
  disableSystemProxy,
  checkPortAvailable,
  getSystemProxyState
} from './system-proxy'
import {
  configureCertDir,
  isCAInstalled,
  installCA,
  uninstallCA,
  exportCA
} from './cert-installer'
import { setMitmEnabled } from './proxy-server'

interface DesktopSettings {
  autoLaunch: boolean
  minimizeToTray: boolean
  notifyOnComplete: boolean
  registerFileAssociation: boolean
}

const defaultSettings: DesktopSettings = {
  autoLaunch: false,
  minimizeToTray: true,
  notifyOnComplete: false,
  registerFileAssociation: false
}

export function registerIpcHandlers(
  store: Store<{ desktop: DesktopSettings }>,
  getMainWindow: () => BrowserWindow | null
): void {
  // 证书目录固定到 userData，保证根证书在重启后不变
  configureCertDir()

  // 最小化窗口
  ipcMain.on('minimize-window', () => {
    const win = getMainWindow()
    if (win) win.minimize()
  })

  // 获取桌面设置
  ipcMain.handle('get-desktop-settings', () => {
    return store.get('desktop', defaultSettings)
  })

  // 更新单项桌面设置
  ipcMain.handle('set-desktop-setting', (_event, key: keyof DesktopSettings, value: boolean) => {
    const settings = store.get('desktop', defaultSettings)
    settings[key] = value
    store.set('desktop', settings)

    // 同步开机自启设置
    if (key === 'autoLaunch') {
      app.setLoginItemSettings({ openAtLogin: value })
    }

    return settings
  })

  // 系统通知
  ipcMain.on('show-notification', (_event, title: string, body: string) => {
    const settings = store.get('desktop', defaultSettings)
    if (settings.notifyOnComplete && Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
  })

  // 应用版本号
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // ====== 代理服务器 ======

  // 启动代理
  ipcMain.handle(
    'proxy:start',
    async (_event, port: number, rules: unknown[]) => {
      try {
        await startProxyServer(port, rules as any[])
      } catch (err: any) {
        return { success: false, error: err.message }
      }

      // 系统代理设置失败时必须回退，否则会留下一个没有生效的代理服务器
      try {
        enableSystemProxy(port)
      } catch (err: any) {
        await stopProxyServer().catch(() => undefined)
        return {
          success: false,
          error: `系统代理设置失败: ${err.message}`
        }
      }

      // 已信任根证书时开启 HTTPS 解密，https 请求才能改写 URL 并转发到 http 目标
      setMitmEnabled(isCAInstalled())

      return { success: true }
    }
  )

  // 停止代理
  ipcMain.handle('proxy:stop', async () => {
    // 先恢复系统代理（必须成功，否则用户无法上网）
    try {
      disableSystemProxy()
    } catch (err: any) {
      console.error('[proxy:stop] 恢复系统代理失败:', err.message)
    }

    // 停止代理服务器（连接已主动销毁，正常 <100ms 完成）
    try {
      await Promise.race([
        stopProxyServer(),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('服务器关闭超时')), 1000)
        )
      ])
    } catch (err: any) {
      console.error('[proxy:stop] 关闭服务器失败:', err.message)
    }

    return { success: true }
  })

  // 获取代理状态
  ipcMain.handle('proxy:status', () => {
    return getProxyStatus()
  })

  // 更新规则（无需重启）
  ipcMain.handle('proxy:update-rules', (_event, rules: unknown[]) => {
    updateRules(rules as any[])
    return { success: true }
  })

  // 检查端口可用性
  ipcMain.handle('proxy:check-port', async (_event, port: number) => {
    const available = await checkPortAvailable(port)
    return { available }
  })

  // 读取当前系统代理配置（诊断用）
  ipcMain.handle('proxy:system-state', () => {
    return getSystemProxyState()
  })

  // ====== HTTPS 解密证书 ======

  // 根证书状态
  ipcMain.handle('proxy:cert-status', () => {
    return { installed: isCAInstalled() }
  })

  // 安装根证书到受信任的根证书颁发机构
  ipcMain.handle('proxy:cert-install', () => {
    const result = installCA()
    if (result.success) {
      setMitmEnabled(true)
    }
    return result
  })

  // 卸载根证书
  ipcMain.handle('proxy:cert-uninstall', () => {
    const result = uninstallCA()
    if (result.success) {
      setMitmEnabled(false)
    }
    return result
  })

  // 导出根证书
  ipcMain.handle('proxy:cert-export', () => {
    return exportCA()
  })
}

/** 停止代理并恢复系统设置（供 main.ts before-quit 调用） */
export async function cleanupProxy(): Promise<void> {
  try {
    await stopProxyServer()
    disableSystemProxy()
  } catch {
    // 忽略清理错误
  }
}
