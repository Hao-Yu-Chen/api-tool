# Electron Desktop App 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 API Tool 打包为 Windows 桌面应用，包含系统托盘、文件关联、开机自启、原生通知等桌面功能。

**Architecture:** 使用 electron-vite 构建 Electron 应用，主进程代码放在 `electron/` 目录，现有 Vue 3 SPA 作为渲染进程。通过 preload 脚本 + IPC 安全暴露原生 API，现有 `src/` 代码零侵入。

**Tech Stack:** Electron 31+, electron-vite 2+, electron-builder 24+, electron-store 9+

## Global Constraints

- **零侵入原则：** 不修改 `src/` 目录下任何现有 `.ts`/`.vue` 文件（仅 SettingsView.vue 新增桌面设置区域，且必须用 `v-if` 判断 Electron 环境）
- 现有 `npm run dev` / `npm run build` / `npm test` 脚本行为不变
- `contextIsolation: true`，`nodeIntegration: false`
- 支持 Windows 平台（NSIS + portable）
- PWA 插件保留，Web 版不受影响

---

### Task 1: 安装 Electron 依赖

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces: 安装后的依赖可供后续所有任务使用

- [ ] **Step 1: 安装 runtime 依赖**

```bash
npm install electron electron-store @electron-toolkit/preload
```

- [ ] **Step 2: 安装 dev 依赖**

```bash
npm install -D electron-vite electron-builder
```

- [ ] **Step 3: 验证安装**

```bash
npx electron --version
```

预期：输出 Electron 版本号（如 `v31.x.x`），无错误。

- [ ] **Step 4: 提交**

```bash
git add package.json package-lock.json
git commit -m "chore: add Electron dependencies"
```

---

### Task 2: 创建 Electron 构建配置

**Files:**
- Create: `electron.vite.config.ts`

**Interfaces:**
- Produces: electron-vite 知道如何构建 main / preload / renderer 三个入口

- [ ] **Step 1: 创建 `electron.vite.config.ts`**

```typescript
import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@': resolve('src')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    build: {
      rollupOptions: {
        input: resolve('index.html')
      }
    }
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add electron.vite.config.ts
git commit -m "chore: add electron-vite build config"
```

---

### Task 3: 创建打包配置

**Files:**
- Create: `electron-builder.yml`

**Interfaces:**
- Produces: electron-builder 知道如何打包 NSIS 和 portable 安装包

- [ ] **Step 1: 创建 `electron-builder.yml`**

```yaml
appId: com.apitool.app
productName: API Tool
directories:
  buildResources: build
  output: release

files:
  - out/**/*
  - "!node_modules"

win:
  target:
    - target: nsis
      arch: [x64]
    - target: portable
      arch: [x64]
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: API Tool
```

- [ ] **Step 2: 提交**

```bash
git add electron-builder.yml
git commit -m "chore: add electron-builder config"
```

---

### Task 4: 创建 TypeScript 类型声明

**Files:**
- Create: `src/types/electron.d.ts`

**Interfaces:**
- Produces: `DesktopSettings` 接口、`Window.electronAPI` 全局类型声明
- Consumed by: Task 5 (preload), Task 10 (SettingsView)

- [ ] **Step 1: 创建 `src/types/electron.d.ts`**

```typescript
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
      /** 更新单项桌面设置 */
      setDesktopSetting: (key: keyof DesktopSettings, value: boolean) => Promise<void>
      /** 注册文件打开回调 —— 文件关联触发时调用 */
      onFileOpen: (callback: (filePath: string) => void) => void
      /** 弹出系统原生通知 */
      showNotification: (title: string, body: string) => void
      /** 获取应用版本号 */
      getAppVersion: () => Promise<string>
    }
  }
}
```

- [ ] **Step 2: 确认 tsconfig 覆盖此文件**

检查 `tsconfig.json` 的 `include` 字段已包含 `src/**/*.ts`，新文件会自动被覆盖，无需修改。

- [ ] **Step 3: 提交**

```bash
git add src/types/electron.d.ts
git commit -m "feat: add Electron API type declarations"
```

---

### Task 5: 创建 preload 脚本

**Files:**
- Create: `electron/preload.ts`

