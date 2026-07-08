// src/animations/presets/subtle.ts
import type { AnimationPreset } from '@/animations/tokens'

const subtle: AnimationPreset = {
  name: 'subtle',
  label: '微光',
  particleType: 'constellation',
  animationLevel: 'subtle',
  particleColorSource: 'primary',
  particleDensity: 1.0,
  routeTransition: false,
  panelTransition: true,
  microInteractions: true,
  mouseTrail: true
}

export default subtle
