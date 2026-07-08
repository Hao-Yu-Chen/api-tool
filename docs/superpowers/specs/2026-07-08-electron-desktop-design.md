# Electron Desktop App 设计规格

## 概述

将 API Tool（Vue 3 SPA）打包为 Windows 桌面应用，使用 Electron 作为运行时框架，electron-builder 作为打包工具。目标是在不修改现有前端代码的前提下，提供完整的桌面应用体验。

## 方案选择

**Electron + electron-vite + electron-builder**

选择理由：
- 系统托盘、文件关联、开机自启、原生通知均为 Electron 开箱即用功能
- electron-vite 与现有 Vite 配置无缝衔接，改造成本最低
- electron-builder 打包 NSIS/Portable 安装包配置简单
- 用户对安装包体积不敏感（接受 150-200MB）
- 社区最成熟，遇到问题易解决

## 架构设计

```
┌──────────────────────────────────────────────────┐
│                  Electron App                     │
│                                                   │
│  ┌─────────────┐     IPC      ┌────────────────┐ │
│  │ Main Process │◄──────────►│ Renderer Process│ │
│  │ (Node.js)    │            │ (Vue 3 SPA)     │ │
│  │              │            │                  │ │
│  │ • 窗口管理    │            │ • 现有全部功能    │ │
│  │ • 系统托盘    │            │ • 通过 preload   │ │
│  │ • 文件关联    │            │   调用原生 API   │ │
│  │ • 开机自启    │            │                  │ │
│  │ • 原生通知    │            │                  │ │
│  │ • 菜单栏     │            │                  │ │
│  └─────────────┘            └────────────────┘ │
│                                                   │
│  构建工具: electron-vite + electron-builder        │
└──────────────────────────────────────────────────┘
```

核心原则：**零侵入** — 现有 `src/` 代码不做任何改动。Electron 只替换"浏览器外壳"，原生功能通过 preload 脚本安全暴露给渲染进程。

## 项目结构

新增文件全部在 `electron/` 目录下：

```
api-tool/
├── electron/                    # 新增
│   ├── main.ts                 # 主进程入口：窗口创建、应用生命周期
│   ├── preload.ts              # preload 脚本：安全暴露 Node API
│   ├── tray.ts                 # 系统托盘逻辑
│   └── ipc-handlers.ts         # IPC 处理（文件关联、自启、通知等）
├── src/                        # 现有代码，零改动
├── electron-builder.yml        # 新增：打包配置
├── build/
│   └── icon.ico                # 新增：应用图标
├── electron.vite.config.ts     # 新增：electron-vite 构建配置
└── package.json                # 修改：增加依赖和脚本
```

## 功能设计

### 1. 窗口管理

- 默认尺寸：1280×800，最小尺寸：900×600
- 窗口位置和大小使用 `electron-store` 持久化记忆
- 关闭按钮行为：最小化到系统托盘（不退出应用）
- 应用菜单栏：
  - 文件：导入 Collection / 导出 Collection / 退出
  - 编辑：撤销 / 重做
  - 视图：重新加载 / 开发者工具
  - 帮助：关于 API Tool

### 2. 系统托盘

- 托盘提示文字：`API Tool - 接口调试工具`
- 右键菜单：显示主窗口 / 退出
- 双击托盘图标：显示主窗口

### 3. 文件关联

- 注册 `.json` 文件关联（在设置页手动开启，不强制）
- 双击关联的 `.json` 文件时，提示用户确认后导入为 Collection
- 右键菜单集成"用 API Tool 打开"

### 4. 开机自启

- 通过 `electron.app.setLoginItemSettings()` 实现
- 设置页新增开关，默认关闭

### 5. 原生通知

- 请求完成（成功/失败）时弹出 Windows 原生通知（`Notification` API）
- 通知内容包含状态码和响应耗时
- 设置页可关闭

### 6. 设置页扩展

在现有 `SettingsView` 中新增"桌面设置"区域：

- ☐ 开机自启
- ☐ 关闭窗口时最小化到托盘
- ☐ 请求完成时弹出通知
- ☐ 注册 .json 文件关联

桌面专属设置通过 preload 暴露的 IPC 与主进程通信，在 Web 版中这些选项自然隐藏或禁用。

## 打包配置

### electron-builder.yml 要点

```yaml
appId: com.apitool.app
productName: API Tool
directories:
  output: release

win:
  target:
    - target: nsis
    - target: portable
  icon: build/icon.ico
  fileAssociations:
    - ext: json
      name: Postman Collection
      description: 用 API Tool 导入

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### 构建产物

| 产物 | 说明 | 预计大小 |
|------|------|---------|
| `API Tool Setup 1.0.0.exe` | NSIS 安装向导 | ~150MB |
| `API Tool 1.0.0.exe` | 绿色便携版 | ~150MB |

### 新增 npm 脚本

```bash
npm run electron:dev     # 启动 Electron 开发模式 (HMR)
npm run electron:build   # 打包 Windows 安装包
```

现有 `npm run dev` / `npm run build` 保持不动，Web 版开发不受影响。

## 技术要点

### IndexedDB 兼容

Electron 内置 Chromium，IndexedDB 开箱即用。Dexie.js 无需任何适配。Web 版与桌面版数据分别存储于各自的 browser profile，互不干扰。

### 安全性

- `contextIsolation: true`（默认开启）
- `nodeIntegration: false`（渲染进程无法直接访问 Node.js）
- preload 脚本通过 `contextBridge.exposeInMainWorld()` 白名单暴露 API

### PWA 保留

`vite-plugin-pwa` 配置保持不变。Web 构建仍生成 Service Worker；Electron 中 PWA 功能自然不生效，互不干扰。

### 依赖清单

| 依赖 | 类别 | 用途 |
|------|------|------|
| `electron` | runtime | Electron 框架 |
| `electron-vite` | devDependency | 构建工具 |
| `@electron-toolkit/preload` | dependency | preload 工具函数 |
| `electron-builder` | devDependency | 打包工具 |
| `electron-store` | dependency | 持久化配置（窗口位置等） |

## 测试策略

- 现有 Vitest 单元测试保持不变，仅覆盖 Vue 组件和 Store
- Electron 主进程逻辑由 `electron-vite` 的 TypeScript 编译保证类型安全
- 打包后在 Windows 上手动验证：窗口行为、托盘、通知、文件关联、开机自启
- 桌面功能为运行时特性，不适用于 happy-dom 单元测试环境

## 实施步骤（高层面）

1. 安装 Electron 相关依赖
2. 创建 `electron/` 目录及主进程代码
3. 配置 `electron.vite.config.ts`
4. 配置 `electron-builder.yml`
5. 制作应用图标
6. 修改 `package.json`（脚本 + main 入口）
7. 开发环境验证 HMR
8. 生产构建并安装测试
