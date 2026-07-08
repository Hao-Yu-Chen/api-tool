# Animation & Particle Theme System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 API Tool 添加第三维度「动画预设」主题系统，包含 Canvas 粒子背景（星空/几何/流体）和 UI 交互动画（路由过渡、面板动画、微交互）

**Architecture:** 在现有 Color × Style 架构上增加 Animation 预设维度。新增 `src/animations/` 模块（tokens → presets → engine → ParticleBackground 组件），通过 theme store 和 App.vue 集成。粒子引擎用纯 Canvas 2D + requestAnimationFrame 实现，零外部依赖。

**Tech Stack:** Vue 3 + TypeScript + Canvas 2D API + CSS @keyframes + Vue `<Transition>` + Naive UI

## Global Constraints

- 零外部动画依赖（不引入 GSAP、motion/vue 等库）
- 粒子类型 `'none'` 时完全不渲染 Canvas
- 必须支持 `prefers-reduced-motion` 媒体查询自动降级
- 动画预设持久化到 IndexedDB `settings` 表
- 粒子颜色从当前主题 CSS 变量 `--app-primary` 动态提取
- 所有代码遵循项目现有模式（Composition API + `<script setup>` + scoped CSS）

---

### Task 1: 动画类型定义 (`src/animations/tokens.ts`)

**Files:**
- Create: `src/animations/tokens.ts`

**Interfaces:**
- Produces: `ParticleType`, `AnimationLevel`, `AnimationPreset` — 被所有后续任务引用

- [ ] **Step 1: 创建动画类型定义文件**

```typescript
// src/animations/tokens.ts

/** 粒子背景类型 */
export type ParticleType = 'starfield' | 'geometry' | 'fluid' | 'none'

/** UI 动画强度级别 */
export type AnimationLevel = 'none' | 'subtle' | 'moderate' | 'energetic'

/** 动画预设完整配置 */
export interface AnimationPreset {
  /** 唯一标识，用于持久化和 body class */
  name: string
  /** 显示标签 */
  label: string
  /** 粒子背景类型 */
  particleType: ParticleType
  /** UI 动画强度 */
  animationLevel: AnimationLevel
  /** 粒子颜色来源 */
  particleColorSource: 'primary' | 'accent' | 'mixed'
  /** 粒子密度倍率 (1.0 = 默认) */
  particleDensity: number
  /** 是否启用路由过渡动画 */
  routeTransition: boolean
  /** 是否启用面板过渡动画 */
  panelTransition: boolean
  /** 是否启用微交互（涟漪、悬浮缩放等） */
  microInteractions: boolean
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx vue-tsc --noEmit src/animations/tokens.ts
```

- [ ] **Step 3: 提交**

```bash
git add src/animations/tokens.ts
git commit -m "feat: add animation preset type definitions"
```

---

### Task 2: 动画预设数据 (`src/animations/presets/`)

**Files:**
- Create: `src/animations/presets/none.ts`
- Create: `src/animations/presets/subtle.ts`
- Create: `src/animations/presets/fluid.ts`
- Create: `src/animations/presets/cyberpunk.ts`
- Create: `src/animations/presets/index.ts`

**Interfaces:**
- Consumes: `AnimationPreset` from `@/animations/tokens`
- Produces: `animationPresets: Record<string, AnimationPreset>`, `animationPresetList: AnimationPreset[]` — 供 theme store 和 SettingsView 使用

- [ ] **Step 1: 创建 none 预设**

```typescript
// src/animations/presets/none.ts
import type { AnimationPreset } from '@/animations/tokens'

const none: AnimationPreset = {
  name: 'none',
  label: '无动画',
  particleType: 'none',
  animationLevel: 'none',
  particleColorSource: 'primary',
  particleDensity: 0,
  routeTransition: false,
  panelTransition: false,
  microInteractions: false
}

export default none
```

- [ ] **Step 2: 创建 subtle 预设**

```typescript
// src/animations/presets/subtle.ts
import type { AnimationPreset } from '@/animations/tokens'

const subtle: AnimationPreset = {
  name: 'subtle',
  label: '微光',
  particleType: 'starfield',
  animationLevel: 'subtle',
  particleColorSource: 'primary',
  particleDensity: 1.0,
  routeTransition: false,
  panelTransition: true,
  microInteractions: true
}

export default subtle
```

- [ ] **Step 3: 创建 fluid 预设**

