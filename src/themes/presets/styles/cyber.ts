import type { StylePreset } from '@/themes/tokens'

const cyber: StylePreset = {
  name: 'cyber',
  label: '赛博',
  tokens: {
    radiusSm: '2px', radiusMd: '3px', radiusLg: '4px',
    shadowSm: 'none', shadowMd: 'none', shadowLg: 'none',
    shadowGlow: '0 0 8px var(--theme-glow, currentColor), 0 0 20px var(--theme-glow, currentColor)',
    blurAmount: '0px', glassOpacity: 0,
    density: 'comfortable', gapSize: '6px',
    borderWidth: '2px'
  }
}

export default cyber
