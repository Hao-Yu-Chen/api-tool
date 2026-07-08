import type { ColorPreset } from '@/themes/tokens'

const monokai: ColorPreset = {
  name: 'monokai',
  label: 'Monokai',
  dark: {
    primary: '#A6E22E', primaryHover: '#B8F040', primaryPressed: '#8FC720',
    accent: '#F92672', accentHover: '#FB4888', accentPressed: '#E0155F',
    bgBase: '#272822', bgElevated: '#35372D', bgOverlay: '#49483E',
    sidebarBg: '#1E1F1A',
    surface1: '#35372D', surface2: '#49483E', surface3: '#5C5A4E',
    surfaceCard: '#35372D',
    textPrimary: '#F8F8F2', textSecondary: '#CFCFC0', textTertiary: '#75715E',
    textDisabled: '#5C5A4E', textInverse: '#272822',
    borderStrong: '#5C5A4E', borderDefault: '#49483E', borderSubtle: '#35372D',
    success: '#A6E22E', warning: '#E6DB74', error: '#F92672', info: '#66D9EF',
    successBg: 'rgba(166,226,46,0.12)', warningBg: 'rgba(230,219,116,0.12)',
    errorBg: 'rgba(249,38,114,0.12)', infoBg: 'rgba(102,217,239,0.12)',
    link: '#66D9EF', linkHover: '#82E4F2',
    hoverOverlay: 'rgba(255,255,255,0.04)', activeOverlay: 'rgba(166,226,46,0.15)',
    jsonKey: '#F92672', jsonString: '#A6E22E', jsonNumber: '#AE81FF',
    jsonBoolean: '#66D9EF', jsonNull: '#AE81FF', jsonBracket: '#F8F8F2'
  },
  light: {
    primary: '#6A9A1A', primaryHover: '#7DB828', primaryPressed: '#548010',
    accent: '#D91A5A', accentHover: '#E83A6E', accentPressed: '#C01048',
    bgBase: '#F8F8F2', bgElevated: '#EEEEE8', bgOverlay: '#E6E6DE',
    sidebarBg: '#EEEEE8',
    surface1: '#FFFFFF', surface2: '#F5F5F0', surface3: '#EEEEE8',
    surfaceCard: '#FFFFFF',
    textPrimary: '#272822', textSecondary: '#555750', textTertiary: '#75715E',
    textDisabled: '#A0A090', textInverse: '#F8F8F2',
    borderStrong: '#C0C0B8', borderDefault: '#D0D0C8', borderSubtle: '#E6E6DE',
    success: '#6A9A1A', warning: '#B8A40A', error: '#D91A5A', info: '#3B95A8',
    successBg: 'rgba(106,154,26,0.1)', warningBg: 'rgba(184,164,10,0.1)',
    errorBg: 'rgba(217,26,90,0.1)', infoBg: 'rgba(59,149,168,0.1)',
    link: '#3B95A8', linkHover: '#4DACBE',
    hoverOverlay: 'rgba(0,0,0,0.03)', activeOverlay: 'rgba(106,154,26,0.1)',
    jsonKey: '#D91A5A', jsonString: '#6A9A1A', jsonNumber: '#8B5CF6',
    jsonBoolean: '#3B95A8', jsonNull: '#8B5CF6', jsonBracket: '#272822'
  }
}

export default monokai