**Interfaces:**
- Consumes: `src/types/electron.d.ts` 中的 `DesktopSettings` 类型
- Produces: 渲染进程可通过 `window.electronAPI.*` 调用以下方法：
  - `isElectron` (boolean)
  - `minimizeWindow()` → void
  - `getDesktopSettings()` → Promise\<DesktopSettings\>
  - `setDesktopSetting(key, value)` → Promise\<void\>
  - `showNotification(title, body)` → void
  - `getAppVersion()` → Promise\<string\>
  - `onFileOpen(callback)` → void

- [ ] **Step 1: 创建 `electron/preload.ts`**

```typescript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  minimizeWindow: () => {
    ipcRenderer.send('minimize-window')
  },

  getDesktopSettings: () => {
    return ipcRenderer.invoke('get-desktop-settings')
  },

  setDesktopSetting: (key: string, value: boolean) => {
    return ipcRenderer.invoke('set-desktop-setting', key, value)
  },

  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', title, body)
  },

  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version')
  },

  onFileOpen: (callback: (filePath: string) => void) => {
    ipcRenderer.on('open-file', (_event, filePath: string) => {
      callback(filePath)
    })
  }
})
```

- [ ] **Step 2: 提交**

```bash
git add electron/preload.ts
git commit -m "feat: add Electron preload script"
```

---

### Task 6: 创建 IPC 处理器

**Files:**
- Create: `electron/ipc-handlers.ts`

**Interfaces:**
- Consumes: `electron-store` 实例、Electron `app` 对象
- Produces:
  - `registerIpcHandlers(store, getMainWindow)` — 注册所有 IPC 处理器
- IPC channels handled:
  - `minimize-window` (send) — 最小化当前窗口
  - `get-desktop-settings` (invoke) — 返回 DesktopSettings
  - `set-desktop-setting` (invoke) — 更新单项设置
  - `show-notification` (send) — 弹出系统通知
  - `get-app-version` (invoke) — 返回版本号

- [ ] **Step 1: 创建 `electron/ipc-handlers.ts`**

```typescript
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
```

- [ ] **Step 2: 提交**

```bash
git add electron/ipc-handlers.ts
git commit -m "feat: add Electron IPC handlers"
```

---

### Task 7: 创建系统托盘

**Files:**
- Create: `electron/tray.ts`

**Interfaces:**
- Consumes: Electron `BrowserWindow`、应用图标路径
- Produces:
  - `createTray(mainWindow, iconPath)` → Tray 实例
- 行为：右键菜单（显示主窗口 / 退出），双击显示窗口

- [ ] **Step 1: 创建 `electron/tray.ts`**

```typescript
import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'path'
import type { BrowserWindow } from 'electron'

let tray: Tray | null = null

export function createTray(mainWindow: BrowserWindow): Tray {
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
        app.exit()
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
```

- [ ] **Step 2: 提交**

```bash
git add electron/tray.ts
git commit -m "feat: add Electron system tray"
```

---

### Task 8: 创建主进程入口

**Files:**
- Create: `electron/main.ts`

**Interfaces:**
- Consumes: `electron/tray.ts` 的 `createTray()`、`electron/ipc-handlers.ts` 的 `registerIpcHandlers()`
- Produces: Electron 应用生命周期完整实现（窗口创建、托盘、菜单、关闭行为）

- [ ] **Step 1: 创建 `electron/main.ts`**

```typescript
import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import Store from 'electron-store'
import { createTray } from './tray'
import { registerIpcHandlers } from './ipc-handlers'

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
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
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

  // 关闭行为：最小化到托盘
  mainWindow.on('close', (event) => {
    const settings = store.get('desktop')
    if (settings.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
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
            app.exit()
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
            const { dialog } = require('electron')
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
  createTray(mainWindow!)

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
  // 确保能正常退出
})
```

- [ ] **Step 2: 提交**

```bash
git add electron/main.ts
git commit -m "feat: add Electron main process"
```

---

### Task 9: 更新 package.json

**Files:**
- Modify: `package.json`

**Interfaces:**
- 新增 `main` 字段指向 Electron 构建产物
- 新增 `electron:dev` 和 `electron:build` 脚本
- 保留所有现有脚本不变

- [ ] **Step 1: 修改 `package.json`**

在 `package.json` 中新增 `"main"` 字段（放在 `"type"` 之后），并新增两个脚本：

```json
{
  "name": "api-tool",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "electron:dev": "electron-vite dev",
    "electron:build": "electron-vite build && electron-builder"
  },
  ...
}
```

