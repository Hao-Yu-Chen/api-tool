// src/animations/presets/fluid.ts
import type { AnimationPreset } from '@/animations/tokens'

const fluid: AnimationPreset = {
  name: 'fluid',
  label: '极光',
  particleType: 'aurora',
  animationLevel: 'moderate',
  particleColorSource: 'mixed',
  particleDensity: 1.0,
  routeTransition: true,
  panelTransition: true,
  microInteractions: true,
  mouseTrail: true
}

export default fluid
