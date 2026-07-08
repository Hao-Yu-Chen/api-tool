<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppTopbar from '@/components/layout/AppTopbar.vue'
import RequestBuilder from '@/components/request/RequestBuilder.vue'
import RequestTabBar from '@/components/request/RequestTabBar.vue'
import ResponseViewer from '@/components/response/ResponseViewer.vue'
import { useCollectionStore } from '@/stores/collection'
import { NButton, NIcon } from 'naive-ui'
import { Add } from '@vicons/ionicons5'
import type { ResponseData } from '@/composables/useRequest'

const collectionStore = useCollectionStore()
const responseViewerRef = ref<InstanceType<typeof ResponseViewer>>()

onMounted(async () => {
  await collectionStore.loadCollections()
  await collectionStore.loadRequests()
})

function handleResponse(data: ResponseData) {
  // Save response to the current tab (persists across tab switches)
  if (collectionStore.activeTabId) {
    collectionStore.setTabResponse(collectionStore.activeTabId, data)
  }
  responseViewerRef.value?.setResponse(data)
}

function handleNewRequest() {
  collectionStore.setActiveRequest({
    collectionId: 0,
    name: 'Untitled Request',
    method: 'GET',
    url: '',
    params: [],
    headers: [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }],
    body: { type: 'none' },
    auth: { type: 'none' },
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
}
</script>

<template>
  <div class="home-layout">
    <AppTopbar @new-request="handleNewRequest" />
    <div class="home-body">
      <AppSidebar />
      <div class="home-main">
        <!-- 请求构建区 -->
        <div class="request-section">
          <div class="section-label">📤 请求</div>
          <RequestTabBar />
          <div class="request-content">
            <div v-if="!collectionStore.activeRequest" class="no-request-hero">
              <div class="hero-icon">📡</div>
              <h2>开始调试 API</h2>
              <p>从左侧选择一个请求，或创建一个新请求开始</p>
              <n-button type="primary" size="large" @click="handleNewRequest">
                <template #icon><n-icon><Add /></n-icon></template>
                新建请求
              </n-button>
            </div>
            <RequestBuilder v-else @response="handleResponse" />
          </div>
        </div>

        <!-- 响应区 -->
        <div class="response-section">
          <div class="section-label">📥 响应</div>
          <div class="response-content">
            <Transition name="slide-up" mode="out-in">
              <ResponseViewer
                v-if="collectionStore.activeResponse"
                :key="Date.now()"
                ref="responseViewerRef"
                :model-value="collectionStore.activeResponse"
              />
              <div v-else class="no-response-placeholder">
                <span>发送请求后查看响应</span>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.home-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.home-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background: var(--app-main-bg);
}

/* 请求区域 */
.request-section {
  display: flex;
  flex-direction: column;
  border-bottom: 3px solid var(--app-border);
  background: var(--app-panel-bg);
}
.section-label {
  padding: 6px 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--app-text-disabled);
  background: var(--app-sidebar-bg);
  border-bottom: 1px solid var(--app-border-light);
  user-select: none;
}

.request-content {
  background: var(--app-panel-bg);
}

/* 空状态 */
.no-request-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 16px;
  text-align: center;
}
.hero-icon { font-size: 48px; margin-bottom: 16px; }
.no-request-hero h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--app-text);
}
.no-request-hero p {
  font-size: 14px;
  margin-bottom: 20px;
  color: var(--app-text-secondary);
}

/* 响应区域 */
.response-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 200px;
  background: var(--app-panel-bg);
}
.response-content {
  flex: 1;
  overflow: auto;
  background: var(--app-panel-bg);
}

/* 响应区过渡 */
.slide-up-enter-active { animation: slideUp 0.3s ease-out; }
.slide-up-leave-active { animation: fadeIn 0.15s ease-in reverse; }

.no-response-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--app-text-disabled);
  font-size: 14px;
}
</style>
