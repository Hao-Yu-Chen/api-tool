// ============================================================
// Design Token 类型定义 — 多主题系统核心接口
// ============================================================

import type { AnimationPreset } from '@/animations/tokens'

export type ThemeMode = 'dark' | 'light'

// ====== Color Tokens (40 个) ======
export interface ColorTokens {
  // Brand / Accent
  primary: string
  primaryHover: string
  primaryPressed: string
  accent: string
  accentHover: string
  accentPressed: string

  // Surface (背景层级递增)
  bgBase: string
  bgElevated: string
  bgOverlay: string
  sidebarBg: string
  surface1: string
  surface2: string
  surface3: string
  surfaceCard: string

  // Text
  textPrimary: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  textInverse: string

  // Border
  borderStrong: string
  borderDefault: string
  borderSubtle: string

  // Semantic (语义色)
  success: string
  warning: string
  error: string
  info: string
  successBg: string
  warningBg: string
  errorBg: string
  infoBg: string

  // Link / Overlay
  link: string
  linkHover: string
  hoverOverlay: string
  activeOverlay: string

  // JSON Syntax Highlight
  jsonKey: string
  jsonString: string
  jsonNumber: string
  jsonBoolean: string
  jsonNull: string
  jsonBracket: string
}

// ====== Style Tokens (12 个) ======
export interface StyleTokens {
  radiusSm: string
  radiusMd: string
  radiusLg: string
  shadowSm: string
  shadowMd: string
  shadowLg: string
  shadowGlow: string
  blurAmount: string
  glassOpacity: number
  density: 'compact' | 'comfortable'
  gapSize: string
  borderWidth: string
}

// ====== 预设定义 ======
export interface ColorPreset {
  name: string
  label: string
  dark: ColorTokens
  light: ColorTokens
}

export interface StylePreset {
  name: string
  label: string
  tokens: StyleTokens
}

// ====== 引擎输出 ======
export interface ComputedTheme {
  cssVars: Record<string, string>
  bodyClass: string
  naiveOverrides: Record<string, unknown>
  animation: AnimationPreset  // 新增
}
