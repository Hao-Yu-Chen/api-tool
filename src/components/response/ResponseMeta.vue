<script setup lang="ts">
import { computed } from 'vue'
import { NSpace, NTag } from 'naive-ui'

const props = defineProps<{ status: number; statusText: string; duration: number; size: number }>()

const statusColor = computed(() => {
  if (props.status === 0) return 'default' as const
  if (props.status < 300) return 'success' as const
  if (props.status < 400) return 'info' as const
  if (props.status < 500) return 'warning' as const
  return 'error' as const
})

const durationColor = computed(() => {
  if (props.duration < 200) return '#52c41a'
  if (props.duration < 1000) return '#fa8c16'
  return '#ff4d4f'
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
</script>

<template>
  <div class="response-meta">
    <div class="meta-left">
      <n-tag :type="statusColor" size="small" class="status-tag">{{ status }} {{ statusText }}</n-tag>
    </div>
    <div class="meta-right">
      <span class="meta-item" :style="{ color: durationColor }">⏱ {{ duration }}ms</span>
      <span class="meta-divider">|</span>
      <span class="meta-item">📦 {{ formatSize(size) }}</span>
    </div>
  </div>
</template>

<style scoped>
.response-meta { display: flex; align-items: center; justify-content: space-between; padding: 6px 16px; }
.meta-left { display: flex; align-items: center; }
.meta-right { display: flex; align-items: center; gap: 8px; }
.meta-item { font-size: 12px; color: var(--app-text-secondary); }
.meta-divider { color: var(--app-border-light); font-size: 12px; }
.status-tag { font-weight: 700; font-family: monospace; }
</style>