```typescript
// src/animations/presets/fluid.ts
import type { AnimationPreset } from '@/animations/tokens'

const fluid: AnimationPreset = {
  name: 'fluid',
  label: '流体',
  particleType: 'fluid',
  animationLevel: 'moderate',
  particleColorSource: 'mixed',
  particleDensity: 1.0,
  routeTransition: true,
  panelTransition: true,
  microInteractions: true
}

export default fluid
```

- [ ] **Step 4: 创建 cyberpunk 预设**

```typescript
// src/animations/presets/cyberpunk.ts
import type { AnimationPreset } from '@/animations/tokens'

const cyberpunk: AnimationPreset = {
  name: 'cyberpunk',
  label: '赛博',
  particleType: 'geometry',
  animationLevel: 'energetic',
  particleColorSource: 'mixed',
  particleDensity: 1.2,
  routeTransition: true,
  panelTransition: true,
  microInteractions: true
}

export default cyberpunk
```

- [ ] **Step 5: 创建预设注册表**

```typescript
// src/animations/presets/index.ts
import type { AnimationPreset } from '@/animations/tokens'
import none from './none'
import subtle from './subtle'
import fluid from './fluid'
import cyberpunk from './cyberpunk'

export const animationPresets: Record<string, AnimationPreset> = {
  none, subtle, fluid, cyberpunk
}

export const animationPresetList: AnimationPreset[] = Object.values(animationPresets)
```

- [ ] **Step 6: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 7: 提交**

```bash
git add src/animations/presets/
git commit -m "feat: add 4 animation presets (none, subtle, fluid, cyberpunk)"
```

---

### Task 3: 动画引擎 (`src/animations/engine.ts`)

**Files:**
- Create: `src/animations/engine.ts`

**Interfaces:**
- Consumes: `AnimationPreset` from `@/animations/tokens`
- Produces: `computeAnimationConfig(preset: AnimationPreset, primaryColor: string)` — 返回渲染就绪的粒子配置对象，供 ParticleBackground 组件使用

- [ ] **Step 1: 创建动画引擎**

```typescript
// src/animations/engine.ts
import type { AnimationPreset } from './tokens'

/** 粒子系统运行时配置（由引擎从 AnimationPreset 计算得出） */
export interface ParticleConfig {
  enabled: boolean
  type: 'starfield' | 'geometry' | 'fluid' | 'none'
  color: string
  accentColor: string
  density: number
  maxParticles: number
}

const PARTICLE_COUNTS: Record<string, number> = {
  starfield: 200,
  geometry: 15,
  fluid: 5,
  none: 0
}

/**
 * 从动画预设和主题色计算粒子运行时配置
 */
export function computeParticleConfig(
  preset: AnimationPreset,
  primaryColor: string
): ParticleConfig {
  const accentColor = shiftHue(primaryColor, 30)

  return {
    enabled: preset.particleType !== 'none',
    type: preset.particleType,
    color: primaryColor,
    accentColor: preset.particleColorSource === 'mixed' ? accentColor : primaryColor,
    density: preset.particleDensity,
    maxParticles: Math.floor(PARTICLE_COUNTS[preset.particleType] * preset.particleDensity)
  }
}

/**
 * 简单色相偏移（用于 mixed 模式下生成 accent 颜色）
 */
function shiftHue(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  // 简单 RGB 偏移近似
  const nr = Math.min(255, Math.max(0, r + amount))
  const ng = Math.min(255, Math.max(0, g + Math.floor(amount * 0.5)))
  const nb = Math.min(255, Math.max(0, b - Math.floor(amount * 0.3)))

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/animations/engine.ts
git commit -m "feat: add animation engine with particle config computation"
```

---

### Task 4: 扩展 ComputedTheme 和主题引擎

**Files:**
- Modify: `src/themes/tokens.ts` — `ComputedTheme` 新增 `animation` 字段
- Modify: `src/themes/engine.ts` — `computeTheme()` 签名和返回值扩展

**Interfaces:**
- Consumes: `AnimationPreset` from `@/animations/tokens`
- Produces: 扩大的 `ComputedTheme` 含 `animation: AnimationPreset`

- [ ] **Step 1: 修改 ComputedTheme 类型**

在 `src/themes/tokens.ts` 文件顶部添加导入，在 `ComputedTheme` 接口中添加字段：

```typescript
// 在文件顶部 import 区域新增：
import type { AnimationPreset } from '@/animations/tokens'

// 修改 ComputedTheme 接口：
export interface ComputedTheme {
  cssVars: Record<string, string>
  bodyClass: string
  naiveOverrides: Record<string, unknown>
  animation: AnimationPreset  // 新增
}
```

