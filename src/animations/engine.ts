// src/animations/engine.ts
import type { AnimationPreset } from './tokens'

/** 粒子系统运行时配置（由引擎从 AnimationPreset 计算得出） */
export interface ParticleConfig {
  enabled: boolean
  type: 'constellation' | 'aurora' | 'matrix' | 'sakura' | 'none'
  color: string
  accentColor: string
  density: number
  maxParticles: number
  mouseTrail: boolean
}

const PARTICLE_COUNTS: Record<string, number> = {
  constellation: 150,
  aurora: 3,
  matrix: 50,
  sakura: 40,
  none: 0
}

/**
 * 从动画预设和主题色计算粒子运行时配置
 */
export function computeParticleConfig(
  preset: AnimationPreset,
  primaryColor: string
): ParticleConfig {
  // Normalize to 6-char hex: particle drawing code appends alpha via `${color}xx`
  const color = normalizeHex(primaryColor)
  const accentColor = preset.particleColorSource === 'mixed'
    ? shiftHue(color, 30)
    : color

  return {
    enabled: preset.particleType !== 'none',
    type: preset.particleType,
    color,
    accentColor,
    density: preset.particleDensity,
    maxParticles: Math.floor(PARTICLE_COUNTS[preset.particleType] * preset.particleDensity),
    mouseTrail: preset.mouseTrail
  }
}

/** Strip alpha channel from hex — returns clean #RRGGBB */
function normalizeHex(hex: string): string {
  if (!hex || !hex.startsWith('#')) return hex
  // #RGB → #RRGGBB, #RRGGBB → keep, #RRGGBBAA → #RRGGBB
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  if (hex.length >= 7) return hex.slice(0, 7)
  return hex
}

/** Simple hue shift via RGB offset (used for mixed-mode accent colors) */
function shiftHue(hex: string, amount: number): string {
  const clean = normalizeHex(hex)
  const r = parseInt(clean.slice(1, 3), 16)
  const g = parseInt(clean.slice(3, 5), 16)
  const b = parseInt(clean.slice(5, 7), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) return clean

  const nr = Math.min(255, Math.max(0, r + amount))
  const ng = Math.min(255, Math.max(0, g + Math.floor(amount * 0.5)))
  const nb = Math.min(255, Math.max(0, b - Math.floor(amount * 0.3)))

  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`
}
