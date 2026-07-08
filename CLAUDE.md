# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

API Tool — 一个类似 Postman 的 API 接口管理与调试工具。纯前端 SPA，所有操作在浏览器内完成（无后端代理），支持 PWA 离线使用。

## 常用命令

```bash
npm run dev          # 启动开发服务器 (Vite HMR, http://localhost:5173)
npm run build        # 生产构建（先 vue-tsc 类型检查，再 vite build）
npm run preview      # 预览生产构建
npm test             # 运行全部测试 (vitest run)
npm run test:watch   # 监听模式测试 (vitest)
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript，Composition API (`<script setup>`) |
| 构建 | Vite 5 |
| UI | Naive UI (`n-*` 组件) + @vicons/ionicons5 图标 |
| 状态管理 | Pinia (stores: `collection`, `environment`, `history`) |
| 路由 | Vue Router 4 (两个路由: `/` → HomeView, `/settings` → SettingsView) |
| 持久化 | Dexie.js 封装的 IndexedDB（数据库名 `apitool`） |
| 代码编辑器 | CodeMirror 6（裸 API，非 wrapper 库） |
| PWA | vite-plugin-pwa（autoUpdate 注册模式） |
| 测试 | Vitest + Vue Test Utils + happy-dom |

## 路径别名

`@/` 映射到 `src/`，在 `tsconfig.json` 和 `vite.config.ts` 中均配置。

## 架构

### 数据流

```
用户操作 → Pinia Store ←→ IndexedDB (Dexie.js)
                │
                ▼
          Vue 组件层 → useRequest (fetch API) → 外部服务
                │
                ▼
           响应数据 → Pinia Store → 组件更新 → IndexedDB (历史记录)
```

**关键规则：**
- Pinia 是唯一数据源 — 组件不直接操作 IndexedDB，Store 方法负责写入 DB 后再 reload 内存状态
- 所有 IndexedDB 写入前必须 `JSON.parse(JSON.stringify(data))` 深克隆，剥离 Vue 响应式代理，否则 Dexie 会报错
- 请求通过浏览器原生 `fetch` 发出，无中间代理
- 环境变量 `{{variable}}` 替换在发送前由 `useEnvironment.replace()` 完成

### 数据库层 (`src/db/`)

- [models.ts](src/db/models.ts) — 所有 TS 类型/接口定义（`Collection`, `ApiRequest`, `Environment`, `HistoryEntry`, `AppSettings` 等）
- [index.ts](src/db/index.ts) — Dexie 数据库类 `ApiToolDB`，定义 5 张表（collections, requests, environments, history, settings）及 `seedDefaults()` 种子方法

### Store 层 (`src/stores/`)

三个 Pinia store，均使用 `defineStore` + setup 函数风格：
- **collection.ts** — 集合树 + 请求 CRUD，递归树构建（`collectionTree` computed），含拖拽移动和循环引用防护
- **environment.ts** — 环境变量 CRUD，activeEnv 状态持久化到 settings 表
- **history.ts** — 最近 500 条请求历史，自动 trim

### Composables (`src/composables/`)

- **useRequest.ts** — `send()` 函数构建 fetch 请求并返回 `ResponseData`，处理 body 类型（JSON / form-data / urlencoded / raw），返回 loading/error/response 三个 ref
- **useEnvironment.ts** — `replace(str)` 将 `{{var}}` 替换为当前环境变量值；`extractVariables(str)` 提取变量名；`validateVariables(str)` 检查未定义变量
- **useImportExport.ts** — 自定义 JSON 导入/导出、Postman Collection v2.1 导入、cURL 命令导出

### 组件结构 (`src/components/`)

- **layout/** — `AppTopbar`（顶部栏：环境选择 + 主题切换 + 新建按钮）、`AppSidebar`（左侧栏：集合树 + 历史列表）
- **request/** — `RequestBuilder` → `UrlBar`（URL + 方法选择 + 发送按钮）+ `RequestTabs` → `HeadersEditor`/`ParamsEditor`/`BodyEditor`/`AuthEditor`
- **response/** — `ResponseViewer` → `ResponseMeta`（状态码/耗时/体积）+ `ResponseBody`（CodeMirror 高亮）+ `ResponseHeaders`
- **collection/** — `CollectionTree` → `CollectionItem`（递归渲染嵌套文件夹）+ `RequestItem`
- **environment/** — `EnvSelector`（环境下拉）+ `EnvManager`（环境变量编辑弹窗）
- **shared/** — `MethodBadge`（HTTP 方法彩色标签）、`KeyValueEditor`（启用的键值对列表）、`CodeEditor`（CodeMirror 6 封装）
- **history/** — `HistoryList`

### 主题系统

- 亮色/暗色双主题，通过 `<body>` 上的 `theme-dark` / `theme-light` class 切换 CSS 自定义属性（定义在 [global.css](src/styles/global.css)）
- Naive UI 通过 `<n-config-provider :theme="theme">` 同步，`isDark` ref 通过 `provide/inject` 传递
- CodeMirror 编辑器监听 `isDark` 变化，调用 `recreateEditor()` 重建

### Views

- **HomeView** — 三栏布局：侧边栏 | 请求构建区 + 响应区（上下分栏）
- **SettingsView** — 设置页

### 路由

两个路由，均使用懒加载：`/` → `HomeView`，`/settings` → `SettingsView`，使用 `createWebHistory`。

## 测试说明

- 测试环境使用 `happy-dom`（非 jsdom），`happy-dom` 不支持 IndexedDB — 需要 DB 的测试必须 mock `@/db` 模块
- 测试设置文件: `tests/setup.ts`
- Vitest 配置在 `vite.config.ts` 的 `test` 字段中
