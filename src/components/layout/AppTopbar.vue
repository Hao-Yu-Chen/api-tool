<script setup lang="ts">
import { NButton, NIcon, NSpace, NText, NDropdown } from 'naive-ui'
import { Settings, Sunny, Moon, Add, ColorWand } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import EnvSelector from '@/components/environment/EnvSelector.vue'
import { useImportExport } from '@/composables/useImportExport'
import { animationPresetList } from '@/animations/presets'

const emit = defineEmits<{ (e: 'new-request'): void }>()

const router = useRouter()
const themeStore = useThemeStore()
const { exportFile, importFile } = useImportExport()

const menuOptions = [
  { label: '📤 导出全部 (JSON)', key: 'export' },
  { label: '📥 导入 (JSON / Postman)', key: 'import' }
]

function handleMenuSelect(key: string) {
  if (key === 'export') exportFile()
  else if (key === 'import') importFile()
}

// 动画预设下拉选项
const animOptions = animationPresetList.map(p => ({
  label: `${p.label} ${themeStore.animationPresetName === p.name ? '✓' : ''}`,
  key: p.name
}))

function handleAnimSelect(key: string) {
  themeStore.setAnimationPreset(key)
}
</script>

<template>
  <div class="app-topbar">
    <div class="topbar-left">
      <n-text strong class="brand-text">API Tool</n-text>
      <n-button size="tiny" type="primary" ghost @click="emit('new-request')">
        <template #icon><n-icon><Add /></n-icon></template>
        新建
      </n-button>
    </div>
    <div class="topbar-center">
      <EnvSelector />
    </div>
    <div class="topbar-right">
      <n-space :size="4" align="center">
        <n-dropdown trigger="click" :options="menuOptions" @select="handleMenuSelect">
          <n-button text size="small">导入/导出</n-button>
        </n-dropdown>
        <n-dropdown trigger="click" :options="animOptions" @select="handleAnimSelect">
          <n-button text size="small">
            <template #icon>
              <n-icon><ColorWand /></n-icon>
            </template>
            {{ themeStore.animationPreset.label }}
          </n-button>
        </n-dropdown>
        <n-button text @click="themeStore.toggleDark()" size="small">
          <template #icon>
            <n-icon><Moon v-if="themeStore.isDark" /><Sunny v-else /></n-icon>
          </template>
        </n-button>
        <n-button text @click="router.push('/settings')" size="small">
          <template #icon><n-icon><Settings /></n-icon></template>
        </n-button>
      </n-space>
    </div>
  </div>
</template>

<style scoped>
.app-topbar {
  height: 44px;
  display: flex;
  align-items: center;
  background: var(--app-topbar-bg);
  border-bottom: var(--app-border-width) solid var(--app-border);
  flex-shrink: 0;
  padding: 0 8px;
}
.topbar-left { flex: 0 0 280px; display: flex; align-items: center; gap: 10px; }
.brand-text { font-size: 16px; margin-left: 8px; white-space: nowrap; }
.topbar-center { flex: 1; display: flex; justify-content: center; }
.topbar-right { flex: 0 0 auto; }
</style>
