import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import type { BrowserWindow } from 'electron'
import { resolveTrayIconPath } from './tray-icon-path'

let tray: Tray | null = null

/** 16x16 纯色占位图标（#3B82F6）——图标文件缺失时保证托盘图标可见 */
const PLACEHOLDER_ICON_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGOwbvr2nxLMMGrAqAGjBgwXAwCGGLIfFYFKqwAAAABJRU5ErkJggg=='

export function createTray(mainWindow: BrowserWindow, onQuit: () => void): Tray {
  // 打包后图标位于 resources/icon.png（electron-builder extraResources 复制），
  // 开发模式回退到项目 build/icon.png
  const iconPath = resolveTrayIconPath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    devDir: join(__dirname, '../..')
  })

  let icon: Electron.NativeImage
  if (iconPath) {
    const loaded = nativeImage.createFromPath(iconPath)
    icon = loaded.isEmpty() ? nativeImage.createFromDataURL(PLACEHOLDER_ICON_DATA_URL) : loaded
  } else {
    // 空图标在 Windows 托盘不可见——必须用可见占位图标兜底
    icon = nativeImage.createFromDataURL(PLACEHOLDER_ICON_DATA_URL)
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('API Tool - 接口调试工具')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        onQuit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  return tray
}