- [ ] **Step 2: 修改 computeTheme 函数**

修改 `src/themes/engine.ts` 的 `computeTheme` 函数签名和返回值：

```typescript
// 在文件顶部新增导入：
import type { ColorTokens, StyleTokens, ComputedTheme, ThemeMode } from './tokens'
import type { AnimationPreset } from '@/animations/tokens'

// 修改函数签名，新增 animation 参数：
export function computeTheme(
  color: ColorTokens,
  style: StyleTokens,
  styleName: string,
  mode: ThemeMode,
  animation: AnimationPreset  // 新增
): ComputedTheme {
  const cssVars = buildCssVars(color, style, mode)
  const bodyClass = buildBodyClass(mode, style, styleName, animation)  // 传入 animation
  const naiveOverrides = buildNaiveOverrides(color, style)

  return { cssVars, bodyClass, naiveOverrides, animation }
}

// 修改 buildBodyClass 函数签名，追加 animation class：
function buildBodyClass(
  mode: ThemeMode,
  style: StyleTokens,
  styleName: string,
  animation: AnimationPreset  // 新增
): string {
  const classes = [mode === 'dark' ? 'theme-dark' : 'theme-light']
  classes.push(`theme-${styleName}`)
  if (style.density === 'compact') classes.push('theme-compact')
  if (style.glassOpacity > 0) classes.push('theme-glass')
  if (style.shadowGlow !== 'none') classes.push('theme-cyber')
  // 新增：动画预设 body class
  classes.push(`theme-anim-${animation.name}`)
  if (animation.microInteractions) classes.push('theme-micro-on')
  return classes.join(' ')
}
```

- [ ] **Step 3: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 4: 提交**

```bash
git add src/themes/tokens.ts src/themes/engine.ts
git commit -m "feat: extend ComputedTheme with animation preset field"
```

---

### Task 5: 扩展 Theme Store (`src/stores/theme.ts`)

**Files:**
- Modify: `src/stores/theme.ts`

**Interfaces:**
- Consumes: `animationPresets` from `@/animations/presets`, `AnimationPreset` from `@/animations/tokens`
- Produces: 新增 `animationPresetName` 状态、`animationPreset` getter、`setAnimationPreset` action

- [ ] **Step 1: 修改 theme store**

```typescript
// src/stores/theme.ts
// 新增导入：
import { animationPresets } from '@/animations/presets'
import type { AnimationPreset } from '@/animations/tokens'

const DEFAULT_ANIMATION = 'subtle'

// 在 defineStore 内新增 state：
const animationPresetName = ref(DEFAULT_ANIMATION)

// 新增 getter：
const animationPreset = computed<AnimationPreset>(() =>
  animationPresets[animationPresetName.value] || animationPresets[DEFAULT_ANIMATION]
)

// 修改 computedTheme getter，传入 animation：
const computedTheme = computed<ComputedTheme>(() =>
  computeTheme(
    mode.value === 'dark' ? colorPreset.value.dark : colorPreset.value.light,
    stylePreset.value.tokens,
    stylePreset.value.name,
    mode.value,
    animationPreset.value  // 新增
  )
)

// 在 loadFromSettings 中新增读取：
if (typeof settings.themeAnimation === 'string') {
  animationPresetName.value = settings.themeAnimation
}

// 在 saveToSettings 中新增写入：
await db.settings.update(settings.id, {
  themeColor: colorPresetName.value,
  themeStyle: stylePresetName.value,
  themeDark: isDark.value,
  themeAnimation: animationPresetName.value  // 新增
})

// 修改 watch，加入 animationPresetName：
watch([colorPresetName, stylePresetName, isDark, animationPresetName], () => {
  if (!initialized.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveToSettings(), 300)
})

// 新增 action：
function setAnimationPreset(name: string) {
  if (animationPresets[name]) animationPresetName.value = name
}

// 在 return 中新增导出：
return {
  colorPresetName, stylePresetName, isDark, initialized,
  animationPresetName,  // 新增
  colorPreset, stylePreset, mode, computedTheme,
  animationPreset,  // 新增
  loadFromSettings, setColorPreset, setStylePreset, toggleDark,
  setAnimationPreset  // 新增
}
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/stores/theme.ts
git commit -m "feat: add animation preset state and persistence to theme store"
```

---

### Task 6: 扩展 AppSettings 数据模型 (`src/db/models.ts`)

**Files:**
- Modify: `src/db/models.ts`

- [ ] **Step 1: 添加 themeAnimation 字段**

