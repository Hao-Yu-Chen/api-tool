# 请求代理拦截与转发 — 设计文档

**日期**: 2026-07-16
**状态**: 待实施

---

## 1. 功能概述

在 API Tool 中新增"请求代理拦截与转发"功能模块。用户在应用中配置转发规则，启动代理后，系统（Windows）上的浏览器 HTTP 请求会自动被拦截，匹配规则的请求会被重写 URL 并转发到指定目标地址。

**核心场景**：将 `http://domain.com/api/**` 的请求转发到局域网服务 `http://192.168.3.18:8080/api/**`，其余请求不受影响。

## 2. 技术方案

**方案**：Electron 主进程内置 HTTP 代理服务器（基于 `http-proxy` 库）+ Windows 系统代理自动配置。

| 组件 | 运行位置 | 职责 |
|------|----------|------|
| 代理服务器 | Electron 主进程 | 监听 localhost 端口，接收请求，匹配规则，转发 |
| 规则引擎 | 共用模块 | 通配符匹配 + URL 重写（渲染进程 & 主进程共用） |
| 系统代理 | Electron 主进程 | 通过 Windows 注册表设置/清除系统代理 |
| UI 面板 | Vue 渲染进程 | 代理开关、规则 CRUD、状态显示 |
| Pinia Store | Vue 渲染进程 | 规则状态管理、IPC 调用封装 |
| IndexedDB | 渲染进程 | 规则持久化存储 |

## 3. 数据模型

### 3.1 转发规则 `ProxyRule`

```typescript
export interface ProxyRule {
  id?: number
  name: string                    // 规则名称，如 "API转发到本地"
  sourcePattern: string           // 源匹配模式，如 "http://domain.com/api/user/**"
  targetAddress: string           // 目标地址，如 "http://192.168.3.18:8080/api/user/admin/**"
  enabled: boolean                // 独立启用/禁用
  order: number                   // 匹配顺序（升序，命中第一条即停止）
  createdAt: number
  updatedAt: number
}
```

### 3.2 代理配置

不单独建表，存储在现有 `AppSettings` 或通过 Store 管理：

- `port: number` — 代理监听端口，默认 `8899`
- `autoStart: boolean` — 应用启动时是否自动开启（暂不实现 UI，预留）
- `autoSetSystemProxy: boolean` — 是否自动配置系统代理（默认 `true`）

### 3.3 通配符语义

| 符号 | 匹配范围 | 正则等效 | 示例 |
|------|----------|----------|------|
| `*` | 单层 URI 段（不含 `/`） | `[^/]+` | `/user/*/profile` → `/user/123/profile` |
| `**` | 多层 URI 段 | `(.+)` | `/user/**` → `/user/a/b/c` |

### 3.4 数据库表

新增第 6 张表 `proxyRules`，DB schema 版本升级至 v2：

```typescript
this.version(2).stores({
  proxyRules: '++id, enabled, order'
})
```

## 4. 规则匹配引擎

文件: `src/proxy/rule-engine.ts`

### 4.1 核心流程

```
请求 URL → parseUrl(protocol + host + path)
  → 按 order 升序遍历 enabled=true 的规则
  → compilePattern(sourcePattern) 生成正则
  → 正则匹配请求 URL
  → 命中：applyCaptures(targetAddress, captures) 生成目标 URL
  → 未命中：返回 null（代理直连原始目标）
  → 命中第一条即停止
```

### 4.2 compilePattern 算法

```
输入: "http://domain.com/api/user/**\/detail/*"
步骤:
  1. 分离 protocol://host/path
  2. 转义正则特殊字符（除 * 外）
  3. 先替换 ** → \x00 (占位符，防止 * 干扰)
  4. host 中的 * → ([^./]+)，path 中的 * → ([^/]+)
  5. \x00 → (.+)
  6. 构建 /^完整正则$/
输出: /^http:\/\/domain\.com\/api\/user\/(.+)\/detail\/([^\/]+)$/
```

