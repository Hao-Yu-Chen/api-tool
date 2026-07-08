# 多主题系统设计规格

## 背景

当前 API Tool 仅支持亮/暗双色切换，通过 `body.theme-dark` / `body.theme-light` 两套硬编码 CSS 变量实现，Naive UI 使用内置 `darkTheme`/`lightTheme` 预设。存在以下局限：

- 配色单一（仅中性灰 + 蓝色强调）
- 无多套配色方案可选
- 无视觉风格变化（如玻璃态、赛博）
- 主题状态未持久化，刷新回退亮色
- CSS 变量硬编码，新增主题需大量 CSS

目标：建立一套完整的 Design Token 体系，支持色彩预设 × 视觉风格正交组合，状态持久化，动态注入 CSS 变量。

## 架构设计

### Design Token 三层体系

```
Color Preset (Nord, Dracula, One Dark, GitHub, Monokai)
    │                              │
    ▼                              ▼
Color Tokens (~40)    ×    Style Tokens (~12)
    │                              │
    └──────────────┬───────────────┘
                   ▼
           Derived Tokens (~28 --app-*)
                   │
       ┌───────────┴───────────┐
       ▼                       ▼
  CSS Variables          Naive UI themeOverrides
  (动态注入 :root)        (n-config-provider)
```

- **Color Tokens**：色板定义，与风格无关
- **Style Tokens**：形态定义，与配色无关
- **Derived Tokens**：由引擎自动计算，直接驱动 UI

### 文件结构

```
src/themes/
├── engine.ts              # computeTheme() 核心计算
├── tokens.ts              # Token 类型定义
├── naive-overrides.ts     # Naive UI themeOverrides 生成
├── presets/
│   ├── colors/            # 色彩预设（每文件一套，含 dark/light）
│   │   ├── nord.ts
│   │   ├── dracula.ts
│   │   ├── one-dark.ts
│   │   ├── github.ts
│   │   └── monokai.ts
│   └── styles/            # 风格预设（每文件一套）
│       ├── minimal.ts
│       ├── glass.ts
│       ├── cyber.ts
│       └── tool.ts
```

### Token 计算引擎

```ts
// themes/tokens.ts — 类型定义
interface ColorTokens {
  // Brand (6)
  primary: string; primaryHover: string; primaryPressed: string
  accent: string; accentHover: string; accentPressed: string
  // Surface (8)
  bgBase: string; bgElevated: string; bgOverlay: string
  sidebarBg: string
  surface1: string; surface2: string; surface3: string
  surfaceCard: string
  // Text (5)
  textPrimary: string; textSecondary: string
  textTertiary: string; textDisabled: string
  textInverse: string
  // Border (3)
  borderStrong: string; borderDefault: string; borderSubtle: string
  // Semantic (8)
  success: string; warning: string; error: string; info: string
  successBg: string; warningBg: string; errorBg: string; infoBg: string
  // Misc (4)
  link: string; linkHover: string
  hoverOverlay: string; activeOverlay: string
  // JSON Syntax (6)
  jsonKey: string; jsonString: string; jsonNumber: string
  jsonBoolean: string; jsonNull: string; jsonBracket: string
  // 总计 40
}

interface StyleTokens {
  radiusSm: string       // 按钮/输入框
  radiusMd: string       // 卡片
  radiusLg: string       // 面板/弹窗
  shadowSm: string       // 微提升
  shadowMd: string       // 下拉
  shadowLg: string       // 弹窗
  shadowGlow: string     // 霓虹发光
  blurAmount: string     // 玻璃模糊量
  glassOpacity: number   // 玻璃透明度 0-1
  density: 'compact' | 'comfortable'
  gapSize: string        // 间距基准
  borderWidth: string    // 边框粗细
  // 总计 12
}

type ThemeMode = 'dark' | 'light'

// 色彩预设 = 暗色值 + 亮色值
interface ColorPreset {
  name: string
  label: string
  dark: ColorTokens
  light: ColorTokens
}

// 风格预设 = 纯形态值
interface StylePreset {
  name: string
  label: string
  tokens: StyleTokens
}

// 最终输出
interface ComputedTheme {
  cssVars: Record<string, string>    // --app-* 变量
  naiveOverrides: Record<string, unknown>  // Naive UI themeOverrides
}
```

### 预设定义

#### 色彩预设（5 套，每套 dark + light）

| Preset | 暗色主色 | 亮色主色 | 特征 |
|--------|---------|---------|------|
| Nord | `#88C0D0` | `#3B6E8C` | 冷蓝灰基调，低对比护眼 |
| Dracula | `#BD93F9` | `#7B3FA3` | 深紫暗色，暖白亮色 |
| One Dark | `#61AFEF` | `#4078F2` | Atom 经典蓝 |
| GitHub | `#58A6FF` | `#0969DA` | GitHub 风格蓝 |
| Monokai | `#A6E22E` | `#6A9A1A` | 高饱和绿，活力 |

#### 视觉风格预设（4 套）

| Style | 圆角 | 阴影 | 特征 |
|-------|------|------|------|
| Minimal | 4px / 6px / 8px | 无 | 扁平、大留白 |
| Glass | 12px / 14px / 16px | 柔和 | backdrop-filter 模糊 |
| Cyber | 2px / 3px / 4px | 霓虹发光 | 发光边框、高饱和 |
| Tool | 6px / 8px / 10px | 微阴影 | 紧凑分区 |