编辑操作：
- 在 `"type": "module"` 后添加 `"main": "./out/main/index.js",`
- 在 `"test:watch": "vitest"` 后添加 `"electron:dev": "electron-vite dev",` 和 `"electron:build": "electron-vite build && electron-builder",`

- [ ] **Step 2: 验证脚本语法**

```bash
node -e "const p = require('./package.json'); console.log(p.scripts['electron:dev'])"
```

预期：输出 `electron-vite dev`

- [ ] **Step 3: 提交**

```bash
git add package.json
git commit -m "feat: add Electron dev/build scripts"
```

---

### Task 10: 创建设置页桌面配置区域

**Files:**
- Modify: `src/views/SettingsView.vue`

**Interfaces:**
- Consumes: `window.electronAPI`（如果未定义则为 undefined，自动隐藏桌面设置）
- 新增"桌面设置"section，使用 `v-if="window.electronAPI"` 条件渲染

- [ ] **Step 1: 在 `src/views/SettingsView.vue` 中添加桌面设置逻辑**

在 `<script setup>` 块末尾添加：

```typescript
// 桌面设置（仅在 Electron 环境中可用）
import { ref, onMounted } from 'vue'

const isElectron = ref(false)
const desktopSettings = ref({
  autoLaunch: false,
  minimizeToTray: true,
  notifyOnComplete: false,
  registerFileAssociation: false
})

onMounted(async () => {
  if (window.electronAPI?.isElectron) {
    isElectron.value = true
    desktopSettings.value = await window.electronAPI.getDesktopSettings()
  }
})

async function toggleDesktopSetting(key: string, value: boolean) {
  if (window.electronAPI) {
    desktopSettings.value = await window.electronAPI.setDesktopSetting(key, value)
  }
}
```

- [ ] **Step 2: 在模板中"当前主题信息"section 之后添加桌面设置 UI**

在 `<!-- 当前主题信息 -->` section 的 `</section>` 和 `</div>` (settings-content) 之间，`<n-divider />` 之后插入：

```html
      <!-- 桌面设置（仅 Electron 环境可见） -->
      <template v-if="isElectron">
        <n-divider />
        <section class="settings-section">
          <h3>桌面设置</h3>
          <p class="section-desc">以下设置仅在桌面应用中生效</p>
          <div class="desktop-settings-list">
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">开机自启</span>
                <span class="setting-hint">系统启动时自动运行 API Tool</span>
              </div>
              <n-switch
                :value="desktopSettings.autoLaunch"
                @update:value="toggleDesktopSetting('autoLaunch', $event)"
              />
            </div>
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">最小化到托盘</span>
                <span class="setting-hint">关闭窗口时隐藏到系统托盘而不是退出</span>
              </div>
              <n-switch
                :value="desktopSettings.minimizeToTray"
                @update:value="toggleDesktopSetting('minimizeToTray', $event)"
              />
            </div>
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">请求完成通知</span>
                <span class="setting-hint">请求完成时弹出系统原生通知</span>
              </div>
              <n-switch
                :value="desktopSettings.notifyOnComplete"
                @update:value="toggleDesktopSetting('notifyOnComplete', $event)"
              />
            </div>
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">JSON 文件关联</span>
                <span class="setting-hint">将 .json 文件关联到 API Tool，双击即可导入</span>
              </div>
              <n-switch
                :value="desktopSettings.registerFileAssociation"
                @update:value="toggleDesktopSetting('registerFileAssociation', $event)"
              />
            </div>
          </div>
        </section>
      </template>
```

- [ ] **Step 3: 在 `<style scoped>` 末尾添加桌面设置样式**

```css
/* ====== Desktop Settings ====== */
.desktop-settings-list {
  display: flex;
  flex-direction: column;
}

.desktop-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--app-border-light);
}

.desktop-setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.setting-hint {
  display: block;
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}
```

- [ ] **Step 4: 验证渲染进程无报错**

```bash
npx vue-tsc --noEmit
```

预期：无类型错误。`window.electronAPI` 通过 `src/types/electron.d.ts` 声明为可选，Web 环境中 `undefined` 是合法的。

- [ ] **Step 5: 提交**

```bash
git add src/views/SettingsView.vue
git commit -m "feat: add desktop settings section to SettingsView"
```

---

### Task 11: 创建应用图标占位