```typescript
// 在 AppSettings 接口中新增最后一行：
export interface AppSettings {
  id?: number
  theme: 'dark' | 'light'
  activeEnvId: number | null
  sidebarWidth: number
  themeColor?: string
  themeStyle?: string
  themeDark?: boolean
  themeAnimation?: string  // 新增：动画预设名称
}
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/db/models.ts
git commit -m "feat: add themeAnimation field to AppSettings model"
```

---

### Task 7: 粒子背景组件 (`src/animations/components/ParticleBackground.vue`)

**Files:**
- Create: `src/animations/components/ParticleBackground.vue`

**Interfaces:**
- Consumes: `ParticleConfig` from `@/animations/engine`

- [ ] **Step 1: 创建 ParticleBackground.vue**

```vue
<!-- src/animations/components/ParticleBackground.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { ParticleConfig } from '@/animations/engine'

const props = defineProps<{
  config: ParticleConfig
  primaryColor: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let animFrameId = 0
let particles: Particle[] = []
let mouseX = -1000
let mouseY = -1000
let scanLineY = 0

// ====== Starfield Particle ======
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  opacity: number
  // geometry specific
  rotation?: number
  rotationSpeed?: number
  shape?: 'triangle' | 'diamond' | 'hexagon'
  size?: number
  // fluid specific
  baseX?: number
  baseY?: number
  phaseX?: number
  phaseY?: number
  speedX?: number
  speedY?: number
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx = canvas.getContext('2d')
  if (ctx) ctx.scale(dpr, dpr)
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.scale(dpr, dpr)
}

// ====== Starfield System ======

function createStarfield(count: number) {
  const w = window.innerWidth
  const h = window.innerHeight
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      radius: Math.random() * 2 + 1,
      opacity: Math.random() * 0.6 + 0.4
    })
  }
}

function updateStarfield() {
  const w = window.innerWidth
  const h = window.innerHeight
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0) p.x = w
    if (p.x > w) p.x = 0
    if (p.y < 0) p.y = h
    if (p.y > h) p.y = 0

    // 鼠标引力
    const dx = mouseX - p.x
    const dy = mouseY - p.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 150 && dist > 0) {
      const force = 0.03 / (dist * 0.01)
      p.vx += dx * force * 0.01
      p.vy += dy * force * 0.01
      p.vx *= 0.99
      p.vy *= 0.99
    }
  }
}

function drawStarfield(color: string) {
  if (!ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  // 连线
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 100) {
        const alpha = (1 - dist / 100) * 0.15
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
        ctx.stroke()
      }
    }
  }

  // 粒子点
  for (const p of particles) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fillStyle = `${color}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`
    ctx.fill()
  }
}

// ====== Geometry System ======

function createGeometry(count: number) {
  const w = window.innerWidth
  const h = window.innerHeight
  const shapes: Array<'triangle' | 'diamond' | 'hexagon'> = ['triangle', 'diamond', 'hexagon']
  particles = []
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3 - 0.2,
      radius: 0,
      opacity: Math.random() * 0.3 + 0.1,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.01,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      size: Math.random() * 30 + 15
    })
  }
}

function updateGeometry() {
  const w = window.innerWidth
  const h = window.innerHeight
  for (const p of particles) {
    p.y += p.vy
    if (p.y < -50) {
      p.y = h + 50
      p.x = Math.random() * w
    }
    p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0)
  }
  scanLineY = (scanLineY + 1.5) % window.innerHeight
}

function drawGeometry(color: string, accentColor: string) {
  if (!ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  // 网格线
  ctx.strokeStyle = `${color}15`
  ctx.lineWidth = 0.5
  const gridSize = 50
  // 水平线透视效果
  for (let y = h * 0.5; y < h; y += gridSize) {
    const t = (y - h * 0.5) / (h * 0.5)
    const alpha = (1 - t) * 0.3
    ctx.strokeStyle = `${color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  // 竖直线汇聚到中心
  for (let x = 0; x <= w; x += gridSize) {
    ctx.beginPath()
    ctx.moveTo(x, h * 0.4)
    ctx.lineTo(w * 0.5 + (x - w * 0.5) * 3, h)
    ctx.stroke()
  }

  // 几何图形
  for (const p of particles) {
    drawShape(p, color, accentColor)
  }

  // 扫描线
  const gradient = ctx.createLinearGradient(0, scanLineY - 20, 0, scanLineY + 20)
  gradient.addColorStop(0, 'transparent')
  gradient.addColorStop(0.5, `${accentColor}30`)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, scanLineY - 20, w, 40)
}

