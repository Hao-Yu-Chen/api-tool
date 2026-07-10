<script setup lang="ts">
import { computed, ref, h, watch } from 'vue'
import { NInput, NSelect, NButton, NSpace, NIcon, NDropdown } from 'naive-ui'
import { Play, SaveOutline } from '@vicons/ionicons5'
import type { HttpMethod, AuthConfig, KeyValuePair } from '@/db/models'
import type { ResponseData } from '@/composables/useRequest'
import { useCollectionStore } from '@/stores/collection'
import { useRequest } from '@/composables/useRequest'
import { useEnvironment } from '@/composables/useEnvironment'
import { useHistoryStore } from '@/stores/history'
import SaveRequestDialog from './SaveRequestDialog.vue'

const emit = defineEmits<{ (e: 'response', data: ResponseData): void }>()

const collectionStore = useCollectionStore()
const { loading, send } = useRequest()
const historyStore = useHistoryStore()
const { replace, resolveUrl, mergeHeaders } = useEnvironment()

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

const currentMethod = computed({
  get: () => collectionStore.activeRequest?.method || 'GET',
  set: (v: HttpMethod) => { if (collectionStore.activeRequest) collectionStore.activeRequest.method = v }
})

const currentUrl = computed({
  get: () => collectionStore.activeRequest?.url || '',
  set: (v: string) => { if (collectionStore.activeRequest) collectionStore.activeRequest.url = v }
})

const currentName = computed({
  get: () => collectionStore.activeRequest?.name || '',
  set: (v: string) => { if (collectionStore.activeRequest) collectionStore.activeRequest.name = v }
})

const isSaved = computed(() =>
  !!collectionStore.activeRequest?.id && collectionStore.activeRequest.collectionId > 0
)

// Save dialog state
const showSaveDialog = ref(false)
const activeRequestName = computed(() => collectionStore.activeRequest?.name || '')

const saveAsOptions = [
  { label: '另存为…', key: 'save-as', icon: () => h(NIcon, null, { default: () => h(SaveOutline) }) }
]

// ====== URL ↔ Params bidirectional sync ======
// Prevent infinite loop by tracking which side initiated the change
const syncingFrom = ref<'url' | 'params' | null>(null)

/** Parse query string from URL into KeyValuePair array */
function parseQueryParams(url: string): KeyValuePair[] {
  const qIndex = url.indexOf('?')
  if (qIndex === -1 || qIndex === url.length - 1) return []
  const qs = url.slice(qIndex + 1)
  // Remove hash fragment if present
  const hashIndex = qs.indexOf('#')
  const cleanQs = hashIndex === -1 ? qs : qs.slice(0, hashIndex)
  if (!cleanQs) return []
  const searchParams = new URLSearchParams(cleanQs)
  const params: KeyValuePair[] = []
  let i = 0
  searchParams.forEach((value, key) => {
    params.push({ id: `qs-${i++}`, key, value, enabled: true })
  })
  return params
}

/** Build URL by replacing query string with current params */
function buildUrlWithParams(baseUrl: string, params: KeyValuePair[]): string {
  // Strip existing query string and hash
  const qIndex = baseUrl.indexOf('?')
  const hashIndex = baseUrl.indexOf('#')
  let cleanUrl: string
  let hash = ''
  if (hashIndex !== -1) {
    hash = baseUrl.slice(hashIndex)
    cleanUrl = qIndex !== -1 ? baseUrl.slice(0, qIndex) : baseUrl.slice(0, hashIndex)
  } else {
    cleanUrl = qIndex !== -1 ? baseUrl.slice(0, qIndex) : baseUrl
  }
  const enabledParams = params.filter(p => p.enabled && p.key)
  if (enabledParams.length === 0) return cleanUrl + hash
  const qs = new URLSearchParams()
  for (const p of enabledParams) {
    qs.append(p.key, p.value)
  }
  return `${cleanUrl}?${qs.toString()}${hash}`
}

/** Compare two param arrays for equality (ignoring id field) */
function paramsEqual(a: KeyValuePair[], b: KeyValuePair[]): boolean {
  const aEnabled = a.filter(p => p.enabled && p.key)
  const bEnabled = b.filter(p => p.enabled && p.key)
  if (aEnabled.length !== bEnabled.length) return false
  return aEnabled.every((pa, i) =>
    pa.key === bEnabled[i].key && pa.value === bEnabled[i].value
  )
}

