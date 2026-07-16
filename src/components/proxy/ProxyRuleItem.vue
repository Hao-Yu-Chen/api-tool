<script setup lang="ts">
import { NSwitch, NButton, NIcon, NPopconfirm, NText } from 'naive-ui'
import { Create, Trash } from '@vicons/ionicons5'
import type { ProxyRule } from '@/db/models'

const props = defineProps<{
  rule: ProxyRule
  disabled: boolean // 代理运行中禁止编辑/删除
}>()

const emit = defineEmits<{
  toggle: [id: number]
  edit: [rule: ProxyRule]
  delete: [id: number]
}>()

/** 截断显示 URL */
function shortUrl(url: string, maxLen = 42): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen - 3) + '...'
}
</script>

<template>
  <div class="rule-item" :class="{ disabled: !rule.enabled }">
    <div class="rule-row">
      <n-switch
        :value="rule.enabled"
        size="small"
        @update:value="emit('toggle', rule.id!)"
      />
      <div class="rule-info">
        <n-text class="rule-name" :depth="rule.enabled ? 1 : 3">
          {{ rule.name }}
        </n-text>
        <div class="rule-urls">
          <code class="rule-source">{{ shortUrl(rule.sourcePattern) }}</code>
          <span class="rule-arrow">→</span>
          <code class="rule-target">{{ shortUrl(rule.targetAddress) }}</code>
        </div>
      </div>
      <div class="rule-actions">
        <n-button
          text
          size="tiny"
          @click="emit('edit', rule)"
          :disabled="disabled"
        >
          <template #icon><n-icon :component="Create" /></template>
        </n-button>
        <n-popconfirm
          @positive-click="emit('delete', rule.id!)"
          :disabled="disabled"
        >
          <template #trigger>
            <n-button text size="tiny" :disabled="disabled">
              <template #icon><n-icon :component="Trash" /></template>
            </n-button>
          </template>
          确定删除此规则？
        </n-popconfirm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rule-item {
  padding: 10px 12px;
  border-radius: var(--app-radius-md);
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-light);
  transition: opacity 0.2s;
}
.rule-item.disabled {
  opacity: 0.55;
}
.rule-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.rule-info {
  flex: 1;
  min-width: 0;
}
.rule-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}
.rule-urls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.rule-source,
.rule-target {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--app-surface-bg);
  border: 1px solid var(--app-border-light);
  word-break: break-all;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rule-arrow {
  font-size: 12px;
  color: var(--app-active-border);
  flex-shrink: 0;
}
.rule-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s;
}
.rule-item:hover .rule-actions {
  opacity: 1;
}
</style>
