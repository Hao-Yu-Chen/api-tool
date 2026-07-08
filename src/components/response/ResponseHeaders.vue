<script setup lang="ts">
defineProps<{ headers: Record<string, string> }>()
</script>

<template>
  <div class="response-headers">
    <div v-for="(value, key) in headers" :key="key" class="header-row">
      <span class="header-key">{{ key }}</span>
      <span class="header-value">{{ value }}</span>
    </div>
    <div v-if="Object.keys(headers).length === 0" class="empty-headers">无响应头数据</div>
  </div>
</template>

<style scoped>
.response-headers { padding: 4px 0; }
.header-row {
  display: flex; padding: 3px 16px; font-size: 12px; font-family: monospace;
  border-bottom: 1px solid var(--app-border-subtle);
}
.header-row:hover { background: var(--app-hover-bg); }
.header-key {
  font-weight: 600; color: var(--app-text); flex: 0 0 220px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.header-value { color: var(--app-text-secondary); word-break: break-all; }
.empty-headers { text-align: center; color: var(--app-text-disabled); padding: 24px; font-size: 13px; }
</style>