// When URL changes → sync to params
watch(currentUrl, (newUrl) => {
  if (syncingFrom.value === 'params') return // params initiated this change, skip
  const req = collectionStore.activeRequest
  if (!req) return
  const parsed = parseQueryParams(newUrl)
  // Only update if params actually differ
  if (!paramsEqual(parsed, req.params)) {
    syncingFrom.value = 'url'
    // Merge: keep existing param metadata (id, description) where keys match
    const merged: KeyValuePair[] = parsed.map(pp => {
      const existing = req.params.find(ep => ep.key === pp.key)
      return existing
        ? { ...pp, id: existing.id, description: existing.description }
        : pp
    })
    req.params = merged
    // Reset flag after current tick so subsequent changes are tracked
    Promise.resolve().then(() => { syncingFrom.value = null })
  }
})

// When params change → sync to URL
watch(
  () => collectionStore.activeRequest?.params,
  (newParams) => {
    if (syncingFrom.value === 'url') return // URL initiated this change, skip
    if (!newParams || !collectionStore.activeRequest) return
    const req = collectionStore.activeRequest
    const newUrl = buildUrlWithParams(req.url, newParams)
    if (newUrl !== req.url) {
      syncingFrom.value = 'params'
      req.url = newUrl
      Promise.resolve().then(() => { syncingFrom.value = null })
    }
  },
  { deep: true }
)

/** Apply auth config to request headers (mutates the headers array) */
function applyAuth(headers: KeyValuePair[], auth: AuthConfig): void {
  if (auth.type === 'bearer' && auth.bearer?.token) {
    const hasAuth = headers.some(h => h.enabled && h.key.toLowerCase() === 'authorization')
    if (!hasAuth) {
      headers.push({ id: 'auth-bearer', key: 'Authorization', value: `Bearer ${auth.bearer.token}`, enabled: true })
    }
  } else if (auth.type === 'basic' && auth.basic?.username) {
    const hasAuth = headers.some(h => h.enabled && h.key.toLowerCase() === 'authorization')
    if (!hasAuth) {
      const encoded = btoa(`${auth.basic.username}:${auth.basic.password || ''}`)
      headers.push({ id: 'auth-basic', key: 'Authorization', value: `Basic ${encoded}`, enabled: true })
    }
  } else if (auth.type === 'api-key' && auth.apiKey?.key) {
    const addTo = auth.apiKey.addTo || 'header'
    if (addTo === 'header') {
      headers.push({ id: 'auth-apikey', key: auth.apiKey.key, value: auth.apiKey.value || '', enabled: true })
    }
    // query param handled separately in URL construction
  }
}

async function handleSave() {
  try {
    if (!collectionStore.activeRequest) {
      console.warn('[UrlBar] handleSave: no activeRequest')
      return
    }

    if (collectionStore.activeRequest.id && collectionStore.activeRequest.collectionId > 0) {
      // Already saved — update in place
      const req = JSON.parse(JSON.stringify(collectionStore.activeRequest))
      const { id: _id, ...data } = req
      await collectionStore.updateRequest(req.id, data)
    } else {
      // New request — show save dialog
      showSaveDialog.value = true
    }
  } catch (err) {
    console.error('[UrlBar] handleSave error:', err)
  }
}

async function handleDialogSave(collectionId: number, name: string) {
  try {
    if (!collectionStore.activeRequest) return
    const req = JSON.parse(JSON.stringify(collectionStore.activeRequest))
    req.name = name

    let targetCollectionId = collectionId
    if (targetCollectionId === 0) {
      // Root level — auto-create a collection
      targetCollectionId = await collectionStore.createCollection(name || '新建请求', null)
    }

    const newId = await collectionStore.createRequest(targetCollectionId, {
      ...req,
      id: undefined,
      collectionId: targetCollectionId
    })

    // Update activeRequest so isSaved becomes reactive
    if (collectionStore.activeRequest) {
      collectionStore.activeRequest.id = newId
      collectionStore.activeRequest.collectionId = targetCollectionId
    }

    showSaveDialog.value = false
  } catch (err) {
    console.error('[UrlBar] handleDialogSave error:', err)
  }
}

function handleSaveAsSelect(key: string) {
  if (key === 'save-as') {
    showSaveDialog.value = true
  }
}

