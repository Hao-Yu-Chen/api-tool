import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { db } from '@/db'
import { computeTheme } from '@/themes/engine'
import { colorPresets, stylePresets } from '@/themes/presets'
import { animationPresets } from '@/animations/presets'
import type { ColorPreset, StylePreset, ThemeMode, ComputedTheme } from '@/themes/tokens'

const DEFAULT_COLOR = 'one-dark'
const DEFAULT_STYLE = 'minimal'
const DEFAULT_ANIMATION = 'subtle'

export const useThemeStore = defineStore('theme', () => {
  // ====== State ======
  const colorPresetName = ref(DEFAULT_COLOR)
  const stylePresetName = ref(DEFAULT_STYLE)
  const animationPresetName = ref(DEFAULT_ANIMATION)
  const isDark = ref(true)
  const initialized = ref(false)

  // 动画控制：桌面应用默认不禁用动画，浏览器环境尊重 OS 设置
  const reduceMotion = ref(false)

  // 鼠标跟随拖尾：独立开关，默认跟随预设值
  const mouseTrail = ref(true)

  // ====== Getters ======
  const colorPreset = computed<ColorPreset>(() =>
    colorPresets[colorPresetName.value] || colorPresets[DEFAULT_COLOR]
  )
  const stylePreset = computed<StylePreset>(() =>
    stylePresets[stylePresetName.value] || stylePresets[DEFAULT_STYLE]
  )
  const animationPreset = computed(() =>
    animationPresets[animationPresetName.value] || animationPresets[DEFAULT_ANIMATION]
  )
  const mode = computed<ThemeMode>(() => isDark.value ? 'dark' : 'light')

  const computedTheme = computed<ComputedTheme>(() =>
    computeTheme(
      mode.value === 'dark' ? colorPreset.value.dark : colorPreset.value.light,
      stylePreset.value.tokens,
      stylePreset.value.name,
      mode.value,
      animationPreset.value
    )
  )

  // ====== Actions ======

  async function loadFromSettings(): Promise<void> {
    try {
      const settings = await db.settings.toCollection().first()
      if (settings) {
        if (typeof settings.themeColor === 'string') colorPresetName.value = settings.themeColor
        if (typeof settings.themeStyle === 'string') stylePresetName.value = settings.themeStyle
        if (typeof settings.themeDark === 'boolean') isDark.value = settings.themeDark
        if (typeof settings.themeAnimation === 'string') animationPresetName.value = settings.themeAnimation
        if (typeof settings.themeReduceMotion === 'boolean') reduceMotion.value = settings.themeReduceMotion
        if (typeof settings.themeMouseTrail === 'boolean') mouseTrail.value = settings.themeMouseTrail
      }
      // 首次初始化：Electron 中忽略 OS 的 reduced-motion 设置
      if (!settings?.themeReduceMotion) {
        if (window.electronAPI?.isElectron) {
          reduceMotion.value = false
        } else {
          reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        }
      }
      initialized.value = true
    } catch {
      initialized.value = true
    }
  }

  async function saveToSettings(): Promise<void> {
    try {
      const settings = await db.settings.toCollection().first()
      if (settings?.id) {
        await db.settings.update(settings.id, {
          themeColor: colorPresetName.value,
          themeStyle: stylePresetName.value,
          themeDark: isDark.value,
          themeAnimation: animationPresetName.value,
          themeReduceMotion: reduceMotion.value,
          themeMouseTrail: mouseTrail.value
        })
      }
    } catch (err) {
      console.error('[themeStore] saveToSettings error:', err)
    }
  }

  // Debounce persistence on changes
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch([colorPresetName, stylePresetName, isDark, animationPresetName, reduceMotion, mouseTrail], () => {
    if (!initialized.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => saveToSettings(), 300)
  })

  function setColorPreset(name: string) {
    if (colorPresets[name]) colorPresetName.value = name
  }

  function setStylePreset(name: string) {
    if (stylePresets[name]) stylePresetName.value = name
  }

  function setAnimationPreset(name: string) {
    if (animationPresets[name]) animationPresetName.value = name
  }

  function toggleDark() {
    isDark.value = !isDark.value
  }

  function setReduceMotion(val: boolean) {
    reduceMotion.value = val
  }

  function setMouseTrail(val: boolean) {
    mouseTrail.value = val
  }

  return {
    colorPresetName, stylePresetName, animationPresetName, isDark, reduceMotion, mouseTrail, initialized,
    colorPreset, stylePreset, animationPreset, mode, computedTheme,
    loadFromSettings, setColorPreset, setStylePreset, toggleDark, setAnimationPreset, setReduceMotion, setMouseTrail
  }
})
