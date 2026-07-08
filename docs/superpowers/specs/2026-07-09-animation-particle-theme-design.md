# Animation & Particle Theme System — Design Spec

**Date:** 2026-07-09
**Status:** Approved
**Scope:** 新增动画预设维度，为 API Tool 添加粒子背景和 UI 交互动画

---

## 1. 架构设计

### 1.1 维度扩展

现有系统：`Color (5) × Style (4) × Mode (2) = 40 组合`
新系统：`Color (5) × Style (4) × Animation (4) × Mode (2) = 160 组合`

新增第三维度「动画预设」（Animation Preset），独立于颜色和风格，控制粒子背景类型和 UI 动画强度。

### 1.2 新增模块

```
src/animations/
├── tokens.ts                  # 动画类型定义
├── presets/
│   ├── index.ts               # 动画预设注册表 + 列表导出
│   ├── none.ts                # 无动画
│   ├── subtle.ts              # 微光 — 星空粒子 + 基础微交互
│   ├── fluid.ts               # 流体 — 渐变 blob + 圆润过渡
│   └── cyberpunk.ts           # 赛博 — 几何网格 + 锐利特效
├── engine.ts                  # 动画配置计算
└── components/
    └── ParticleBackground.vue # Canvas 粒子渲染组件
```

### 1.3 类型定义 (`src/animations/tokens.ts`)

```typescript
// 粒子类型
export type ParticleType = 'starfield' | 'geometry' | 'fluid' | 'none'

// 动画强度
export type AnimationLevel = 'none' | 'subtle' | 'moderate' | 'energetic'

// 动画预设完整配置
export interface AnimationPreset {
  name: string
  label: string
  /** 粒子背景类型 */
  particleType: ParticleType
  /** UI 动画强度级别 */
  animationLevel: AnimationLevel
  /** 粒子颜色（从 CSS 变量提取或使用主题色）*/
  particleColorSource: 'primary' | 'accent' | 'mixed'
  /** 粒子密度倍率 (1.0 = 默认) */
  particleDensity: number
  /** 是否启用路由过渡动画 */
  routeTransition: boolean
  /** 是否启用面板过渡动画 */
  panelTransition: boolean
  /** 是否启用微交互 (涟漪、悬浮等) */
  microInteractions: boolean
}
```

### 1.4 四个动画预设

| 预设 | 粒子类型 | UI 动画 | 说明 |
|------|----------|---------|------|
| `none` | none | none | 完全无动画，与当前行为一致 |
| `subtle` | starfield | subtle | 星空粒子 + 基础过渡 |
| `fluid` | fluid | moderate | 流动 blob + 圆润过渡 + 路由动画 |
| `cyberpunk` | geometry | energetic | 几何网格 + 全量特效 + 微交互 |

---

## 2. 粒子引擎

### 2.1 组件结构

`ParticleBackground.vue` — 单个 Vue 组件，置于 `App.vue` 模板最底层（在 router-view 之下），使用 Canvas 全屏渲染。

```vue
<template>
  <canvas
    v-show="enabled"
    ref="canvasRef"
    class="particle-canvas"
  />
</template>
```

**关键行为：**
- Canvas 尺寸通过 `ResizeObserver` 响应容器变化
- 使用 `requestAnimationFrame` 驱动渲染循环
- 监听 `document.visibilitychange`，页面隐藏时暂停，恢复时继续
- 从 `themeStore.computedTheme` 读取当前粒子配置
- 从 CSS 变量 `var(--app-primary)` 动态获取粒子颜色

### 2.2 三种粒子模式实现

#### Starfield（星空连线）
- 200 个粒子，每个有 x, y, vx, vy, radius
- 粒子在画布内匀速运动，碰壁反弹
- 距离 < 100px 的两粒子之间绘制半透明连线
- 鼠标位置产生引力效果（距离 < 150px 范围内粒子向鼠标加速）
- 粒子颜色 = `--app-primary`，连线透明度随距离衰减
- 粒子大小随机 1-3px

#### Geometry（几何网格）
- 背景：间距 40px 的透视网格线（模拟赛博空间地面）
- 前景：8-15 个半透明几何图形（三角形、菱形、六边形）
- 几何图形缓慢旋转（0.2-0.5 deg/frame）+ 上下浮动
- 随机出现扫描线（水平光束从上往下扫过）
- 颜色使用 primary + accent 混合

#### Fluid（渐变流体）
- 使用 Canvas 径向渐变模拟 3-5 个 metaball
- 每个 blob 有中心坐标、半径、颜色、漂移速度
- blob 之间通过极慢的正弦波运动漂移（周期 20-30 秒）
- 色彩在 primary 和 accent 之间过渡
- 整体透明度约 0.15-0.25，不影响内容阅读

### 2.3 性能策略

- `particleType === 'none'` 时 Canvas 不渲染，v-show 隐藏
- 使用 `devicePixelRatio` 缩放但限制最大为 2（高分屏不过度消耗）
- 帧率上限 60fps，通过时间戳控制
- 页面不可见时自动停止 requestAnimationFrame
- 粒子密度可通过 `particleDensity` 调整

---

## 3. UI 动画系统

### 3.1 全局 CSS Keyframes

在 `src/styles/global.css` 中新增：

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 4px var(--app-active-border); }
  50% { box-shadow: 0 0 12px var(--app-active-border); }
}

@keyframes ripple {
  to { transform: scale(4); opacity: 0; }
}
```

### 3.2 路由过渡

`App.vue` 中 `<router-view>` 包裹 `<Transition>`：

```vue
<router-view v-slot="{ Component }">
  <transition name="route" mode="out-in">
    <component :is="Component" />
  </transition>
