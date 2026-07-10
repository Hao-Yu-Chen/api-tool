// src/animations/presets/fluid.ts
import type { AnimationPreset } from '@/animations/tokens'

const fluid: AnimationPreset = {
  name: 'fluid',
  label: '樱花',
  particleType: 'sakura',
  animationLevel: 'moderate',
  particleColorSource: 'mixed',
  particleDensity: 1.0,
  routeTransition: true,
  panelTransition: true,
  microInteractions: true,
  mouseTrail: true
}

export default fluid
