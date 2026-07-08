import { ipcMain, BrowserWindow, Notification, app } from 'electron'
import type Store from 'electron-store'

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
}
