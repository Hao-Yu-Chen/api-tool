<script setup lang="ts">
import { computed } from 'vue'
import { NRadioGroup, NRadio } from 'naive-ui'
import { useCollectionStore } from '@/stores/collection'
import CodeEditor from '@/components/shared/CodeEditor.vue'
import JsonTreeViewer from '@/components/shared/JsonTreeViewer.vue'
import KeyValueEditor from '@/components/shared/KeyValueEditor.vue'
import type { BodyType } from '@/db/models'

const store = useCollectionStore()

const bodyType = computed({
  get: () => store.activeRequest?.body.type || 'none',
  set: (v: BodyType) => {
    if (store.activeRequest) {
      store.activeRequest.body.type = v
      if (v === 'json' && !store.activeRequest.body.raw) store.activeRequest.body.raw = '{\n  \n}'
      if (v === 'form-data' && !store.activeRequest.body.formData) store.activeRequest.body.formData = []
      if (v === 'x-www-form-urlencoded' && !store.activeRequest.body.urlEncoded) store.activeRequest.body.urlEncoded = []
    }
  }
})

const rawBody = computed({
  get: () => store.activeRequest?.body.raw || '',
  set: (v: string) => { if (store.activeRequest) store.activeRequest.body.raw = v }
})
const formData = computed({
  get: () => store.activeRequest?.body.formData || [],
  set: (v) => { if (store.activeRequest) store.activeRequest.body.formData = v }
})
const urlEncoded = computed({
  get: () => store.activeRequest?.body.urlEncoded || [],
  set: (v) => { if (store.activeRequest) store.activeRequest.body.urlEncoded = v }
})
</script>

<template>
  <div class="editor-panel">
    <div v-if="!store.activeRequest" class="placeholder">选择一个请求以编辑 Body</div>
    <template v-else>
      <div class="type-selector">
        <n-radio-group v-model:value="bodyType" size="small">
          <n-radio value="none">none</n-radio>
          <n-radio value="json">JSON</n-radio>
          <n-radio value="form-data">form-data</n-radio>
          <n-radio value="x-www-form-urlencoded">urlencoded</n-radio>
          <n-radio value="raw">raw</n-radio>
        </n-radio-group>
      </div>
      <div class="editor-area">
        <JsonTreeViewer v-if="bodyType === 'json'" v-model="rawBody" language="json" :readonly="false" />
        <CodeEditor v-else-if="bodyType === 'raw'" v-model="rawBody" language="text" />
        <KeyValueEditor v-else-if="bodyType === 'form-data'" v-model="formData" show-description />
        <KeyValueEditor v-else-if="bodyType === 'x-www-form-urlencoded'" v-model="urlEncoded" show-description />
      </div>
    </template>
  </div>
</template>

<style scoped>
.editor-panel { padding: 0 12px 8px; }
.placeholder { color: var(--app-text-disabled); font-size: 13px; text-align: center; padding: 32px; }
.type-selector {
  padding: 8px 0;
  border-bottom: 1px solid var(--app-border-light);
  margin-bottom: 8px;
}
.editor-area {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  overflow: hidden;
}
</style>
