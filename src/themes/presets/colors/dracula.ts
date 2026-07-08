import type { ColorPreset } from '@/themes/tokens'

const dracula: ColorPreset = {
  name: 'dracula',
  label: 'Dracula',
  dark: {
    primary: '#BD93F9', primaryHover: '#CA9EFF', primaryPressed: '#AD7BE8',
    accent: '#FF79C6', accentHover: '#FF92D0', accentPressed: '#E868B0',
    bgBase: '#282A36', bgElevated: '#343746', bgOverlay: '#44475A',
    sidebarBg: '#21222C',
    surface1: '#343746', surface2: '#44475A', surface3: '#555775',
    surfaceCard: '#343746',
    textPrimary: '#F8F8F2', textSecondary: '#CDCDBF', textTertiary: '#6272A4',
    textDisabled: '#555775', textInverse: '#282A36',
    borderStrong: '#555775', borderDefault: '#44475A', borderSubtle: '#343746',
    success: '#50FA7B', warning: '#F1FA8C', error: '#FF5555', info: '#8BE9FD',
    successBg: 'rgba(80,250,123,0.12)', warningBg: 'rgba(241,250,140,0.12)',
    errorBg: 'rgba(255,85,85,0.12)', infoBg: 'rgba(139,233,253,0.12)',
    link: '#8BE9FD', linkHover: '#A4F0FF',
    hoverOverlay: 'rgba(255,255,255,0.04)', activeOverlay: 'rgba(189,147,249,0.15)',
    jsonKey: '#FF79C6', jsonString: '#50FA7B', jsonNumber: '#FFB86C',
    jsonBoolean: '#BD93F9', jsonNull: '#FF5555', jsonBracket: '#F8F8F2'
  },
  light: {
    primary: '#7B3FA3', primaryHover: '#8E4DB5', primaryPressed: '#69328F',
    accent: '#D63384', accentHover: '#E04D95', accentPressed: '#BF2B74',
    bgBase: '#F8F8F2', bgElevated: '#F0F0EA', bgOverlay: '#E8E8E0',
    sidebarBg: '#F0F0EA',
    surface1: '#FFFFFF', surface2: '#F5F5F0', surface3: '#F0F0EA',
    surfaceCard: '#FFFFFF',
    textPrimary: '#282A36', textSecondary: '#4A4D5E', textTertiary: '#6272A4',
    textDisabled: '#A0A5B8', textInverse: '#F8F8F2',
    borderStrong: '#C8C8C0', borderDefault: '#D8D8D0', borderSubtle: '#E8E8E0',
    success: '#3DA65D', warning: '#A8990B', error: '#D93025', info: '#3B7FAD',
    successBg: 'rgba(61,166,93,0.1)', warningBg: 'rgba(168,153,11,0.1)',
    errorBg: 'rgba(217,48,37,0.1)', infoBg: 'rgba(59,127,173,0.1)',
    link: '#7B3FA3', linkHover: '#8E4DB5',
    hoverOverlay: 'rgba(0,0,0,0.03)', activeOverlay: 'rgba(123,63,163,0.1)',
    jsonKey: '#D63384', jsonString: '#3DA65D', jsonNumber: '#D47E16',
    jsonBoolean: '#7B3FA3', jsonNull: '#D93025', jsonBracket: '#282A36'
  }
}

export default dracula
