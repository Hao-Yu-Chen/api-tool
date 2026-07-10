<script setup lang="ts">
import { ref, onBeforeUnmount, watch, computed } from 'vue'
import { NTabs, NTabPane, NButton, NIcon } from 'naive-ui'
import { DownloadOutline } from '@vicons/ionicons5'
import ResponseMeta from './ResponseMeta.vue'
import ResponseBody from './ResponseBody.vue'
import ResponseHeaders from './ResponseHeaders.vue'
import type { ResponseData } from '@/composables/useRequest'

const props = defineProps<{ modelValue?: ResponseData | null }>()

const internalResp = ref<ResponseData | null>(null)

// Use prop if provided, otherwise fall back to internal state
const resp = computed(() => props.modelValue !== undefined ? props.modelValue : internalResp.value)

function setResponse(data: ResponseData) { internalResp.value = data }
function clearResponse() { internalResp.value = null }
defineExpose({ setResponse, clearResponse })

// Revoke blob URL when response changes or component unmounts
watch(() => resp.value?.blobUrl, (newUrl, oldUrl) => {
  if (oldUrl) URL.revokeObjectURL(oldUrl)
})
onBeforeUnmount(() => {
  if (resp.value?.blobUrl) URL.revokeObjectURL(resp.value.blobUrl)
})

function handleDownload() {
  if (!resp.value?.blobUrl) return
  const a = document.createElement('a')
  a.href = resp.value.blobUrl
  a.download = resp.value.fileName || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
</script>

<template>
  <div class="response-viewer">
    <template v-if="resp">
      <div class="resp-meta-bar">
        <div class="meta-left">
          <ResponseMeta :status="resp.status" :status-text="resp.statusText" :duration="resp.duration" :size="resp.size" />
        </div>
        <div class="meta-right">
          <n-button v-if="resp.isBinary" size="tiny" type="info" @click="handleDownload">
            <template #icon><n-icon><DownloadOutline /></n-icon></template>
            下载{{ resp.fileName ? ' ' + resp.fileName : '' }}
          </n-button>
        </div>
      </div>
      <div class="resp-body-area">
        <n-tabs type="line" size="small" default-value="body">
          <n-tab-pane name="body" tab="Body">
            <ResponseBody :body="resp.body" :content-type="resp.headers['content-type'] || ''" />
          </n-tab-pane>
          <n-tab-pane name="headers" tab="Headers">
            <ResponseHeaders :headers="resp.headers" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </template>
    <div v-else class="empty-response">
      <div class="empty-icon">📤</div>
      <div class="empty-title">点击「发送」查看响应</div>
      <div class="empty-desc">在 URL 栏输入地址并点击发送按钮，响应将显示在这里</div>
    </div>
  </div>
</template>

<style scoped>
.response-viewer { flex: 1; overflow: auto; background: var(--app-panel-bg); display: flex; flex-direction: column; }
.resp-meta-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: var(--app-surface-bg); border-bottom: 1px solid var(--app-border-light); flex-shrink: 0; }
.meta-left { display: flex; align-items: center; }
.meta-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.resp-body-area { background: var(--app-panel-bg); flex: 1; min-height: 0; display: flex; flex-direction: column; }
.empty-response {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 80px 16px; text-align: center;
}
.empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.4; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--app-text-secondary); margin-bottom: 6px; }
.empty-desc { font-size: 13px; color: var(--app-text-disabled); }
</style>