### 4.3 applyCaptures 算法

```
输入: targetPattern = "http://192.168.3.18:8080/api/user/admin/**\/detail/*"
      captures = ["profile/settings", "id123"]
步骤:
  1. 找到 targetPattern 中 ** 和 * 的位置
  2. 按位置顺序依次替换为对应捕获值
输出: "http://192.168.3.18:8080/api/user/admin/profile/settings/detail/id123"
```

### 4.4 匹配结果类型

```typescript
interface MatchSuccess {
  matched: true
  targetUrl: string
  ruleName: string
}
interface MatchFailure {
  matched: false
}
type MatchResult = MatchSuccess | MatchFailure
```

## 5. Electron 主进程

### 5.1 代理服务器

文件: `electron/proxy-server.ts`

- 使用 `http-proxy` 库创建反向代理实例
- 配置 `changeOrigin: true` 修改 Host 头为目标地址
- HTTP 请求：匹配规则 → 重写 URL → `proxy.web()` 转发
- HTTPS 请求：CONNECT 隧道透传（加密内容无法修改 URL，不进行规则匹配）
- 未命中规则：`proxy.web()` 直连原始目标（透明代理）
- WebSocket：暂不支持

```typescript
// 伪代码骨架
const proxy = httpProxy.createProxyServer({ changeOrigin: true })

server = http.createServer((req, res) => {
  const url = `http://${req.headers.host}${req.url}`
  const result = matchRule(url, currentRules)

  if (result.matched) {
    const target = new URL(result.targetUrl)
    proxy.web(req, res, {
      target: target.origin,
      // 重写 path
    })
  } else {
    // 未命中 → 直连
    proxy.web(req, res, {
      target: `http://${req.headers.host}`
    })
  }
})

server.on('connect', (req, socket, head) => {
  // CONNECT 隧道透传（HTTPS）
})
```

### 5.2 系统代理设置

文件: `electron/system-proxy.ts`

**Windows 注册表方式：**

- 设置键: `HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`
- 开启: `ProxyEnable = 1`, `ProxyServer = "127.0.0.1:{port}"`
- 关闭: `ProxyEnable = 0`

**安全措施：**
- 启动前记录原始代理配置
- 应用退出 (`before-quit`) 自动恢复
- 端口冲突检测

### 5.3 IPC Handlers

```typescript
// electron/ipc-handlers.ts 新增

ipcMain.handle('proxy:start', async (_, { port, rules }) => { ... })
ipcMain.handle('proxy:stop', async () => { ... })
ipcMain.handle('proxy:status', async () => { ... })
ipcMain.handle('proxy:check-port', async (_, port) => { ... })
```

### 5.4 preload 暴露

```typescript
// electron/preload.ts 新增

window.electronAPI.proxy = {
  start: (port: number, rules: ProxyRule[]) => Promise<...>,
  stop: () => Promise<...>,
  status: () => Promise<...>,
  checkPort: (port: number) => Promise<...>,
}
```

### 5.5 类型声明

```typescript
// src/types/electron.d.ts 新增

interface ProxyAPI {
  start(port: number, rules: ProxyRule[]): Promise<{ success: boolean; error?: string }>
  stop(): Promise<{ success: boolean }>
  status(): Promise<{ running: boolean; port: number; ruleCount: number }>
  checkPort(port: number): Promise<{ available: boolean }>
}

