<script setup lang="ts">
import { watch, onMounted, provide, computed } from 'vue'
import { darkTheme, NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import { useThemeStore } from '@/stores/theme'
import { db } from '@/db'
import { computeParticleConfig } from '@/animations/engine'
import ParticleBackground from '@/animations/components/ParticleBackground.vue'

const themeStore = useThemeStore()

// Apply computed CSS variables to :root and body classes
function applyTheme() {
  const { cssVars, bodyClass } = themeStore.computedTheme

  // Set CSS custom properties on :root
  for (const [key, value] of Object.entries(cssVars)) {
    document.documentElement.style.setProperty(key, value)
  }

  // Set body class for global style adaptation
  const classes = bodyClass.split(' ')
  if (themeStore.reduceMotion) classes.push('theme-reduce-motion')
  document.body.className = classes.join(' ')
}

// Watch for theme changes and apply
watch(() => [themeStore.computedTheme, themeStore.reduceMotion], applyTheme, { immediate: true })

// Naive UI theme: use darkTheme as base + our custom overrides on top
const naiveTheme = computed(() => themeStore.isDark ? darkTheme : null)

// Particle runtime config derived from store (pure hex, no alpha channel)
// User's mouseTrail preference overrides the preset default
const particleConfig = computed(() => {
  const cp = themeStore.colorPreset
  const tokens = themeStore.isDark ? cp.dark : cp.light
  const preset = themeStore.animationPreset
  const config = computeParticleConfig(preset, tokens.primary)
  // 用户可通过设置独立开关覆盖预设值
  config.mouseTrail = themeStore.mouseTrail && preset.mouseTrail
  return config
})

// Provide for child components that still use inject
provide('isDark', themeStore.isDark)
provide('themeStore', themeStore)

// Initialize DB + theme on mount
onMounted(async () => {
  db.seedDefaults()
  await themeStore.loadFromSettings()
  applyTheme()
})
</script>

<template>
  <n-config-provider
    :theme="naiveTheme"
    :theme-overrides="themeStore.computedTheme.naiveOverrides"
  >
    <ParticleBackground :config="particleConfig" />
    <n-dialog-provider>
      <n-message-provider>
        <router-view v-slot="{ Component, route: _route }">
          <transition
            :name="themeStore.animationPreset.routeTransition ? 'route' : undefined"
            mode="out-in"
          >
            <component :is="Component" :key="_route.path" />
          </transition>
        </router-view>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
