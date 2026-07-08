// src/animations/presets/cyberpunk.ts
import type { AnimationPreset } from '@/animations/tokens'

const cyberpunk: AnimationPreset = {
  name: 'cyberpunk',
  label: '矩阵',
  particleType: 'matrix',
  animationLevel: 'energetic',
  particleColorSource: 'mixed',
  particleDensity: 1.2,
  routeTransition: true,
  panelTransition: true,
  microInteractions: true,
  mouseTrail: true
}

export default cyberpunk
