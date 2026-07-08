import type { StylePreset } from '@/themes/tokens'

const tool: StylePreset = {
  name: 'tool',
  label: '工具风',
  tokens: {
    radiusSm: '5px', radiusMd: '8px', radiusLg: '10px',
    shadowSm: '0 1px 3px rgba(0,0,0,0.06)', shadowMd: '0 2px 8px rgba(0,0,0,0.08)', shadowLg: '0 4px 16px rgba(0,0,0,0.1)',
    shadowGlow: 'none',
    blurAmount: '0px', glassOpacity: 0,
    density: 'compact', gapSize: '4px',
    borderWidth: '1px'
  }
}

export default tool
