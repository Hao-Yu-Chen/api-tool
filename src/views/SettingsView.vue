<script setup lang="ts">
import { NButton, NIcon, NSpace, NSwitch, NDivider } from 'naive-ui'
import { ArrowBack, Sunny, Moon } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { colorPresetList, stylePresetList } from '@/themes/presets'
import { animationPresetList } from '@/animations/presets'

const router = useRouter()
const themeStore = useThemeStore()

// 桌面设置（仅在 Electron 环境中可用）
import { ref, onMounted } from 'vue'
import type { DesktopSettings } from '@/types/electron'

const isElectron = ref(false)
const desktopSettings = ref<DesktopSettings>({
  autoLaunch: false,
  minimizeToTray: true,
  notifyOnComplete: false,
  registerFileAssociation: false
})

onMounted(async () => {
  if (window.electronAPI?.isElectron) {
    isElectron.value = true
    desktopSettings.value = await window.electronAPI.getDesktopSettings()
  }
})

async function toggleDesktopSetting(key: keyof DesktopSettings, value: boolean) {
  if (window.electronAPI) {
    const s = await window.electronAPI.setDesktopSetting(key, value)
    desktopSettings.value = s
  }
}
</script>

<template>
  <div class="settings-layout">
    <div class="settings-header">
      <n-button text @click="router.push('/')">
        <template #icon><n-icon><ArrowBack /></n-icon></template>
        返回
      </n-button>
      <span class="settings-title">设置</span>
      <div />
    </div>

    <div class="settings-content">
      <!-- 暗/亮模式 -->
      <section class="settings-section">
        <div class="section-header">
          <h3>亮度模式</h3>
          <n-space align="center" :size="8">
            <n-icon><Sunny /></n-icon>
            <n-switch
              :value="themeStore.isDark"
              @update:value="themeStore.toggleDark()"
            />
            <n-icon><Moon /></n-icon>
            <span class="mode-label">{{ themeStore.isDark ? '暗色' : '亮色' }}</span>
          </n-space>
        </div>
      </section>

      <n-divider />

      <!-- 色彩方案 -->
      <section class="settings-section">
        <h3>色彩方案</h3>
        <p class="section-desc">选择配色方案，每套均有暗色和亮色变体</p>
        <div class="preset-grid">
          <div
            v-for="cp in colorPresetList"
            :key="cp.name"
            class="preset-card"
            :class="{ active: themeStore.colorPresetName === cp.name }"
            @click="themeStore.setColorPreset(cp.name)"
          >
            <div class="preset-preview">
              <div class="preview-bar" :style="{ background: cp.dark.primary }" />
              <div class="preview-body" :style="{ background: cp.dark.bgBase }">
                <div class="preview-text" :style="{ background: cp.dark.textPrimary }" />
                <div class="preview-text short" :style="{ background: cp.dark.textSecondary }" />
              </div>
            </div>
            <span class="preset-name">{{ cp.label }}</span>
          </div>
        </div>
      </section>

      <n-divider />

      <!-- 视觉风格 -->
      <section class="settings-section">
        <h3>视觉风格</h3>
        <p class="section-desc">选择 UI 形态风格，与色彩方案自由搭配</p>
        <div class="preset-grid">
          <div
            v-for="sp in stylePresetList"
            :key="sp.name"
            class="preset-card style-card"
            :class="{ active: themeStore.stylePresetName === sp.name }"
            @click="themeStore.setStylePreset(sp.name)"
          >
            <div class="style-preview" :class="`style-${sp.name}`">
              <div class="style-box" :style="{ borderRadius: sp.tokens.radiusMd }" />
              <div class="style-box sm" :style="{ borderRadius: sp.tokens.radiusSm }" />
            </div>
            <span class="preset-name">{{ sp.label }}</span>
          </div>
        </div>
      </section>

      <n-divider />

      <!-- 动画预设 -->
      <section class="settings-section">
        <h3>动画效果</h3>
        <p class="section-desc">选择粒子背景和交互动画风格</p>
        <div class="preset-grid">
          <div
            v-for="ap in animationPresetList"
            :key="ap.name"
            class="preset-card anim-card"
            :class="{ active: themeStore.animationPresetName === ap.name }"
            @click="themeStore.setAnimationPreset(ap.name)"
          >
            <div class="anim-preview" :class="`anim-${ap.name}`">
              <div class="anim-icon">
                {{ ap.particleType === 'constellation' ? '✨' : ap.particleType === 'matrix' ? '🔷' : ap.particleType === 'aurora' ? '🌊' : '⚫' }}
              </div>
            </div>
            <span class="preset-name">{{ ap.label }}</span>
            <span class="preset-hint">{{ ap.animationLevel === 'none' ? '无效果' : ap.animationLevel === 'subtle' ? '基础' : ap.animationLevel === 'moderate' ? '中等' : '丰富' }}</span>
          </div>
        </div>
        <!-- 鼠标拖尾独立开关 -->
        <div class="mouse-trail-toggle">
          <div>
            <span class="setting-label">鼠标拖尾</span>
            <span class="setting-hint">移动鼠标时产生跟随光点拖尾效果</span>
          </div>
          <n-switch
            :value="themeStore.mouseTrail"
            @update:value="(val: boolean) => themeStore.setMouseTrail(val)"
          />
        </div>
      </section>

      <n-divider />

      <!-- 当前主题信息 -->
      <section class="settings-section">
        <h3>当前主题</h3>
        <div class="current-theme-info">
          <span class="info-chip">🎨 {{ themeStore.colorPreset.label }}</span>
          <span>×</span>
          <span class="info-chip">✨ {{ themeStore.stylePreset.label }}</span>
          <span>×</span>
          <span class="info-chip">🎬 {{ themeStore.animationPreset.label }}</span>
          <span>·</span>
          <span class="info-chip">{{ themeStore.isDark ? '🌙 暗色' : '☀️ 亮色' }}</span>
        </div>
      </section>

      <!-- 桌面设置（仅 Electron 环境可见） -->
      <template v-if="isElectron">
        <n-divider />
        <section class="settings-section">
          <h3>桌面设置</h3>
          <p class="section-desc">以下设置仅在桌面应用中生效</p>
          <div class="desktop-settings-list">
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">开机自启</span>
                <span class="setting-hint">系统启动时自动运行 API Tool</span>
              </div>
              <n-switch
                :value="desktopSettings.autoLaunch"
                @update:value="(val: boolean) => toggleDesktopSetting('autoLaunch', val)"
              />
            </div>
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">最小化到托盘</span>
                <span class="setting-hint">关闭窗口时隐藏到系统托盘而不是退出</span>
              </div>
              <n-switch
                :value="desktopSettings.minimizeToTray"
                @update:value="(val: boolean) => toggleDesktopSetting('minimizeToTray', val)"
              />
            </div>
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">请求完成通知</span>
                <span class="setting-hint">请求完成时弹出系统原生通知</span>
              </div>
              <n-switch
                :value="desktopSettings.notifyOnComplete"
                @update:value="(val: boolean) => toggleDesktopSetting('notifyOnComplete', val)"
              />
            </div>
            <div class="desktop-setting-row">
              <div>
                <span class="setting-label">JSON 文件关联</span>
                <span class="setting-hint">将 .json 文件关联到 API Tool，双击即可导入</span>
              </div>
              <n-switch
                :value="desktopSettings.registerFileAssociation"
                @update:value="(val: boolean) => toggleDesktopSetting('registerFileAssociation', val)"
              />
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.settings-layout {
  min-height: 100vh;
  background: var(--app-bg);
  color: var(--app-text);
  position: relative;
  z-index: 1;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background: var(--app-topbar-bg);
  border-bottom: var(--app-border-width) solid var(--app-border);
}

