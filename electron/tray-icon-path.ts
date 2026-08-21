import { existsSync } from 'fs'
import { join } from 'path'

export interface TrayIconPathOptions {
  /** app.isPackaged */
  isPackaged: boolean
  /** process.resourcesPath（打包环境读取位置） */
  resourcesPath: string
  /** 开发环境项目根目录 */
  devDir: string
}

/**
 * 解析托盘图标文件路径：
 * 打包后从 resources/icon.png 读取（由 electron-builder extraResources 复制），
 * 开发模式回退到项目 build/icon.png。
 * 文件不存在时返回 null——调用方必须使用可见的占位图标，不能创建空图标。
 */
export function resolveTrayIconPath(options: TrayIconPathOptions): string | null {
  const candidate = options.isPackaged
    ? join(options.resourcesPath, 'icon.png')
    : join(options.devDir, 'build', 'icon.png')
  return existsSync(candidate) ? candidate : null
}
