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
