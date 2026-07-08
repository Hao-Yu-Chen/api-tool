# API Tool

> 一个类似 Postman / Apifox 的 API 接口管理与调试工具，纯前端实现，支持 PWA 离线使用。

<p align="center">
  <img src="public/favicon.svg" alt="API Tool" width="80" />
</p>

## ✨ 功能特性

- 🔧 **HTTP 请求构建** — 支持 GET / POST / PUT / DELETE / PATCH / HEAD / OPTIONS 方法
- 📋 **集合管理** — 嵌套文件夹组织、拖拽排序、右键菜单操作
- 🌍 **环境变量** — 多环境切换（dev / staging / production），`{{variable}}` 语法自动替换
- 📝 **请求体编辑器** — JSON / form-data / x-www-form-urlencoded / raw text
- 🔐 **认证支持** — Bearer Token / Basic Auth / API Key
- 📊 **响应查看** — JSON 语法高亮、状态码颜色分级、耗时统计、响应头展示
- 🕐 **历史记录** — 自动保存最近 500 条请求，双击恢复
- 📤 **导入导出** — 支持自定义 JSON、Postman Collection v2.1 导入、cURL 导出
- 🌙 **暗色/亮色主题** — 一键切换，默认暗色
- 📱 **PWA 支持** — 可安装到桌面/主屏幕，离线使用

## 🖥️ 界面预览

```
┌─────────────┬──────────────────────────────────────┐
│  Sidebar    │  [GET ▼] https://api.example.com  [▶ 发送] │
│             ├──────────────────────────────────────┤
│ 📁 用户 API  │  Headers │ Body │ Auth │ Params      │
│  ├─ 获取列表 │  ──────────────────────────────────  │
│  └─ 创建用户 │  key          │ value                │
│ 📁 订单 API  │  Content-Type │ application/json     │
│ 🕐 历史     │                                      │
│             ├──────────────────────────────────────┤
│             │  ● 200 OK    ⏱ 45ms    📦 1.2KB     │
│             │  ┌──────────────────────────────────┐ │
│             │  │ {                               │ │
│             │  │   "id": 1,                      │ │
│             │  │   "name": "Alice"               │ │
│             │  │ }                               │ │
│             │  └──────────────────────────────────┘ │
└─────────────┴──────────────────────────────────────┘
```

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | >= 18.x |
| npm | >= 9.x |

### 安装与运行

