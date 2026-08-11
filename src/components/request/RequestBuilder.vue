<script setup lang="ts">
import type { ResponseData } from '@/composables/useRequest'
import UrlBar from './UrlBar.vue'
import RequestTabs from './RequestTabs.vue'

const emit = defineEmits<{ (e: 'response', data: ResponseData): void }>()
</script>

<template>
  <div class="request-builder">
    <div class="url-section">
      <UrlBar @response="(d: ResponseData) => emit('response', d)" />
    </div>
    <div class="tabs-section">
      <RequestTabs />
    </div>
  </div>
</template>

<style scoped>
.request-builder {
  background: var(--app-panel-bg);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.url-section {
  padding: 4px 0;
  border-bottom: 1px solid var(--app-border-light);
  background: var(--app-surface-bg);
  flex-shrink: 0;
}
.tabs-section {
  background: var(--app-panel-bg);
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
</style>
