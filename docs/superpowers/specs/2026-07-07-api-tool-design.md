# API Tool — 设计文档

> 日期: 2026-07-07
> 状态: 已确认
> 目标: 构建类似 Postman/Apifox 的 API 调试工具，第一阶段实现 Web (PWA) 端

---

## 1. 项目愿景

构建一个多端（Web / Windows / Android）的 API 接口管理与调试工具。第一阶段聚焦 Web 端，通过 PWA 同时覆盖桌面和移动端的安装使用。

### 后续阶段

- **Phase 2**: Electron 打包 Windows 桌面版（零额外代码改动）
- **Phase 3**: Capacitor 打包 Android APK

---

## 2. 技术栈

| 层级 | 选择 | 理由 |
|------|------|------|
| 框架 | Vue 3 + TypeScript + Vite | 用户指定 Vue，TS 保证类型安全 |
| UI 库 | Naive UI | Vue 3 原生，设计现代，工具类应用适配好，原生暗色模式 |
| 状态管理 | Pinia | Vue 3 官方推荐 |
| 路由 | Vue Router 4 | 多页面 SPA |
| 数据存储 | Dexie.js (IndexedDB) | 结构化数据存储，支持复杂查询 |
| 代码编辑器 | CodeMirror 6 | 轻量 JSON/XML 语法高亮 |
| PWA | vite-plugin-pwa | Service Worker + manifest 自动生成 |
| 测试 | Vitest | Vite 生态一体化 |

**架构原则**: 纯前端 — 请求直接从浏览器发出，数据全量本地存储，无后端依赖。

---

## 3. 核心功能（第一版）

1. **请求构建与发送**
   - HTTP 方法: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
   - URL 输入 + Query 参数编辑
   - 自定义 Headers（键值对）
   - 请求 Body: JSON, form-data, x-www-form-urlencoded, raw text, binary
   - 认证辅助: Basic Auth, Bearer Token, API Key

2. **响应查看**
   - JSON 格式化 / 语法高亮
   - HTTP 状态码（颜色分级: 2xx 绿 / 3xx 蓝 / 4xx 橙 / 5xx 红）
   - 响应头展示
   - 响应耗时 + 体积
   - Raw 原始视图

3. **集合管理**
   - 文件夹嵌套
   - 请求保存到集合
   - 拖拽排序
   - 右键菜单操作（新建/重命名/删除/导出）

4. **环境变量**
   - 多环境切换（dev / staging / production）
   - `{{variable_name}}` 语法
   - 变量作用域: 请求级 > 环境级 > 全局

5. **请求历史**
   - 自动保存（最近 500 条）
   - 双击恢复请求，可修改后重新发送
   - 支持清除

6. **导入导出**
   - 自定义 JSON 导出/导入
   - Postman Collection v2.1 格式兼容导入
   - 导出为 cURL

---

## 4. 数据模型

```
Collection         id, name, description, parentId (可空, 支持嵌套), order, createdAt
Request            id, collectionId, name, method, url, headers[], params[], body{type, content}, auth{type, config}, order, createdAt
Environment        id, name, variables[{key, value, enabled}], createdAt
HistoryEntry       id, requestSnapshot (完整 Request 副本), responseSnapshot{status, headers, body, duration, size}, timestamp
```

---

## 5. UI 布局

```
┌───────────┬──────────────────────────────────────┐
│  Sidebar  │  [GET ▼] https://api.example.com  [Send] │
│           ├──────────────────────────────────────┤
│ 📁 集合1   │  Headers │ Body │ Auth │ Params      │
│  ├─ 请求A  │  ──────────────────────────────────  │
│  └─ 请求B  │  key          │ value                │
│ 📁 集合2   │  Content-Type │ application/json     │
│ 🕐 历史   │                                      │
│           ├──────────────────────────────────────┤
│           │  ● 200 OK    ⏱ 45ms    📦 1.2KB     │
│           │  ┌──────────────────────────────────┐ │
│           │  │ {                               │ │
│           │  │   "id": 1,                      │ │
│           │  │   "name": "Alice"               │ │
│           │  │ }                               │ │
│           │  └──────────────────────────────────┘ │
└───────────┴──────────────────────────────────────┘
```

- **左侧栏**: 集合树 + 历史入口，可折叠
- **右上**: 请求构建区（URL 栏 + 配置标签页）
- **右下**: 响应展示区（响应元信息 + 响应体）
- **顶栏**: 环境选择器 + 亮/暗主题切换