function drawShape(p: Particle, color: string, accent: string) {
  if (!ctx || !p.shape || !p.size) return
  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation || 0)
  ctx.fillStyle = `${accent}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`
  ctx.strokeStyle = `${color}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`
  ctx.lineWidth = 1
  ctx.beginPath()
  const s = p.size

  if (p.shape === 'triangle') {
    ctx.moveTo(0, -s * 0.6)
    ctx.lineTo(s * 0.5, s * 0.4)
    ctx.lineTo(-s * 0.5, s * 0.4)
    ctx.closePath()
  } else if (p.shape === 'diamond') {
    ctx.moveTo(0, -s * 0.5)
    ctx.lineTo(s * 0.5, 0)
    ctx.lineTo(0, s * 0.5)
    ctx.lineTo(-s * 0.5, 0)
    ctx.closePath()
  } else if (p.shape === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2
      const x = Math.cos(angle) * s * 0.4
      const y = Math.sin(angle) * s * 0.4
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }

  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

// ====== Fluid System ======

function createFluid(count: number) {
  const w = window.innerWidth
  const h = window.innerHeight
  particles = []
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    particles.push({
      x, y,
      vx: 0, vy: 0,
      radius: Math.random() * 200 + 150,
      opacity: Math.random() * 0.12 + 0.08,
      baseX: x,
      baseY: y,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      speedX: Math.random() * 0.0003 + 0.0001,
      speedY: Math.random() * 0.0003 + 0.0001
    })
  }
}

function updateFluid(time: number) {
  for (const p of particles) {
    p.x = (p.baseX || 0) + Math.sin(time * (p.speedX || 0.0002) + (p.phaseX || 0)) * 150
    p.y = (p.baseY || 0) + Math.cos(time * (p.speedY || 0.0002) + (p.phaseY || 0)) * 100
  }
}

