<script setup lang="ts">
import { onMounted } from 'vue'
import { NButton, NIcon, NTime, NPopconfirm } from 'naive-ui'
import { Trash } from '@vicons/ionicons5'
import { useHistoryStore } from '@/stores/history'
import { useCollectionStore } from '@/stores/collection'
import MethodBadge from '@/components/shared/MethodBadge.vue'
import type { HistoryEntry } from '@/db/models'

const store = useHistoryStore()
const collectionStore = useCollectionStore()

onMounted(() => store.loadHistory())

function statusClass(status: number): string {
  if (status === 0) return 'status-0'
  if (status < 300) return 'status-2xx'
  if (status < 400) return 'status-3xx'
  if (status < 500) return 'status-4xx'
  return 'status-5xx'
}

function restore(entry: HistoryEntry) {
  // Build a full ApiRequest from the history snapshot (with backward-compat defaults)
  const snap = entry.request
  const request = {
    collectionId: 0,
    name: snap.url,
    method: snap.method,
    url: snap.url,
    headers: snap.headers || [],
    params: snap.params || [],
    body: snap.body || { type: 'none' as const },
    auth: snap.auth || { type: 'none' as const },
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  // Convert ResponseSnapshot to ResponseData for the tab
  const resp = entry.response
  const responseData = {
    status: resp.status,
    statusText: resp.statusText,
    headers: resp.headers,
    body: resp.body,
    duration: resp.duration,
    size: resp.size,
    isBinary: false,
    fileName: null as string | null,
    blobUrl: null as string | null
  }

  // Open a new tab with both request and response preserved
  collectionStore.openTab(request, responseData)
}
</script>

<template>
  <div class="history-list">
    <div class="history-header">
      <n-popconfirm @positive-click="store.clearHistory()">
        <template #trigger>
          <n-button text size="tiny" type="error">
            <template #icon><n-icon><Trash /></n-icon></template>清空历史
          </n-button>
        </template>
        确认清空所有历史记录？
      </n-popconfirm>
    </div>
    <div v-if="store.entries.length === 0" class="empty-history">暂无请求历史</div>
    <div v-for="entry in store.entries" :key="entry.id" class="history-entry" @click="restore(entry)">
      <div class="entry-top">
        <MethodBadge :method="entry.request.method" />
        <span class="entry-status" :class="statusClass(entry.response.status)">{{ entry.response.status }}</span>
        <span class="entry-duration">{{ entry.response.duration }}ms</span>
      </div>
      <div class="entry-url">{{ entry.request.url }}</div>
      <div class="entry-meta"><n-time :time="entry.timestamp" type="relative" /></div>
    </div>
  </div>
</template>

<style scoped>
.history-list { padding: 4px 0; }
.history-header { padding: 4px 8px 8px; border-bottom: 1px solid var(--app-border-light); margin-bottom: 4px; text-align: right; }
.empty-history { color: var(--app-text-disabled); font-size: 12px; text-align: center; padding: 24px; }
.history-entry {
  padding: 8px 10px; border-radius: 6px; cursor: pointer;
  border: 1px solid transparent; margin: 2px 4px;
}
.history-entry:hover { background: var(--app-hover-bg); border-color: var(--app-border-light); }
.entry-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.entry-status { font-size: 11px; font-weight: 700; }
.entry-duration { font-size: 11px; color: var(--app-text-secondary); }
.entry-url { font-size: 12px; color: var(--app-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entry-meta { font-size: 11px; color: var(--app-text-disabled); }
.status-2xx { color: #52c41a; }
.status-3xx { color: #1890ff; }
.status-4xx { color: #fa8c16; }
.status-5xx { color: #ff4d4f; }
.status-0 { color: var(--app-text-disabled); }
</style>
