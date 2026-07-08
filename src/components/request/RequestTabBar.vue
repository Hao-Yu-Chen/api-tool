<script setup lang="ts">
import { NButton, NIcon } from 'naive-ui'
import { Close } from '@vicons/ionicons5'
import { useCollectionStore } from '@/stores/collection'
import MethodBadge from '@/components/shared/MethodBadge.vue'

const store = useCollectionStore()

function selectTab(tabId: string) {
  if (store.activeTabId === tabId) return
  const tab = store.getTab(tabId)
  if (tab) {
    store.activeTabId = tab.id
    store.activeRequest = tab.request  // direct assignment to mut ref
  }
}

function closeTab(e: Event, tabId: string) {
  e.stopPropagation()
  store.closeTab(tabId)
}
</script>

<template>
  <div class="tab-bar">
    <TransitionGroup name="tab" tag="div" class="tab-list">
      <div
        v-for="tab in store.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ active: store.activeTabId === tab.id }"
        @click="selectTab(tab.id)"
      >
        <MethodBadge :method="tab.request.method" />
        <span class="tab-name">{{ tab.request.name || 'Untitled' }}</span>
        <span v-if="!tab.request.id" class="tab-dot" title="未保存" />
        <n-button
          text
          size="tiny"
          class="tab-close"
          @click="(e: Event) => closeTab(e, tab.id)"
        >
          <template #icon><n-icon size="12"><Close /></n-icon></template>
        </n-button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.tab-bar {
  background: var(--app-sidebar-bg);
  border-bottom: 1px solid var(--app-border);
  overflow: hidden;
}

.tab-list {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
}

.tab-list::-webkit-scrollbar { display: none; }

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px 5px 10px;
  font-size: 12px;
  cursor: pointer;
  border-right: 1px solid var(--app-border-light);
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  user-select: none;
  flex-shrink: 0;
  max-width: 200px;
  color: var(--app-text-secondary);
  transition: background 0.1s, border-color 0.1s;
}

.tab-item:hover {
  background: var(--app-hover-bg);
}

.tab-item.active {
  color: var(--app-text);
  background: var(--app-panel-bg);
  border-bottom-color: var(--app-active-border);
}

.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--app-text-disabled);
  flex-shrink: 0;
}

.tab-close {
  opacity: 0;
  flex-shrink: 0;
  margin-left: 2px;
}

.tab-item:hover .tab-close {
  opacity: 1;
}
</style>