function drawFluid(color: string, accentColor: string) {
  if (!ctx) return
  const w = window.innerWidth
  const h = window.innerHeight
  ctx.clearRect(0, 0, w, h)

  for (const p of particles) {
    const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
    gradient.addColorStop(0, `${color}${Math.floor(p.opacity * 2 * 255).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(0.5, `${accentColor}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`)
    gradient.addColorStop(1, 'transparent')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }
}

// ====== Main Loop ======

function createParticles() {
  if (!props.config.enabled) return
  const count = props.config.maxParticles
  switch (props.config.type) {
    case 'starfield': createStarfield(count); break
    case 'geometry': createGeometry(count); break
    case 'fluid': createFluid(count); break
  }
}

function animate(time: number) {
  if (!props.config.enabled || prefersReducedMotion) {
    if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    animFrameId = requestAnimationFrame(animate)
    return
  }
  switch (props.config.type) {
    case 'starfield':
      updateStarfield()
      drawStarfield(props.config.color)
      break
    case 'geometry':
      updateGeometry()
      drawGeometry(props.config.color, props.config.accentColor)
      break
    case 'fluid':
      updateFluid(time)
      drawFluid(props.config.color, props.config.accentColor)
      break
  }
  animFrameId = requestAnimationFrame(animate)
}

function onMouseMove(e: MouseEvent) {
  mouseX = e.clientX
  mouseY = e.clientY
}

// ====== Lifecycle ======

onMounted(() => {
  resizeCanvas()
  initCanvas()
  createParticles()
  animFrameId = requestAnimationFrame(animate)

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('mousemove', onMouseMove)

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animFrameId)
    } else {
      animFrameId = requestAnimationFrame(animate)
    }
  })
})

onUnmounted(() => {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mousemove', onMouseMove)
})

watch(() => [props.config.type, props.config.maxParticles], () => {
  createParticles()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="particle-canvas"
  />
</template>

<style scoped>
.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/animations/components/ParticleBackground.vue
git commit -m "feat: add Canvas particle background component (starfield/geometry/fluid)"
```

---

### Task 8: 全局 CSS 动画 (`src/styles/global.css`)

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: 在 global.css 末尾追加动画规则**

在 `src/styles/global.css` 文件末尾追加以下内容：

```css
/* ====== @keyframes 动画库 ====== */

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

@keyframes rippleEffect {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

/* ====== 路由过渡 ====== */
.route-enter-active {
  animation: fadeIn 0.2s ease-out;
}
.route-leave-active {
  animation: fadeIn 0.15s ease-in reverse;
}

/* ====== 折叠面板过渡（Collection 展开/折叠） ====== */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

/* ====== 淡入过渡 ====== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ====== 动画预设条件规则 ====== */

/* 仅在启用微交互的预设下生效 */
body.theme-micro-on .n-button:not(.n-button--text):hover {
  transform: scale(1.03);
  transition: transform 0.15s ease;
}

body.theme-micro-on .n-button:not(.n-button--text):active {
  transform: scale(0.97);
}

/* 卡片悬浮 */
body.theme-micro-on .n-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--app-shadow-md);
  transition: all 0.2s ease;
}

/* 列表项悬浮滑动 */
body.theme-micro-on .request-item:hover {
  transform: translateX(2px);
}

/* 输入框聚焦光晕增强 */
body.theme-micro-on .n-input--focus {
  box-shadow: 0 0 0 3px var(--app-active-border) !important;
}

/* 涟漪按钮 */
.ripple-btn {
  position: relative;
  overflow: hidden;
}
.ripple-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, transparent 60%);
  transform: scale(0);
  pointer-events: none;
}
.ripple-btn:active::after {
  animation: rippleEffect 0.6s ease-out;
}

/* prefers-reduced-motion 全局降级 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/styles/global.css
git commit -m "feat: add global CSS keyframes, transitions, and micro-interaction rules"
```

---

### Task 9: App.vue 集成粒子背景和路由过渡

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: 修改 App.vue**

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { watch, onMounted, provide, computed } from 'vue'
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import { useThemeStore } from '@/stores/theme'
import { db } from '@/db'
import { computeParticleConfig } from '@/animations/engine'
import ParticleBackground from '@/animations/components/ParticleBackground.vue'

const themeStore = useThemeStore()

function applyTheme() {
  const { cssVars, bodyClass } = themeStore.computedTheme

  for (const [key, value] of Object.entries(cssVars)) {
    document.documentElement.style.setProperty(key, value)
  }

  document.body.className = bodyClass
}

watch(() => themeStore.computedTheme, applyTheme, { immediate: true })

const naiveTheme = computed(() => themeStore.isDark ? darkTheme : null)

// 粒子运行时配置
const particleConfig = computed(() => {
  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue('--app-active-border')
    .trim() || '#4096ff'
  return computeParticleConfig(themeStore.animationPreset, primary)
})

provide('isDark', themeStore.isDark)
provide('themeStore', themeStore)

onMounted(async () => {
  db.seedDefaults()
  await themeStore.loadFromSettings()
  applyTheme()
})
</script>

<template>
  <n-config-provider
    :theme="naiveTheme"
    :theme-overrides="themeStore.computedTheme.naiveOverrides"
  >
    <ParticleBackground
      :config="particleConfig"
      :primary-color="particleConfig.color"
    />
    <n-dialog-provider>
      <n-message-provider>
        <router-view v-slot="{ Component, route: _route }">
          <transition
            :name="themeStore.animationPreset.routeTransition ? 'route' : undefined"
            mode="out-in"
          >
            <component :is="Component" :key="_route.path" />
          </transition>
        </router-view>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/App.vue
git commit -m "feat: integrate ParticleBackground and route transitions in App.vue"
```

---

### Task 10: HomeView 响应面板过渡动画

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: 在 HomeView 中为响应内容添加 Transition**

修改 `src/views/HomeView.vue` 的 `<template>` 部分，将响应内容用 `<Transition>` 包裹：

```vue
<!-- 将响应区替换为： -->
<div class="response-section">
  <div class="section-label">📥 响应</div>
  <div class="response-content">
    <Transition name="slide-up" mode="out-in">
      <ResponseViewer
        v-if="collectionStore.activeResponse"
        :key="collectionStore.activeResponse.timestamp || Date.now()"
        ref="responseViewerRef"
        :model-value="collectionStore.activeResponse"
      />
      <div v-else class="no-response-placeholder">
        <span>发送请求后查看响应</span>
      </div>
    </Transition>
  </div>
</div>
```

在 `<style scoped>` 中追加：

```css
/* 响应区过渡 */
.slide-up-enter-active { animation: slideUp 0.3s ease-out; }
.slide-up-leave-active { animation: fadeIn 0.15s ease-in reverse; }

.no-response-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--app-text-disabled);
  font-size: 14px;
}
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/views/HomeView.vue
git commit -m "feat: add response panel transition animation"
```

---

### Task 11: CollectionItem 折叠过渡增强

**Files:**
- Modify: `src/components/collection/CollectionItem.vue`

- [ ] **Step 1: 将子集合区域用 Transition 包裹**

修改 `CollectionItem.vue` 的 `<template>`，将 `v-if="expanded"` 的 div 包裹在 `<Transition>` 中：

```vue
<template>
  <div class="collection-item">
    <div
      class="collection-header"
      :class="{ 'drag-over': dragOver }"
      :style="{ paddingLeft: `${8 + depth * 16}px` }"
      draggable="true"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <n-button text size="tiny" @click="expanded = !expanded" class="chevron-btn">
        <template #icon><n-icon :class="{ rotated: expanded }" class="chevron"><ChevronForward /></n-icon></template>
      </n-button>
      <n-dropdown trigger="click" :options="contextMenuOptions" @select="handleSelect">
        <span class="collection-name">📁 {{ collection.name }}</span>
      </n-dropdown>
      <n-button text size="tiny" @click="store.createRequest(collection.id!)" class="add-btn">
        <template #icon><n-icon><Add /></n-icon></template>
      </n-button>
    </div>
    <Transition name="collapse">
      <div v-if="expanded" class="collection-children">
        <CollectionItem v-for="child in childCollections" :key="child.id" :collection="child" :depth="depth + 1" />
        <RequestItem v-for="req in childRequests" :key="req.id" :request="req" :depth="depth + 1" />
      </div>
    </Transition>
  </div>
</template>
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/components/collection/CollectionItem.vue
git commit -m "feat: add collapse transition to collection tree items"
```

---

### Task 12: UrlBar 发送按钮涟漪效果

**Files:**
- Modify: `src/components/request/UrlBar.vue`

- [ ] **Step 1: 为发送按钮添加 ripple-btn class**

修改 UrlBar.vue 的 `<template>`，在发送按钮上添加 class：

```vue
<n-button type="primary" :loading="loading" @click="handleSend" class="send-btn ripple-btn">
  <template #icon><n-icon><Play /></n-icon></template>
  发送
</n-button>
```

`ripple-btn` class 已在 Task 8 的 global.css 中定义。

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/components/request/UrlBar.vue
git commit -m "feat: add ripple effect to send button"
```

---

### Task 13: AppTopbar 动画预设快捷切换

**Files:**
- Modify: `src/components/layout/AppTopbar.vue`

- [ ] **Step 1: 在 AppTopbar 中添加动画预设切换按钮**

在暗色模式切换按钮旁边新增一个动画预设循环切换按钮。修改 `src/components/layout/AppTopbar.vue`：

```vue
<script setup lang="ts">
import { NButton, NIcon, NSpace, NText, NDropdown } from 'naive-ui'
import { Settings, Sunny, Moon, Add, ColorWand } from '@vicons/ionicons5'  // 新增 ColorWand
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import EnvSelector from '@/components/environment/EnvSelector.vue'
import { useImportExport } from '@/composables/useImportExport'
import { animationPresetList } from '@/animations/presets'  // 新增

const emit = defineEmits<{ (e: 'new-request'): void }>()

const router = useRouter()
const themeStore = useThemeStore()
const { exportFile, importFile } = useImportExport()

// 动画预设下拉选项
const animOptions = animationPresetList.map(p => ({
  label: `${p.label} ${themeStore.animationPresetName === p.name ? '✓' : ''}`,
  key: p.name
}))

function handleAnimSelect(key: string) {
  themeStore.setAnimationPreset(key)
}

const menuOptions = [
  { label: '📤 导出全部 (JSON)', key: 'export' },
  { label: '📥 导入 (JSON / Postman)', key: 'import' }
]

function handleMenuSelect(key: string) {
  if (key === 'export') exportFile()
  else if (key === 'import') importFile()
}
</script>

<template>
  <div class="app-topbar">
    <div class="topbar-left">
      <n-text strong class="brand-text">API Tool</n-text>
      <n-button size="tiny" type="primary" ghost @click="emit('new-request')">
        <template #icon><n-icon><Add /></n-icon></template>
        新建
      </n-button>
    </div>
    <div class="topbar-center">
      <EnvSelector />
    </div>
    <div class="topbar-right">
      <n-space :size="4" align="center">
        <n-dropdown trigger="click" :options="menuOptions" @select="handleMenuSelect">
          <n-button text size="small">导入/导出</n-button>
        </n-dropdown>
        <n-dropdown trigger="click" :options="animOptions" @select="handleAnimSelect">
          <n-button text size="small">
            <template #icon>
              <n-icon><ColorWand /></n-icon>
            </template>
            {{ themeStore.animationPreset.label }}
          </n-button>
        </n-dropdown>
        <n-button text @click="themeStore.toggleDark()" size="small">
          <template #icon>
            <n-icon><Moon v-if="themeStore.isDark" /><Sunny v-else /></n-icon>
          </template>
        </n-button>
        <n-button text @click="router.push('/settings')" size="small">
          <template #icon><n-icon><Settings /></n-icon></template>
        </n-button>
      </n-space>
    </div>
  </div>
</template>
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/components/layout/AppTopbar.vue
git commit -m "feat: add animation preset quick switch in AppTopbar"
```

---

### Task 14: SettingsView 动画预设选择 UI

**Files:**
- Modify: `src/views/SettingsView.vue`

- [ ] **Step 1: 在 SettingsView 中新增动画预设选择 section**

在「视觉风格」section 之后、「当前主题」section 之前插入动画预设 section。修改 `src/views/SettingsView.vue`：

```vue
<script setup lang="ts">
// 在现有导入中新增：
import { animationPresetList } from '@/animations/presets'  // 新增
</script>
```

在 `<template>` 的视觉风格 section 和当前主题 section 之间插入：

```vue
<n-divider />

<!-- 动画预设 -->
<section class="settings-section">
  <h3>动画效果</h3>
  <p class="section-desc">选择粒子背景和交互动画风格</p>
  <div class="preset-grid">
    <div
      v-for="ap in animationPresetList"
      :key="ap.name"
      class="preset-card anim-card"
      :class="{ active: themeStore.animationPresetName === ap.name }"
      @click="themeStore.setAnimationPreset(ap.name)"
    >
      <div class="anim-preview" :class="`anim-${ap.name}`">
        <div class="anim-icon">
          {{ ap.particleType === 'starfield' ? '✨' : ap.particleType === 'geometry' ? '🔷' : ap.particleType === 'fluid' ? '🌊' : '⚫' }}
        </div>
      </div>
      <span class="preset-name">{{ ap.label }}</span>
      <span class="preset-hint">{{ ap.animationLevel === 'none' ? '无效果' : ap.animationLevel === 'subtle' ? '基础' : ap.animationLevel === 'moderate' ? '中等' : '丰富' }}</span>
    </div>
  </div>
</section>
```

在「当前主题」section 中新增动画信息展示，修改 `current-theme-info` div：

```vue
<div class="current-theme-info">
  <span class="info-chip">🎨 {{ themeStore.colorPreset.label }}</span>
  <span>×</span>
  <span class="info-chip">✨ {{ themeStore.stylePreset.label }}</span>
  <span>×</span>
  <span class="info-chip">🎬 {{ themeStore.animationPreset.label }}</span>
  <span>·</span>
  <span class="info-chip">{{ themeStore.isDark ? '🌙 暗色' : '☀️ 亮色' }}</span>
</div>
```

在 `<style scoped>` 中追加：

```css
/* ====== Animation Preset Cards ====== */
.anim-card {
  min-height: 100px;
}

.anim-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--app-radius-md);
  background: var(--app-surface-bg);
  border: 1px solid var(--app-border-light);
}

.anim-icon {
  font-size: 24px;
}

.preset-hint {
  font-size: 10px;
  color: var(--app-text-disabled);
}
```

- [ ] **Step 2: 验证编译**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/views/SettingsView.vue
git commit -m "feat: add animation preset selection UI in SettingsView"
```

---

### Task 15: 端到端验证和修复

**Files:** 全部已修改文件

- [ ] **Step 1: 完整 TypeScript 类型检查**

```bash
npx vue-tsc --noEmit
```

- [ ] **Step 2: 运行现有测试确保无回归**

```bash
npm test
```

- [ ] **Step 3: Vite 构建验证**

```bash
npm run build
```

- [ ] **Step 4: 开发服务器手动验证**

```bash
npm run dev
```

在浏览器中验证以下场景：
1. **粒子背景** — 切换 4 个动画预设，确认 canvas 正确渲染/隐藏
2. **明暗切换** — 切换亮色/暗色，粒子颜色跟随变化
3. **微交互** — hover 按钮和卡片有缩放/阴影效果，发送按钮有点击涟漪
4. **路由过渡** — 切换到 /settings 再返回，fade 过渡生效
5. **集合折叠** — 展开/折叠集合树有平滑高度变化
6. **持久化** — 刷新页面后动画预设保持不变
7. **reduced-motion** — 在系统设置中开启减少动画，确认所有动画停止

- [ ] **Step 5: 最终提交（如有修复）**

```bash
git add -A
git commit -m "fix: final adjustments for animation and particle system"
```
