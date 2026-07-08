import type { ColorTokens, StyleTokens, ComputedTheme, ThemeMode } from './tokens'
import type { AnimationPreset } from '@/animations/tokens'

/**
 * 核心计算引擎：ColorTokens × StyleTokens → ComputedTheme
 * 返回 CSS 变量集合、body class、Naive UI 覆盖配置
 */
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

// ====== CSS 变量生成 ======

function buildCssVars(c: ColorTokens, s: StyleTokens, mode: ThemeMode): Record<string, string> {
  const isGlass = s.glassOpacity > 0
  const isCyber = s.shadowGlow !== 'none'

  const vars: Record<string, string> = {
    // 背景层级
    '--app-bg': c.bgBase,
    '--app-sidebar-bg': c.sidebarBg,
    '--app-topbar-bg': c.bgElevated,
    '--app-main-bg': c.bgBase,
    '--app-panel-bg': isGlass
      ? rgbaMix(c.surface1, s.glassOpacity)
      : c.surface1,
    '--app-surface-bg': c.surface2,
    '--app-card-bg': c.surfaceCard,
    '--app-hover-bg': c.hoverOverlay,
    '--app-active-bg': c.activeOverlay,
    '--app-active-border': isCyber
      ? glowBorder(c.primary)
      : `${c.primary}44`,

    // 边框
    '--app-border': c.borderDefault,
    '--app-border-light': c.borderSubtle,
    '--app-border-subtle': c.borderSubtle,
    '--app-guide-line': c.borderSubtle,

    // 文本
    '--app-text': c.textPrimary,
    '--app-text-secondary': c.textSecondary,
    '--app-text-disabled': c.textDisabled,
    '--app-text-muted': c.textTertiary,
    '--app-bg-color': c.bgBase,

    // JSON 语法高亮
    '--json-key-color': c.jsonKey,
    '--json-string-color': c.jsonString,
    '--json-number-color': c.jsonNumber,
    '--json-boolean-color': c.jsonBoolean,
    '--json-null-color': c.jsonNull,
    '--json-bracket-color': c.jsonBracket,

    // 风格 Token
    '--app-radius-sm': s.radiusSm,
    '--app-radius-md': s.radiusMd,
    '--app-radius-lg': s.radiusLg,
    '--app-shadow-sm': s.shadowSm,
    '--app-shadow-md': s.shadowMd,
    '--app-shadow-lg': s.shadowLg,
    '--app-blur': s.blurAmount,
    '--app-gap': s.gapSize,
    '--app-border-width': s.borderWidth,

    // 玻璃态
    '--app-glass-opacity': String(s.glassOpacity),

    // 暗色模式标志
    '--app-is-dark': mode === 'dark' ? '1' : '0',
  }

  if (isCyber) {
    vars['--theme-glow'] = `${c.primary}66`
  }

  return vars
}

// ====== Body class ======

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

// ====== Naive UI 覆盖 ======

function buildNaiveOverrides(c: ColorTokens, s: StyleTokens): Record<string, unknown> {
  return {
    common: {
      primaryColor: c.primary,
      primaryColorHover: c.primaryHover,
      primaryColorPressed: c.primaryPressed,
      primaryColorSuppl: c.accent,
      infoColor: c.info,
      infoColorHover: c.info,
      infoColorPressed: c.info,
      successColor: c.success,
      successColorHover: c.success,
      successColorPressed: c.success,
      warningColor: c.warning,
      warningColorHover: c.warning,
      warningColorPressed: c.warning,
      errorColor: c.error,
      errorColorHover: c.error,
      errorColorPressed: c.error,
      textColorBase: c.textPrimary,
      textColor1: c.textPrimary,
      textColor2: c.textSecondary,
      textColor3: c.textDisabled,
      placeholderColor: c.textDisabled,
      placeholderColorDisabled: c.textTertiary,
      borderColor: c.borderDefault,
      dividerColor: c.borderSubtle,
      borderRadius: s.radiusSm,
      borderRadiusSmall: s.radiusSm,
      fontSizeSmall: s.density === 'compact' ? '12px' : '13px',
      fontSizeMedium: s.density === 'compact' ? '13px' : '14px',
      fontSizeLarge: s.density === 'compact' ? '14px' : '15px',
      heightSmall: s.density === 'compact' ? '28px' : '30px',
      heightMedium: s.density === 'compact' ? '32px' : '34px',
      heightLarge: s.density === 'compact' ? '36px' : '40px',
      inputColor: c.surface1,
      bodyColor: c.bgBase,
      cardColor: c.surfaceCard,
      modalColor: c.surface1,
      popoverColor: c.surface1,
      tableColor: c.surface1,
      actionColor: c.hoverOverlay,
      hoverColor: c.hoverOverlay,
      closeColorHover: c.textSecondary,
      closeColorPressed: c.textPrimary,
      baseColor: c.textPrimary,
    },
    Button: {
      borderRadiusSmall: s.radiusSm,
      borderRadiusMedium: s.radiusSm,
      borderRadiusLarge: s.radiusMd,
    },
    Input: {
      borderRadius: s.radiusSm,
      border: `1px solid ${c.borderDefault}`,
      borderHover: `1px solid ${c.primary}`,
      borderFocus: `1px solid ${c.primary}`,
      boxShadowFocus: `0 0 0 2px ${c.primary}22`,
    },
    Card: {
      borderRadius: s.radiusMd,
      borderColor: c.borderSubtle,
    },
    Modal: {
      borderRadius: s.radiusLg,
    },
    Dialog: {
      borderRadius: s.radiusLg,
    },
  }
}

// ====== 工具函数 ======

/** 将 hex 或 rgb 转换为 rgba 字符串，透明度叠加 */
function rgbaMix(hex: string, opacity: number): string {
  if (hex.startsWith('rgba')) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${(opacity * 0.7 + 0.3).toFixed(2)})`
}

/** 赛博发光边框 */
function glowBorder(color: string): string {
  return `${color}99`
}
