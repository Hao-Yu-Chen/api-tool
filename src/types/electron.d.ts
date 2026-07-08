export {}

/** 桌面专属设置 */
export interface DesktopSettings {
  autoLaunch: boolean
  minimizeToTray: boolean
  notifyOnComplete: boolean
  registerFileAssociation: boolean
}

declare global {
  interface Window {
    electronAPI?: {
      /** 用于判断是否运行在 Electron 环境中 */
      isElectron: boolean
      /** 最小化当前窗口 */
      minimizeWindow: () => void
      /** 获取桌面设置 */
      getDesktopSettings: () => Promise<DesktopSettings>
      /** 更新单项桌面设置，返回更新后的完整设置 */
      setDesktopSetting: (key: keyof DesktopSettings, value: boolean) => Promise<DesktopSettings>
      /** 注册文件打开回调 —— 文件关联触发时调用 */
      onFileOpen: (callback: (filePath: string) => void) => void
      /** 弹出系统原生通知 */
      showNotification: (title: string, body: string) => void
      /** 获取应用版本号 */
      getAppVersion: () => Promise<string>
    }
  }
}
