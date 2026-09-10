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
      /** 代理功能 */
      proxy: ProxyAPI
    }
  }
}

/** 当前系统代理配置（诊断用） */
export interface SystemProxyState {
  proxyEnable: string | null
  proxyServer: string | null
  proxyOverride: string | null
  autoDetect: string | null
  autoConfigURL: string | null
  platform: string
  supported: boolean
}

/** 代理 API */
export interface ProxyAPI {
  /** 启动代理服务器 */
  start(port: number, rules: unknown[]): Promise<{ success: boolean; error?: string }>
  /** 停止代理服务器 */
  stop(): Promise<{ success: boolean; error?: string }>
  /** 获取代理运行状态 */
  status(): Promise<{ running: boolean; port: number; ruleCount: number }>
  /** 运行时更新规则 */
  updateRules(rules: unknown[]): Promise<{ success: boolean }>
  /** 检查端口是否可用 */
  checkPort(port: number): Promise<{ available: boolean }>
  /** 读取当前系统代理配置 */
  systemState(): Promise<SystemProxyState>
  /** 根证书是否已安装到受信任的根证书颁发机构 */
  certStatus(): Promise<{ installed: boolean }>
  /** 安装根证书（Windows 可能弹出确认对话框） */
  installCert(): Promise<{ success: boolean; error?: string; certPath?: string }>
  /** 卸载根证书 */
  uninstallCert(): Promise<{ success: boolean; error?: string }>
  /** 导出根证书到指定位置 */
  exportCert(): Promise<{ success: boolean; error?: string; path?: string }>
}
