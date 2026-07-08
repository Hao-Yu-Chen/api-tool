<script setup lang="ts">
import { useCollectionStore } from '@/stores/collection'
import KeyValueEditor from '@/components/shared/KeyValueEditor.vue'
const store = useCollectionStore()
</script>

<template>
  <div class="editor-panel">
    <div class="editor-container">
      <KeyValueEditor v-if="store.activeRequest" v-model="store.activeRequest.params" show-description />
      <p v-else class="placeholder">选择一个请求以编辑 Query 参数</p>
    </div>
  </div>
</template>

<style scoped>
.editor-panel { padding: 0 12px 8px; }
.editor-container {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border);
  border-radius: 4px;
  padding: 8px;
}
.placeholder { color: var(--app-text-disabled); font-size: 13px; text-align: center; padding: 32px; }
</style>
