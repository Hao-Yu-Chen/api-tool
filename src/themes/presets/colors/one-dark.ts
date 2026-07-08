import type { ColorPreset } from '@/themes/tokens'

const oneDark: ColorPreset = {
  name: 'one-dark',
  label: 'One Dark',
  dark: {
    primary: '#61AFEF', primaryHover: '#7EC0F2', primaryPressed: '#4D9DE0',
    accent: '#E5C07B', accentHover: '#ECCB8D', accentPressed: '#D4B069',
    bgBase: '#282C34', bgElevated: '#333842', bgOverlay: '#3E4452',
    sidebarBg: '#21252B',
    surface1: '#333842', surface2: '#3E4452', surface3: '#4B5363',
    surfaceCard: '#333842',
    textPrimary: '#ABB2BF', textSecondary: '#8B92A0', textTertiary: '#5C6370',
    textDisabled: '#4B5363', textInverse: '#282C34',
    borderStrong: '#4B5363', borderDefault: '#3E4452', borderSubtle: '#333842',
    success: '#98C379', warning: '#E5C07B', error: '#E06C75', info: '#61AFEF',
    successBg: 'rgba(152,195,121,0.12)', warningBg: 'rgba(229,192,123,0.12)',
    errorBg: 'rgba(224,108,117,0.12)', infoBg: 'rgba(97,175,239,0.12)',
    link: '#61AFEF', linkHover: '#7EC0F2',
    hoverOverlay: 'rgba(255,255,255,0.04)', activeOverlay: 'rgba(97,175,239,0.15)',
    jsonKey: '#E06C75', jsonString: '#98C379', jsonNumber: '#D19A66',
    jsonBoolean: '#56B6C2', jsonNull: '#C678DD', jsonBracket: '#ABB2BF'
  },
  light: {
    primary: '#4078F2', primaryHover: '#5C8DF5', primaryPressed: '#3060D0',
    accent: '#C7993B', accentHover: '#D4A94F', accentPressed: '#B08930',
    bgBase: '#FAFAFA', bgElevated: '#F0F0F0', bgOverlay: '#E8E8E8',
    sidebarBg: '#F0F0F0',
    surface1: '#FFFFFF', surface2: '#F5F5F5', surface3: '#F0F0F0',
    surfaceCard: '#FFFFFF',
    textPrimary: '#383A42', textSecondary: '#636771', textTertiary: '#9295A0',
    textDisabled: '#B0B3BA', textInverse: '#FAFAFA',
    borderStrong: '#C8C8C8', borderDefault: '#D8D8D8', borderSubtle: '#E8E8E8',
    success: '#50A14F', warning: '#C7993B', error: '#D93025', info: '#4078F2',
    successBg: 'rgba(80,161,79,0.1)', warningBg: 'rgba(199,153,59,0.1)',
    errorBg: 'rgba(217,48,37,0.1)', infoBg: 'rgba(64,120,242,0.1)',
    link: '#4078F2', linkHover: '#5C8DF5',
    hoverOverlay: 'rgba(0,0,0,0.03)', activeOverlay: 'rgba(64,120,242,0.1)',
    jsonKey: '#A626A4', jsonString: '#50A14F', jsonNumber: '#986801',
    jsonBoolean: '#0184BC', jsonNull: '#A626A4', jsonBracket: '#383A42'
  }
}

export default oneDark
