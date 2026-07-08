// src/animations/tokens.ts

/** 粒子背景类型 */
export type ParticleType = 'constellation' | 'aurora' | 'matrix' | 'none'

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
  /** 是否启用鼠标跟随拖尾（可独立开关） */
  mouseTrail: boolean
}
