<script setup lang="ts">
import { computed } from 'vue'
import { NSelect, NInput } from 'naive-ui'
import { useCollectionStore } from '@/stores/collection'
import type { AuthType } from '@/db/models'

const store = useCollectionStore()

const authType = computed({
  get: () => store.activeRequest?.auth.type || 'none',
  set: (v: AuthType) => { if (store.activeRequest) store.activeRequest.auth.type = v }
})

const bearerToken = computed({
  get: () => store.activeRequest?.auth.bearer?.token || '',
  set: (v: string) => { if (store.activeRequest) store.activeRequest.auth.bearer = { token: v } }
})
</script>

<template>
  <div class="editor-panel">
    <div v-if="!store.activeRequest" class="placeholder">选择一个请求以配置认证</div>
    <div v-else class="editor-container">
      <n-select v-model:value="authType" :options="[
        { label: 'No Auth', value: 'none' },
        { label: 'Bearer Token', value: 'bearer' },
        { label: 'Basic Auth', value: 'basic' },
        { label: 'API Key', value: 'api-key' }
      ]" style="width: 200px; margin-bottom: 12px" size="small" />
      <div v-if="authType === 'bearer'" class="auth-form">
        <div class="auth-label">Token</div>
        <n-input v-model:value="bearerToken" type="textarea" placeholder="输入 Bearer Token" :rows="3" size="small" />
      </div>
      <div v-else-if="authType === 'basic'" class="auth-form"><p class="coming-soon">Basic Auth 表单 — 即将支持</p></div>
      <div v-else-if="authType === 'api-key'" class="auth-form"><p class="coming-soon">API Key 表单 — 即将支持</p></div>
    </div>
  </div>
</template>

<style scoped>
.editor-panel { padding: 0 12px 8px; }
.editor-container {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  padding: 12px;
}
.placeholder { color: var(--app-text-disabled); font-size: 13px; text-align: center; padding: 32px; }
.auth-form { margin-top: 4px; }
.auth-label { font-size: 12px; color: var(--app-text-secondary); margin-bottom: 4px; }
.coming-soon { color: var(--app-text-disabled); font-size: 13px; padding: 12px 0; }
</style>
