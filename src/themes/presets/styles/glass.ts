import type { StylePreset } from '@/themes/tokens'

const glass: StylePreset = {
  name: 'glass',
  label: '玻璃',
  tokens: {
    radiusSm: '10px', radiusMd: '14px', radiusLg: '18px',
    shadowSm: '0 4px 12px rgba(0,0,0,0.08)', shadowMd: '0 8px 24px rgba(0,0,0,0.12)', shadowLg: '0 16px 40px rgba(0,0,0,0.16)',
    shadowGlow: '0 0 20px rgba(255,255,255,0.05)',
    blurAmount: '12px', glassOpacity: 0.65,
    density: 'comfortable', gapSize: '12px',
    borderWidth: '1px'
  }
}

export default glass
