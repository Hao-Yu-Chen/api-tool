import type { ColorPreset, StylePreset } from '@/themes/tokens'
import nord from './colors/nord'
import dracula from './colors/dracula'
import oneDark from './colors/one-dark'
import github from './colors/github'
import monokai from './colors/monokai'
import minimal from './styles/minimal'
import glass from './styles/glass'
import cyber from './styles/cyber'
import tool from './styles/tool'

export const colorPresets: Record<string, ColorPreset> = {
  nord, dracula, 'one-dark': oneDark, github, monokai
}

export const stylePresets: Record<string, StylePreset> = {
  minimal, glass, cyber, tool
}

export const colorPresetList = Object.values(colorPresets)
export const stylePresetList = Object.values(stylePresets)
