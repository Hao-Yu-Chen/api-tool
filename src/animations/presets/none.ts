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
  microInteractions: false,
  mouseTrail: false
}

export default none
