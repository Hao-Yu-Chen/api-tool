import { app, BrowserWindow, Menu, shell, dialog } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { createTray } from './tray'
import { registerIpcHandlers, cleanupProxy } from './ipc-handlers'

interface StoreSchema {
  desktop: {
    autoLaunch: boolean
    minimizeToTray: boolean
    notifyOnComplete: boolean
    registerFileAssociation: boolean
  }
  windowBounds: {
    x?: number
    y?: number
    width: number
    height: number
  }
}

const store = new Store<StoreSchema>({
  defaults: {
    desktop: {
      autoLaunch: false,
      minimizeToTray: true,
      notifyOnComplete: false,
      registerFileAssociation: false
    },
    windowBounds: {
      width: 1280,
      height: 800
    }
  }
})

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let tray: ReturnType<typeof createTray> | null = null

function quitApp(): void {
  isQuitting = true
  cleanupProxy()
  if (tray) {
    tray.destroy()
    tray = null
  }
  app.quit()
}

function createWindow(): BrowserWindow {
  const bounds = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    icon: join(__dirname, '../../build/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // 记录窗口位置和大小
  mainWindow.on('close', () => {
    if (mainWindow) {
      const { x, y, width, height } = mainWindow.getBounds()
      store.set('windowBounds', { x, y, width, height })
    }
  })

  // 关闭行为：弹出选择对话框
  mainWindow.on('close', async (event) => {
    if (isQuitting) return
    event.preventDefault()

    const settings = store.get('desktop')

    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      title: 'API Tool',
      message: '关闭应用',
      detail: '请选择关闭方式：\n\n• 后台托管 — 窗口隐藏到系统托盘，应用继续运行\n• 直接关闭 — 完全退出应用',
      buttons: ['后台托管', '直接关闭', '取消'],
      defaultId: settings.minimizeToTray ? 0 : 1,
      cancelId: 2,
      checkboxLabel: '记住我的选择，以后不再询问',
      checkboxChecked: false
    })

    // 用户点击"取消"或关闭了对话框
    if (result.response === 2) return

    // 记住选择 → 更新设置，后续关闭直接按设置执行
    if (result.checkboxChecked) {
      store.set('desktop.minimizeToTray', result.response === 0)
    }

    if (result.response === 0) {
      // 后台托管：隐藏到系统托盘
      mainWindow?.hide()
    } else {
      // 直接关闭：完全退出应用
      quitApp()
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // 加载渲染进程
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// 应用菜单
function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '导入 Collection',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-import-collection')
          }
        },
        {
          label: '导出 Collection',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('menu-export-collection')
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            quitApp()
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '重置缩放', role: 'resetZoom' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 API Tool',
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: 'info',
              title: '关于 API Tool',
              message: `API Tool v${app.getVersion()}`,
              detail: '一个类似 Postman 的 API 接口管理与调试工具。'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// 应用生命周期
app.whenReady().then(() => {
  registerIpcHandlers(store, () => mainWindow)
  createWindow()
  createMenu()
  tray = createTray(mainWindow!, quitApp)

  // 处理 Windows 文件关联 —— 启动时打开的文件
  app.on('second-instance', (_event, commandLine) => {
    const filePath = commandLine[commandLine.length - 1]
    if (filePath && filePath.endsWith('.json') && mainWindow) {
      mainWindow.show()
      mainWindow.focus()
      mainWindow.webContents.send('open-file', filePath)
    } else if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('window-all-closed', () => {
  // Windows 上不退出，保留在托盘
})

app.on('before-quit', () => {
  isQuitting = true
  cleanupProxy()
  if (tray) {
    tray.destroy()
    tray = null
  }
})
