import { ipcMain, BrowserWindow, Notification, app } from 'electron'
import type Store from 'electron-store'
import {
  startProxyServer,
  stopProxyServer,
  updateRules,
  getProxyStatus
} from './proxy-server'
import { enableSystemProxy, disableSystemProxy, checkPortAvailable } from './system-proxy'

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
        enableSystemProxy(port)
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
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