**Files:**
- Create: `build/icon.png` (临时占位图标)
- Create: `build/icon.ico` (从 PNG 生成，或使用占位)

**说明:** 应用图标需要 `.ico` 格式用于 Windows。我们先创建一个占位图标使打包能正常运行，后续替换为正式图标。

- [ ] **Step 1: 确保 `build/` 目录存在并创建占位文件**

```bash
mkdir -p build
```

- [ ] **Step 2: 从现有 SVG 生成一个简单 PNG 图标**

由于没有图片处理工具，创建一个说明文件并生成一个最小的占位 ICO：

```bash
# 使用 Node.js 创建一个最小的 1x1 占位 PNG（可用的最小 PNG 文件）
node -e "
// 最小 32x32 蓝色 PNG (base64)
const fs = require('fs')
// 最简单的做法：复制现有 favicon 或创建占位
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAQklEQVR4Ae3BAQ0AAADCIPunfg8HDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALwPG4QAAVAzXBkAAAAASUVORK5CYII=', 'base64')
fs.writeFileSync('build/icon.png', png)
console.log('icon.png created')
"
```

- [ ] **Step 3: 在 electron-builder.yml 中临时注释掉图标要求**

先验证打包流程能跑通，图标后续替换。实际测试时 electron-builder 在 Windows 上如果没有 `.ico` 会使用默认 Electron 图标。

- [ ] **Step 4: 提交**

```bash
git add build/icon.png
git commit -m "chore: add placeholder app icon"
```

---

### Task 12: 验证开发模式

**Files:**
- 验证所有新增文件能正确协同工作

- [ ] **Step 1: 运行 Vue 类型检查**

```bash
npx vue-tsc --noEmit
```

预期：无类型错误。

- [ ] **Step 2: 运行现有单元测试**

```bash
npm test
```

预期：所有现有测试通过（Electron 功能不影响 Web 测试）。

- [ ] **Step 3: 启动 Electron 开发模式**

```bash
npm run electron:dev
```

预期：
- Electron 窗口打开，显示 API Tool 主页
- 系统托盘出现图标
- 菜单栏可见
- 设置页出现"桌面设置"区域
- 关闭窗口时最小化到托盘

- [ ] **Step 4: 如果第三步报错，检查并修复**

常见问题排查：
- `electron-vite` 找不到模块 → 确认 `electron.vite.config.ts` 中路径正确
- preload 报错 → 确认 `contextIsolation: true` 且 preload 路径正确
- 窗口白屏 → 检查 `ELECTRON_RENDERER_URL` 环境变量，确认 `index.html` 存在

---

### Task 13: 构建生产包

**Files:**
- 验证完整构建和打包流程

- [ ] **Step 1: 执行打包构建**

```bash
npm run electron:build
```

预期：
1. `electron-vite build` 完成（输出到 `out/` 目录）
2. `electron-builder` 打包完成
3. `release/` 目录生成 `API Tool Setup 1.0.0.exe` 和 `API Tool 1.0.0.exe`

- [ ] **Step 2: 安装并测试**

运行 `release/API Tool Setup 1.0.0.exe` 完成安装，验证：
- 桌面快捷方式创建成功
- 启动应用后窗口正常显示
- 系统托盘功能正常

- [ ] **Step 3: 提交最终状态**

```bash
git add .
git commit -m "feat: complete Electron desktop app packaging

- electron-vite build config
- electron-builder Windows packaging (NSIS + portable)
- System tray with context menu
- Desktop settings (auto-launch, minimize to tray, notifications, file association)
- Window position persistence
- Native notifications
- Preload script with secure contextBridge API
- Zero changes to existing Vue app code"
```

---

## 实施顺序总结

```
Task 1 (依赖) ──► Task 2 (构建配置) ──► Task 4 (类型声明)
                     │                        │
                     └──► Task 5 (preload) ◄──┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
          Task 6 (IPC)   Task 7 (tray)  Task 3 (builder)
                │             │             │
                └─────────────┼─────────────┘
                              │
                              ▼
                      Task 8 (main.ts)
                              │
                     ┌────────┼────────┐
                     │        │        │
                     ▼        ▼        ▼
               Task 9   Task 10   Task 11
              (package  (Settings  (icon)
               .json)    View)
                     │        │        │
                     └────────┼────────┘
                              │
                              ▼
                      Task 12 (验证)
                              │
                              ▼
                      Task 13 (构建)
```
