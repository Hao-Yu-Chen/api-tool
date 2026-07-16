<script setup lang="ts">
import { NTabs, NTabPane } from 'naive-ui'
import CollectionTree from '@/components/collection/CollectionTree.vue'
import HistoryList from '@/components/history/HistoryList.vue'
import ProxyPanel from '@/components/proxy/ProxyPanel.vue'
</script>

<template>
  <aside class="app-sidebar">
    <n-tabs type="line" size="small" default-value="collections" animated>
      <n-tab-pane name="collections" tab="📁 集合">
        <CollectionTree />
      </n-tab-pane>
      <n-tab-pane name="proxy" tab="🔀 代理">
        <ProxyPanel />
      </n-tab-pane>
      <n-tab-pane name="history" tab="🕐 历史">
        <HistoryList />
      </n-tab-pane>
    </n-tabs>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 280px;
  height: 100%;
  background: var(--app-sidebar-bg);
  border-right: 2px solid var(--app-border);
  overflow-y: auto;
  flex-shrink: 0;
}

.app-sidebar :deep(.n-tabs-nav) {
  padding-left: 12px;
}
</style>