#### 默认推荐组合

- Nord + Minimal
- Dracula + Cyber
- One Dark + Tool
- GitHub + Minimal
- Monokai + Glass

### 计算规则

```
核心规则函数 computeTheme(colorTokens, styleTokens, mode) → ComputedTheme

关键映射：
  --app-bg            = colorTokens.bgBase
  --app-sidebar-bg     = colorTokens.sidebarBg
  --app-topbar-bg      = colorTokens.bgElevated
  --app-main-bg        = colorTokens.bgBase
  --app-panel-bg       = colorTokens.surface1
  --app-surface-bg     = colorTokens.surface2
  --app-card-bg        = colorTokens.surfaceCard
  --app-hover-bg       = colorTokens.hoverOverlay
  --app-active-bg      = colorTokens.activeOverlay
  --app-active-border  = colorTokens.primary (with alpha)
  --app-border         = colorTokens.borderDefault
  --app-border-light   = colorTokens.borderSubtle
  --app-border-subtle  = colorTokens.borderSubtle
  --app-text           = colorTokens.textPrimary
  --app-text-secondary = colorTokens.textSecondary
  --app-text-disabled  = colorTokens.textDisabled
  --app-text-muted     = colorTokens.textTertiary
  --app-guide-line     = colorTokens.borderSubtle
  --app-bg-color       = colorTokens.bgBase
  --json-*             = colorTokens.json*

风格叠加重写：
  Glass:  --app-panel-bg → rgba(surface1, glassOpacity) + backdrop-filter
  Cyber:  --app-active-border → primary + shadowGlow; border-width 覆写
  Tool:   density → compact → 全局 app 加 tool-compact class 收紧间距
  Minimal: gap 更大、阴影全为 none

Naive UI 同步：
  themeOverrides.common 使用派生色映射到 Naive 的 common 色表
  primaryColor / primaryColorHover / primaryColorPressed 等
```

### Pinia Store（stores/theme.ts）

```ts
useThemeStore:
  state:
    colorPreset: string      // 当前色彩预设名，默认 "one-dark"
    stylePreset: string      // 当前风格预设名，默认 "minimal"
    isDark: boolean          // 暗/亮模式，默认 true
    customOverrides: {...}   // 用户自定义覆盖（未来扩展）
  
  getters:
    currentColorPreset       // 从 presets/colors/ 解析
    currentStylePreset       // 从 presets/styles/ 解析
    computedTheme            // computeTheme() 结果（缓存）
  
  actions:
    loadFromSettings()       // 从 IndexedDB settings 表恢复
    saveToSettings()         // 持久化到 settings 表
    setColorPreset(name)
    setStylePreset(name)
    toggleDark()
```

### 组件改动

| 文件 | 改动说明 |
|------|----------|
| `src/App.vue` | 从 themeStore 读取 computedTheme，调用 `applyTheme()` 注入 CSS 变量，传递 naiveOverrides 给 `n-config-provider` |
| `src/styles/global.css` | 删除 `body.theme-dark/light` 块，只保留 reset + 滚动条 |
| `src/components/layout/AppTopbar.vue` | 主题按钮改为打开主题快速切换面板，显示当前色彩名/风格名 |
| `src/views/SettingsView.vue` | 新增主题设置区：色彩预设选择（可视化色块）、风格预设选择、暗/亮切换、实时预览 |
| `src/components/shared/CodeEditor.vue` | 从 themeStore 读取色彩预设 → 映射 CodeMirror 主题 |

## 实施阶段

### Phase 1: Token 基础设施
- 创建 `src/themes/tokens.ts` — 完整类型定义
- 验证：`vue-tsc --noEmit` 通过

### Phase 2: 预设数据
- 创建 5 套色彩预设文件（每套 dark + light 共 40 个色值）
- 创建 4 套风格预设文件
- 完整色值来源于官方配色文档（Nord官网、Dracula官网等）

### Phase 3: 引擎 & Store
- 实现 `src/themes/engine.ts` — `computeTheme()`
- 实现 `src/themes/naive-overrides.ts` — Naive UI 覆盖生成
- 实现 `src/stores/theme.ts` — Pinia store + 持久化

### Phase 4: 核心集成
- 改造 `App.vue`：主题初始化、CSS 变量注入、naiveOverrides 传递
- 改造 `AppTopbar.vue`：主题入口
- 精简 `global.css`
- 适配 `CodeEditor.vue`

### Phase 5: 设置界面
- 改造 `SettingsView.vue`：主题选择器 UI
- 联动 AppTopbar

### Phase 6: 逐套调优 & 极端组合验证
- 每套色彩 + 每套风格逐一验证
- 玻璃态的兼容性处理
- 赛博风格的发光效果调整
- 验证所有现有组件在新主题下外观正常

## 验证标准

1. `vue-tsc --noEmit` 零错误
2. 所有 20 种组合（5 色彩 × 4 风格）可正常切换，无视觉异常
3. 暗/亮模式在每个色彩预设下均可正常切换
4. 刷新页面后主题状态保持
5. Naive UI 组件（对话框、下拉、输入框等）与自定义组件色彩一致
6. CodeMirror 编辑器语法高亮随色彩预设切换
7. JSON Tree Viewer 语法色随主题变化