---

## 6. 项目结构

```
api-tool/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/index.ts
│   ├── stores/
│   │   ├── collection.ts          # 集合 + 请求
│   │   ├── environment.ts         # 环境变量
│   │   └── history.ts             # 请求历史
│   ├── db/
│   │   ├── index.ts               # Dexie 初始化
│   │   └── models.ts              # 类型定义
│   ├── composables/
│   │   ├── useRequest.ts          # HTTP 请求发送
│   │   ├── useEnvironment.ts      # 变量替换
│   │   └── useImportExport.ts     # 导入导出
│   ├── components/
│   │   ├── layout/                # AppSidebar, AppTopbar, AppMain
│   │   ├── request/               # RequestBuilder, UrlBar, 编辑器等
│   │   ├── response/              # ResponseViewer, ResponseBody 等
│   │   ├── collection/            # CollectionTree, CollectionItem 等
│   │   ├── environment/           # EnvSelector, EnvManager
│   │   └── shared/                # KeyValueEditor, CodeEditor 等
│   ├── views/
│   │   ├── HomeView.vue
│   │   └── SettingsView.vue
│   └── styles/
│       └── variables.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 7. 数据流

```
用户操作 → Pinia Store → IndexedDB (Dexie)
                │
                ▼
         组件层 (Vue) → useRequest (fetch) → 外部 API
                                                │
                                                ▼
                                          响应 → Pinia Store → 组件更新
                                                    │
                                                    ▼
                                              IndexedDB (历史记录)
```

关键规则:
- **Pinia 是唯一数据源** — 组件不直接操作 IndexedDB
- **请求纯浏览器发出** — 无中间代理，依赖目标服务的 CORS 配置
- **环境变量替换在发送前完成** — `useEnvironment` 在 `useRequest` 之前执行

---

## 8. PWA 配置

- vite-plugin-pwa 自动生成 Service Worker
- 预缓存: HTML/CSS/JS 应用壳
- 运行时缓存: 不缓存 API 响应（无意义，每次都是新的）
- 数据层离线: IndexedDB 天然离线
- Windows: 可安装为桌面快捷方式
- Android: Chrome "添加到主屏幕"

---

## 9. 设计细节

### HTTP 方法颜色
| 方法 | 颜色 |
|------|------|
| GET | #52c41a 绿 |
| POST | #1890ff 蓝 |
| PUT | #fa8c16 橙 |
| DELETE | #ff4d4f 红 |
| PATCH | #722ed1 紫 |
| HEAD/OPTIONS | #8c8c8c 灰 |

### 状态码颜色
- 2xx: 绿色
- 3xx: 蓝色
- 4xx: 橙色
- 5xx: 红色

### 响应时间
- <200ms: 绿色
- 200ms–1s: 橙色
- >1s: 红色

### 暗色/亮色双主题
- 默认暗色（工具类应用偏好）
- Naive UI 原生主题切换

---

## 10. 错误处理策略

- **不拦截浏览器的原生网络错误** — 给用户真实反馈
- URL 为空: 内联提示 "请输入 URL"
- JSON 格式错误: Body 编辑器内联红色警告
- 网络异常: 展示具体错误（CORS / 超时 / DNS 解析失败）
- 环境变量未定义: `{{xxx}}` 显示为红色高亮文本
- IndexedDB 写入失败: 静默降级，不阻断操作
- 历史超配额: 自动清理最旧条目

---

## 11. 测试策略

| 类型 | 范围 |
|------|------|
| 单元测试 | useRequest, useEnvironment composables |
| 组件测试 | KeyValueEditor, UrlBar 核心交互组件 |
| E2E (可选) | Playwright: "发送请求 → 看到响应" 完整链路 |

不测: Naive UI 组件、CodeMirror 渲染、Dexie 数据库操作（均已有上游测试）

---

## 12. 不做的（YAGNI）

- ❌ 团队协作 / 云端同步
- ❌ Mock 服务器
- ❌ 自动化测试脚本（Pre-request / Post-response scripts）
- ❌ WebSocket / GraphQL 支持
- ❌ API 文档自动生成
- ❌ 多标签页（Tab 切换，后续版本加）
- ❌ 后端服务

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-07 | 初始设计，确认 Phase 1 Web PWA 方案 |