// 扩展 Window.electronAPI
proxy: ProxyAPI
```

## 6. Pinia Store

文件: `src/stores/proxy.ts`

```typescript
export const useProxyStore = defineStore('proxy', () => {
  // State
  const rules = ref<ProxyRule[]>([])
  const isRunning = ref(false)
  const port = ref(8899)

  // Rules CRUD
  loadRules() → IndexedDB
  addRule(data) → IndexedDB + 内存刷新
  updateRule(id, data) → 深克隆 + IndexedDB
  deleteRule(id) → IndexedDB
  toggleRule(id) → 更新 enabled 字段
  reorderRules(fromIndex, toIndex) → 重新计算 order 字段

  // Proxy lifecycle (IPC calls)
  startProxy() → 检查 Electron 环境 → IPC → 更新 isRunning
  stopProxy() → IPC → 更新 isRunning
  refreshStatus() → IPC → 同步状态

  // Computed
  enabledRules → rules.filter(r => r.enabled)
})
```

**关键规则：**
- 所有 IndexedDB 写入前深克隆 (`JSON.parse(JSON.stringify(...))`)，剥离 Vue 响应式代理
- startProxy 前检查端口可用性
- 非 Electron 环境调用 startProxy 应提示不可用

## 7. UI 组件

### 7.1 侧边栏集成

在 `AppSidebar.vue` 中新增第三个 Tab：

```
[ 📁 集合 ] [ 🕐 历史 ] [ 🔀 代理 ]
```

### 7.2 ProxyPanel.vue — 代理面板

侧边栏"代理"Tab 的内容区域：

- **状态区域**：运行状态指示器（🟢运行中 / 🔴已停止）、端口显示
- **启动/停止按钮**：一键开关代理
- **规则列表**：可排序的规则卡片列表
- **新增按钮**：打开规则编辑器弹窗

非 Electron 环境显示「此功能仅在桌面版中可用」提示。

### 7.3 ProxyRuleItem.vue — 规则卡片

每条规则显示为紧凑卡片：

- 左侧：Switch 开关（即时启用/禁用）
- 中间：规则名称 + 源模式摘要（截断显示）+ 目标地址摘要
- 右侧：编辑按钮 + 删除按钮
- 拖拽手柄支持排序

### 7.4 ProxyRuleEditor.vue — 规则编辑器

模态弹窗，表单字段：

- 规则名称（文本输入）
- 源匹配模式（文本输入，placeholder 示例）
- 目标地址（文本输入，placeholder 示例）
- 通配符使用提示文字
- 启用开关
- 取消 / 保存按钮

## 8. 文件清单

```
新增文件:
  src/proxy/rule-engine.ts            # 规则匹配引擎（共用）
  electron/proxy-server.ts            # 代理服务器（主进程）
  electron/system-proxy.ts            # 系统代理设置（主进程）
  src/stores/proxy.ts                 # 代理 Store
  src/components/proxy/ProxyPanel.vue       # 代理面板
  src/components/proxy/ProxyRuleItem.vue    # 规则卡片
  src/components/proxy/ProxyRuleEditor.vue  # 规则编辑器

修改文件:
  src/db/models.ts                    # +ProxyRule 接口
  src/db/index.ts                     # +proxyRules 表 (v2)
  electron/main.ts                    # +IPC handlers + before-quit hook
  electron/preload.ts                 # +proxy API 暴露
  electron/ipc-handlers.ts            # +proxy handlers
  src/types/electron.d.ts             # +ProxyAPI 类型
  src/components/layout/AppSidebar.vue # +代理 Tab
  package.json                        # +http-proxy 依赖
```

## 9. 测试策略

| 层级 | 测试内容 | 工具 |
|------|----------|------|
| `rule-engine.ts` | 通配符编译、匹配、捕获替换、边界情况 | Vitest 单元测试 |
| `proxy.ts` Store | 规则 CRUD、状态管理 | Vitest + mock IndexedDB |
| 代理服务器 | 启动/停止、端口冲突、退出恢复 | Electron 手动测试 |
| UI 组件 | 规则增删改、开关切换、排序 | Vue Test Utils |
| 端到端 | 启动代理 → 浏览器请求 → 验证转发 | 手动集成测试 |

## 10. 约束与限制

- **仅 Electron 桌面版可用**，Web 版显示功能不可用提示
- **HTTPS 内容不修改**，CONNECT 隧道透传
- **仅 Windows 系统代理**，macOS/Linux 后续扩展
- **不修改请求体/响应体**，仅重写 URL
- **HTTP 方法保留不变**，仅改变目标地址

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-16 | 初始设计 |
