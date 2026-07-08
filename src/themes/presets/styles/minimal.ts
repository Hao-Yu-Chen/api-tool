import type { StylePreset } from '@/themes/tokens'

const minimal: StylePreset = {
  name: 'minimal',
  label: '极简',
  tokens: {
    radiusSm: '4px', radiusMd: '6px', radiusLg: '8px',
    shadowSm: 'none', shadowMd: 'none', shadowLg: 'none',
    shadowGlow: 'none',
    blurAmount: '0px', glassOpacity: 0,
    density: 'comfortable', gapSize: '8px',
    borderWidth: '1px'
  }
}

export default minimal