</router-view>
```

CSS：
```css
.route-enter-active { animation: fadeIn 0.2s ease-out; }
.route-leave-active { animation: fadeIn 0.15s ease-in reverse; }
```

仅在 `animationLevel !== 'none'` 且 `routeTransition === true` 时启用。

### 3.3 面板过渡

- **Collection 展开/折叠**：使用 Vue `<Transition name="collapse">`，max-height + opacity 动画
- **响应面板内容切换**：使用 `<Transition name="fade">` 包裹响应体
- **Tab 切换**：已有的 Naive UI `<n-tabs animated>` 保留

### 3.4 微交互

- **MethodBadge hover**：`scale(1.08)` + 亮度提升，transition 0.15s
- **发送按钮点击**：CSS 涟漪效果（伪元素扩散圆圈）
- **列表项 hover**：`translateX(2px)` + 背景色过渡
- **卡片 hover**：`translateY(-1px)` + 阴影加深
- **输入框聚焦**：`box-shadow` 光晕从 `0 0 0 2px` 过渡到 `0 0 0 3px`

所有微交互通过 CSS class 控制，`microInteractions: false` 时不应用。

---

## 4. 与现有系统的整合

### 4.1 Theme Store 变更 (`src/stores/theme.ts`)

新增状态：
```typescript
const animationPresetName = ref('subtle')  // 默认启用微光
```

新增 getter：
```typescript
const animationPreset = computed(() =>
  animationPresets[animationPresetName.value] || animationPresets['subtle']
)
```

`computedTheme` 扩展，将 `animationPreset.value` 合并到输出中。

`loadFromSettings` / `saveToSettings` 扩展 `themeAnimation` 字段。

### 4.2 ComputedTheme 扩展 (`src/themes/tokens.ts`)

```typescript
export interface ComputedTheme {
  cssVars: Record<string, string>
  bodyClass: string
  naiveOverrides: Record<string, unknown>
  animation: AnimationPreset  // 新增
}
```

### 4.3 Body Class 扩展

引擎在 `bodyClass` 中追加 `theme-anim-{name}`（如 `theme-anim-subtle`），使全局 CSS 可根据动画预设选择性地启用动画规则。

### 4.4 App.vue 集成

```vue
<template>
  <n-config-provider ...>
    <ParticleBackground :config="themeStore.computedTheme.animation" />
    <n-dialog-provider>
      <n-message-provider>
        <router-view v-slot="{ Component }">
          <transition ...>
            <component :is="Component" />
          </transition>
        </router-view>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
```

### 4.5 持久化

`src/db/models.ts` 的 `AppSettings` 新增字段：
```typescript
themeAnimation?: string  // 动画预设名称
```

`seedDefaults()` 无需变更（undefined 时 theme store 使用默认值 `'subtle'`）。

### 4.6 SettingsView 集成

在 SettingsView 中新增「动画」section，展示 4 个动画预设卡片（与现有的颜色预设和风格预设卡片风格一致），点击切换 `themeStore.animationPresetName`。

### 4.7 CodeEditor 适配

`CodeEditor.vue` 已有 `recreateEditor()` 逻辑监听 `isDark` 变化。动画预设的变化不需要编辑器重建。

---

## 5. 文件变更清单

| 操作 | 文件 |
|------|------|
| 新建 | `src/animations/tokens.ts` |
| 新建 | `src/animations/presets/index.ts` |
| 新建 | `src/animations/presets/none.ts` |
| 新建 | `src/animations/presets/subtle.ts` |
| 新建 | `src/animations/presets/fluid.ts` |
| 新建 | `src/animations/presets/cyberpunk.ts` |
| 新建 | `src/animations/engine.ts` |
| 新建 | `src/animations/components/ParticleBackground.vue` |
| 修改 | `src/themes/tokens.ts` — ComputedTheme 新增 animation 字段 |
| 修改 | `src/themes/engine.ts` — 输出合并 animation preset |
| 修改 | `src/stores/theme.ts` — 新增 animationPresetName 状态 + 持久化 |
| 修改 | `src/db/models.ts` — AppSettings 新增 themeAnimation |
| 修改 | `src/App.vue` — 集成 ParticleBackground + 路由 Transition |
| 修改 | `src/styles/global.css` — 新增 @keyframes + 动画规则 |
| 修改 | `src/views/SettingsView.vue` — 新增动画预设选择 UI |
| 修改 | `src/views/HomeView.vue` — 面板过渡动画 |
| 修改 | `src/components/layout/AppTopbar.vue` — 动画预设快捷切换（可选） |
| 修改 | `src/components/collection/CollectionItem.vue` — 增强过渡 |
| 修改 | `src/components/request/UrlBar.vue` — 发送按钮涟漪 |

---

## 6. 测试策略

- **粒子引擎**：不进行像素级测试。通过 `ParticleBackground` 组件的挂载/卸载、visible 切换验证
- **动画预设注册表**：验证所有 preset 有唯一 name，所有字段类型正确
- **Theme Store**：扩展现有 theme store 测试，验证 animationPresetName 的读写和持久化
- **CSS**：动画为纯视觉效果，不进行自动化测试
- **性能**：手动验证 particleType: 'none' 时不渲染 Canvas

---

## 7. 风险和约束

- **性能**：Canvas 粒子在低端设备上可能有性能影响。通过 `none` 预设和 `particleDensity` 调节
- **可访问性**：`prefers-reduced-motion` 媒体查询将自动降级为 `none` 动画预设
- **Electron**：ParticleBackground 在 Electron 环境中正常工作（Canvas 2D API 完全可用）
- **PWA**：粒子系统不依赖网络，离线完全可用
