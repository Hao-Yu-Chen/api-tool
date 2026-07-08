import { Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import type { BrowserWindow } from 'electron'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow, onQuit: () => void): Tray {
  // 使用 16x16 图标（从 ICO 或 PNG 创建）
  const iconPath = join(__dirname, '../build/icon.png')
  let icon: nativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) throw new Error('icon empty')
  } catch {
    // 如果图标文件不存在，创建一个简单的 16x16 占位图标
    icon = nativeImage.createEmpty()
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