.settings-title {
  font-size: 16px;
  font-weight: 700;
}

.settings-content {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}

/* ====== Section ====== */
.settings-section h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.section-desc {
  font-size: 13px;
  color: var(--app-text-secondary);
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-label {
  font-size: 13px;
  color: var(--app-text-secondary);
  min-width: 28px;
}

/* ====== Preset Grid ====== */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
  border-radius: var(--app-radius-md);
  border: 2px solid var(--app-border-light);
  background: var(--app-card-bg);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-card:hover {
  border-color: var(--app-active-border);
  background: var(--app-active-bg);
}

.preset-card.active {
  border-color: var(--app-active-border);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  background: var(--app-active-bg);
}

.preset-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text);
}

/* ====== Color Preview ====== */
.preset-preview {
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--app-border-light);
}

.preview-bar {
  height: 10px;
}

.preview-body {
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-text {
  height: 4px;
  border-radius: 2px;
  width: 100%;
  opacity: 0.5;
}

.preview-text.short {
  width: 60%;
  opacity: 0.35;
}

/* ====== Style Preview ====== */
.style-card {
  min-height: 100px;
}

.style-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px;
}

.style-box {
  width: 56px;
  height: 40px;
  background: var(--app-active-border);
  opacity: 0.6;
}

.style-box.sm {
  width: 40px;
  height: 22px;
  opacity: 0.4;
}

/* ====== Current Theme Info ====== */
.current-theme-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--app-text-secondary);
}

.info-chip {
  padding: 4px 12px;
  border-radius: var(--app-radius-sm);
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-light);
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
}

/* ====== Desktop Settings ====== */
.desktop-settings-list {
  display: flex;
  flex-direction: column;
}

.desktop-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid var(--app-border-light);
}

.desktop-setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-text);
}

.setting-hint {
  display: block;
  font-size: 12px;
  color: var(--app-text-secondary);
  margin-top: 2px;
}

/* ====== Animation Preset Cards ====== */
.anim-card {
  min-height: 100px;
}

.anim-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--app-radius-md);
  background: var(--app-surface-bg);
  border: 1px solid var(--app-border-light);
}

.anim-icon {
  font-size: 24px;
}

.preset-hint {
  font-size: 10px;
  color: var(--app-text-disabled);
}

/* ====== Mouse Trail Toggle ====== */
.mouse-trail-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  margin-top: 14px;
  border-radius: var(--app-radius-md);
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-light);
}
</style>