async function handleSend() {
  try {
    if (!collectionStore.activeRequest) {
      console.warn('[UrlBar] handleSend: no activeRequest')
      return
    }
    const req = collectionStore.activeRequest
    console.log('[UrlBar] handleSend:', { id: req.id, method: req.method, url: req.url })

    // Auto-save on send for persisted requests (deep clone strips Vue proxies)
    if (req.id && req.collectionId > 0) {
      const { id: _id, ...data } = JSON.parse(JSON.stringify(req))
      await collectionStore.updateRequest(req.id, data)
    }

    // Build headers with auth and global headers applied
    const headers = JSON.parse(JSON.stringify(req.headers))
    applyAuth(headers, req.auth)
    const mergedHeaders = mergeHeaders(headers)

    // Build params: request params + API key query param (if auth uses query)
    const params = JSON.parse(JSON.stringify(req.params))
    if (req.auth.type === 'api-key' && req.auth.apiKey?.key && (req.auth.apiKey.addTo || 'header') === 'query') {
      // Avoid duplicates
      const hasParam = params.some((p: KeyValuePair) => p.enabled && p.key === req.auth.apiKey!.key)
      if (!hasParam) {
        params.push({ id: 'auth-apikey-query', key: req.auth.apiKey.key, value: req.auth.apiKey.value || '', enabled: true })
      }
    }

    const resolvedUrl = resolveUrl(replace(req.url))
    console.log('[UrlBar] resolved URL:', resolvedUrl)
    const result = await send({
      method: req.method,
      url: resolvedUrl,
      headers: mergedHeaders,
      params,
      body: JSON.parse(JSON.stringify(req.body))
    })
    console.log('[UrlBar] send result:', result.status, result.duration + 'ms')

    await historyStore.addEntry(
      {
        method: req.method, url: req.url,
        headers: JSON.parse(JSON.stringify(req.headers)),
        params: JSON.parse(JSON.stringify(req.params)),
        body: JSON.parse(JSON.stringify(req.body)),
        auth: JSON.parse(JSON.stringify(req.auth))
      },
      { status: result.status, statusText: result.statusText, headers: result.headers,
        body: result.body.slice(0, 100 * 1024), duration: result.duration, size: result.size }
    )

    emit('response', result)
  } catch (err) {
    console.error('[UrlBar] handleSend error:', err)
  }
}
</script>

<template>
  <div class="url-bar">
    <div class="url-top-row">
      <n-space :size="0" :wrap="false" class="url-main-group">
        <n-select
          v-model:value="currentMethod" :consistent-menu-width="false"
          :options="methods.map(m => ({ label: m, value: m }))" style="width: 100px; flex-shrink: 0"
          size="large"
        />
        <n-input v-model:value="currentUrl" placeholder="输入请求 URL，如 {{base_url}}/api/users" class="url-input" size="large" />
        <n-button type="primary" :loading="loading" @click="handleSend" class="send-btn ripple-btn" size="large">
          <template #icon><n-icon><Play /></n-icon></template>
          发送
        </n-button>
      </n-space>
    </div>

    <div class="url-bottom-row">
      <n-input
        v-model:value="currentName"
        placeholder="请求名称（例如：获取用户列表）"
        size="tiny"
        class="name-input"
      />
      <n-dropdown v-if="isSaved" trigger="click" :options="saveAsOptions" @select="handleSaveAsSelect">
        <n-button size="tiny" @click="handleSave" ghost>
          <template #icon><n-icon><SaveOutline /></n-icon></template>
          更新
        </n-button>
      </n-dropdown>
      <n-button v-else size="tiny" type="warning" ghost @click="handleSave">
        <template #icon><n-icon><SaveOutline /></n-icon></template>
        保存
      </n-button>
      <span v-if="!isSaved" class="unsaved-hint">未保存</span>
    </div>

    <SaveRequestDialog
      v-model:show="showSaveDialog"
      :request-name="activeRequestName"
      @save="handleDialogSave"
    />
  </div>
</template>

<style scoped>
.url-bar {
  padding: 12px 12px 8px;
}

.url-top-row {
  margin-bottom: 6px;
}

.url-main-group {
  width: 100%;
}

.url-input {
  flex: 1 1 auto;
  min-width: 400px;
}

.send-btn {
  border-radius: 0 4px 4px 0;
  flex-shrink: 0;
}

.url-bottom-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-input {
  flex: 0 0 240px;
}

.unsaved-hint {
  font-size: 11px;
  color: var(--app-text-disabled);
  white-space: nowrap;
}
</style>