```bash
# 克隆仓库
git clone <your-repo-url>
cd api-tool

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。

### 构建生产版本

```bash
npm run build     # 输出到 dist/
npm run preview   # 预览构建结果
```

构建产物包含 PWA Service Worker，可直接部署到任何静态文件服务器。

### 运行测试

```bash
npm test          # 运行全部测试
npm run test:watch # 监听模式
```

## 🧱 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3 + TypeScript | Composition API + `<script setup>` |
| 构建 | Vite 5 | 极速 HMR 开发体验 |
| UI 组件库 | Naive UI | 现代设计、原生暗色模式 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 路由 | Vue Router 4 | SPA 路由 |
| 数据存储 | Dexie.js (IndexedDB) | 浏览器端结构化存储 |
| 代码编辑器 | CodeMirror 6 | JSON/XML 语法高亮 |
| 图标 | @vicons/ionicons5 | Ionicons 5 图标集 |
| PWA | vite-plugin-pwa | Service Worker + manifest 自动生成 |
| 测试 | Vitest + Vue Test Utils | Vite 原生单元测试 |

## 📁 项目结构

```
api-tool/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.ts                    # 应用入口
│   ├── App.vue                    # 根组件（主题 + DB 初始化）
│   ├── router/index.ts            # 路由配置
│   ├── db/
│   │   ├── models.ts              # TypeScript 类型定义
│   │   └── index.ts               # Dexie 数据库初始化 + 种子数据
│   ├── stores/
│   │   ├── collection.ts          # 集合 + 请求 Pinia Store
│   │   ├── environment.ts         # 环境变量 Pinia Store
│   │   └── history.ts             # 请求历史 Pinia Store
│   ├── composables/
│   │   ├── useRequest.ts          # fetch API 请求封装
│   │   ├── useEnvironment.ts      # {{variable}} 替换逻辑
│   │   └── useImportExport.ts     # 导入导出（JSON / Postman / cURL）
│   ├── components/
│   │   ├── shared/                # 通用组件
│   │   │   ├── MethodBadge.vue    # HTTP 方法颜色徽标
│   │   │   ├── KeyValueEditor.vue # 键值对编辑器
│   │   │   └── CodeEditor.vue     # CodeMirror 封装
│   │   ├── layout/                # 布局组件
│   │   │   ├── AppTopbar.vue      # 顶部栏（环境选择 + 主题切换）
│   │   │   └── AppSidebar.vue     # 左侧栏（集合 + 历史）
│   │   ├── request/               # 请求构建组件
│   │   │   ├── RequestBuilder.vue # 请求构建容器
│   │   │   ├── UrlBar.vue         # URL 栏 + 方法选择 + 发送按钮
│   │   │   ├── RequestTabs.vue    # 标签切换
│   │   │   ├── HeadersEditor.vue  # 请求头编辑器
│   │   │   ├── ParamsEditor.vue   # Query 参数编辑器
│   │   │   ├── BodyEditor.vue     # 请求体编辑器
│   │   │   └── AuthEditor.vue     # 认证配置
│   │   ├── response/              # 响应查看组件
│   │   │   ├── ResponseViewer.vue # 响应查看容器
│   │   │   ├── ResponseMeta.vue   # 状态码 + 耗时 + 体积
│   │   │   ├── ResponseBody.vue   # 响应体（高亮显示）
│   │   │   └── ResponseHeaders.vue# 响应头展示
│   │   ├── collection/            # 集合组件
│   │   │   ├── CollectionTree.vue # 集合树容器
│   │   │   ├── CollectionItem.vue # 集合项（递归渲染）
│   │   │   └── RequestItem.vue    # 请求项
│   │   ├── environment/           # 环境变量组件
│   │   │   ├── EnvSelector.vue    # 环境下拉选择器
│   │   │   └── EnvManager.vue     # 环境管理弹窗
│   │   └── history/
│   │       └── HistoryList.vue    # 历史记录列表
│   ├── views/
│   │   ├── HomeView.vue           # 主页（三栏布局）
│   │   └── SettingsView.vue       # 设置页
│   └── styles/
│       └── global.css             # 全局样式 + 滚动条
├── tests/
│   └── setup.ts                   # 测试环境配置
├── index.html
├── vite.config.ts                 # Vite + PWA 配置
├── tsconfig.json
└── package.json
```

## 🏗️ 架构设计

### 数据流

```
用户操作 → Pinia Store ←→ IndexedDB (Dexie.js)
              │
              ▼
        Vue 组件层 → useRequest (fetch API) → 外部服务
              │
              ▼
         响应数据 → Pinia Store → 组件更新 → IndexedDB (历史)
```

- **Pinia 是唯一数据源** — 组件不直接操作 IndexedDB
- **请求纯浏览器发出** — 无中间代理，使用浏览器 `fetch` API
- **环境变量替换在发送前完成** — `useEnvironment` 先于 `useRequest` 执行

### 数据模型

```
Collection     id, name, description, parentId, order, createdAt
ApiRequest     id, collectionId, name, method, url, headers[],
               params[], body, auth, order, createdAt, updatedAt
Environment    id, name, variables[{id, key, value, enabled}], createdAt
HistoryEntry   id, request{method, url, headers, body},
               response{status, headers, body, duration, size}, timestamp
AppSettings    id, theme, activeEnvId, sidebarWidth
```

## 🎨 设计细节

### HTTP 方法颜色

| 方法 | 颜色 | 色值 |
|------|------|------|
| GET | 🟢 绿 | `#52c41a` |
| POST | 🔵 蓝 | `#1890ff` |
| PUT | 🟠 橙 | `#fa8c16` |
| DELETE | 🔴 红 | `#ff4d4f` |
| PATCH | 🟣 紫 | `#722ed1` |
| HEAD / OPTIONS | ⚪ 灰 | `#8c8c8c` |

### 状态码颜色

- `2xx` 绿色 — 成功
- `3xx` 蓝色 — 重定向
- `4xx` 橙色 — 客户端错误
- `5xx` 红色 — 服务端错误

### 响应时间

- `< 200ms` 绿色 — 快速
- `200ms ~ 1s` 橙色 — 一般
- `> 1s` 红色 — 较慢

## 🔜 后续计划

- [ ] 多标签页支持
- [ ] GraphQL / WebSocket 请求
- [ ] Pre-request / Post-response 脚本
- [ ] Mock 服务器
- [ ] 团队协作与云端同步
- [ ] Electron 桌面客户端
- [ ] Capacitor Android 客户端

## 📄 License

MIT
