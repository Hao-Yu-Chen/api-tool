import type { ColorPreset } from '@/themes/tokens'

const nord: ColorPreset = {
  name: 'nord',
  label: 'Nord',
  dark: {
    primary: '#88C0D0', primaryHover: '#8FBCBB', primaryPressed: '#81A1C1',
    accent: '#5E81AC', accentHover: '#81A1C1', accentPressed: '#88C0D0',
    bgBase: '#2E3440', bgElevated: '#3B4252', bgOverlay: '#434C5E',
    sidebarBg: '#2A303C',
    surface1: '#3B4252', surface2: '#434C5E', surface3: '#4C566A',
    surfaceCard: '#3B4252',
    textPrimary: '#ECEFF4', textSecondary: '#D8DEE9', textTertiary: '#81A1C1',
    textDisabled: '#616E88', textInverse: '#2E3440',
    borderStrong: '#4C566A', borderDefault: '#434C5E', borderSubtle: '#3B4252',
    success: '#A3BE8C', warning: '#EBCB8B', error: '#BF616A', info: '#81A1C1',
    successBg: 'rgba(163,190,140,0.12)', warningBg: 'rgba(235,203,139,0.12)',
    errorBg: 'rgba(191,97,106,0.12)', infoBg: 'rgba(129,161,193,0.12)',
    link: '#88C0D0', linkHover: '#8FBCBB',
    hoverOverlay: 'rgba(255,255,255,0.04)', activeOverlay: 'rgba(136,192,208,0.15)',
    jsonKey: '#E06C75', jsonString: '#A3BE8C', jsonNumber: '#D19A66',
    jsonBoolean: '#81A1C1', jsonNull: '#B48EAD', jsonBracket: '#D8DEE9'
  },
  light: {
    primary: '#3B6E8C', primaryHover: '#4C7FA0', primaryPressed: '#2E5A75',
    accent: '#5E81AC', accentHover: '#81A1C1', accentPressed: '#4C6D9A',
    bgBase: '#ECEFF4', bgElevated: '#E5E9F0', bgOverlay: '#D8DEE9',
    sidebarBg: '#E5E9F0',
    surface1: '#FFFFFF', surface2: '#F5F7FA', surface3: '#ECEFF4',
    surfaceCard: '#FFFFFF',
    textPrimary: '#2E3440', textSecondary: '#4C566A', textTertiary: '#616E88',
    textDisabled: '#9CA3B0', textInverse: '#ECEFF4',
    borderStrong: '#C0C8D4', borderDefault: '#D8DEE9', borderSubtle: '#E5E9F0',
    success: '#6B8F5E', warning: '#C0964A', error: '#BF616A', info: '#3B6E8C',
    successBg: 'rgba(107,143,94,0.1)', warningBg: 'rgba(192,150,74,0.1)',
    errorBg: 'rgba(191,97,106,0.1)', infoBg: 'rgba(59,110,140,0.1)',
    link: '#3B6E8C', linkHover: '#4C7FA0',
    hoverOverlay: 'rgba(0,0,0,0.03)', activeOverlay: 'rgba(59,110,140,0.1)',
    jsonKey: '#A626A4', jsonString: '#50A14F', jsonNumber: '#986801',
    jsonBoolean: '#0184BC', jsonNull: '#A626A4', jsonBracket: '#383A42'
  }
}

export default nord
