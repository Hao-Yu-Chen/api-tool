import type { ColorPreset } from '@/themes/tokens'

const github: ColorPreset = {
  name: 'github',
  label: 'GitHub',
  dark: {
    primary: '#58A6FF', primaryHover: '#79C0FF', primaryPressed: '#388BFD',
    accent: '#F78166', accentHover: '#F99B80', accentPressed: '#E06850',
    bgBase: '#0D1117', bgElevated: '#161B22', bgOverlay: '#21262D',
    sidebarBg: '#0A0E14',
    surface1: '#161B22', surface2: '#21262D', surface3: '#30363D',
    surfaceCard: '#161B22',
    textPrimary: '#C9D1D9', textSecondary: '#8B949E', textTertiary: '#6E7681',
    textDisabled: '#484F58', textInverse: '#0D1117',
    borderStrong: '#30363D', borderDefault: '#21262D', borderSubtle: '#161B22',
    success: '#3FB950', warning: '#D29922', error: '#F85149', info: '#58A6FF',
    successBg: 'rgba(63,185,80,0.12)', warningBg: 'rgba(210,153,34,0.12)',
    errorBg: 'rgba(248,81,73,0.12)', infoBg: 'rgba(88,166,255,0.12)',
    link: '#58A6FF', linkHover: '#79C0FF',
    hoverOverlay: 'rgba(255,255,255,0.04)', activeOverlay: 'rgba(88,166,255,0.15)',
    jsonKey: '#FF7B72', jsonString: '#7EE787', jsonNumber: '#FFA657',
    jsonBoolean: '#79C0FF', jsonNull: '#D2A8FF', jsonBracket: '#C9D1D9'
  },
  light: {
    primary: '#0969DA', primaryHover: '#1A7DE8', primaryPressed: '#0558B8',
    accent: '#CF222E', accentHover: '#DA3642', accentPressed: '#B31D28',
    bgBase: '#FFFFFF', bgElevated: '#F6F8FA', bgOverlay: '#EBEDF0',
    sidebarBg: '#F6F8FA',
    surface1: '#FFFFFF', surface2: '#F6F8FA', surface3: '#EBEDF0',
    surfaceCard: '#FFFFFF',
    textPrimary: '#24292F', textSecondary: '#57606A', textTertiary: '#8B949E',
    textDisabled: '#AFB8C1', textInverse: '#FFFFFF',
    borderStrong: '#D0D7DE', borderDefault: '#D8DEE4', borderSubtle: '#EBEDF0',
    success: '#1A7F37', warning: '#9A6700', error: '#CF222E', info: '#0969DA',
    successBg: 'rgba(26,127,55,0.1)', warningBg: 'rgba(154,103,0,0.1)',
    errorBg: 'rgba(207,34,46,0.1)', infoBg: 'rgba(9,105,218,0.1)',
    link: '#0969DA', linkHover: '#1A7DE8',
    hoverOverlay: 'rgba(0,0,0,0.03)', activeOverlay: 'rgba(9,105,218,0.1)',
    jsonKey: '#CF222E', jsonString: '#1A7F37', jsonNumber: '#9A6700',
    jsonBoolean: '#0550AE', jsonNull: '#8250DF', jsonBracket: '#24292F'
  }
}

export default github
