<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, useDialog } from 'naive-ui'
import { Add } from '@vicons/ionicons5'
import { useCollectionStore } from '@/stores/collection'
import CollectionItem from './CollectionItem.vue'

const store = useCollectionStore()
const dialog = useDialog()
const rootDragOver = ref(false)

onMounted(async () => {
  await store.loadCollections()
  await store.loadRequests()
})

// ====== Root-level drop zone ======
function onRootDragOver(e: DragEvent) {
  const hasType = e.dataTransfer?.types.includes('application/x-item-type')
  if (!hasType) return
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  rootDragOver.value = true
}

function onRootDragLeave(e: DragEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const { clientX, clientY } = e
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    rootDragOver.value = false
  }
}

async function onRootDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  rootDragOver.value = false

  const itemType = e.dataTransfer!.getData('application/x-item-type')
  const itemId = Number(e.dataTransfer!.getData('application/x-item-id'))
  if (!itemType || !itemId) return

  const sourceName = itemType === 'collection'
    ? store.collections.find(c => c.id === itemId)?.name || '集合'
    : store.requests.find(r => r.id === itemId)?.name || '请求'

  // If it's already at root level, skip
  if (itemType === 'collection') {
    const col = store.collections.find(c => c.id === itemId)
    if (col && col.parentId === null) return
  }

  dialog.warning({
    title: '确认移动',
    content: itemType === 'collection'
      ? `确定将「${sourceName}」移动到根级？`
      : `请求必须位于集合内，将自动创建新集合「${sourceName}」并将该请求移入。`,
    positiveText: '确定移动',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (itemType === 'collection') {
        await store.moveCollection(itemId, null)
      } else if (itemType === 'request') {
        // Requests must live inside a collection — create one at root level
        const newColId = await store.createCollection(sourceName, null)
        if (newColId) {
          await store.moveRequest(itemId, newColId)
        }
      }
    }
  })
}
</script>

<template>
  <div class="collection-tree">
    <div class="tree-header">
      <n-button text size="tiny" @click="store.createCollection('新建集合')">
        <template #icon><n-icon><Add /></n-icon></template>
        新建集合
      </n-button>
    </div>
    <div
      class="tree-list"
      :class="{ 'root-drag-over': rootDragOver }"
      @dragover="onRootDragOver"
      @dragleave="onRootDragLeave"
      @drop="onRootDrop"
    >
      <div v-for="col in store.collections.filter(c => !c.parentId)" :key="col.id">
        <CollectionItem :collection="col" :depth="0" />
      </div>
      <div v-if="store.collections.length === 0" class="empty-tree">
        暂无集合 — 点击上方创建一个
      </div>
      <div v-if="rootDragOver" class="root-drop-hint">松开以移动到根级</div>
    </div>
  </div>
</template>

<style scoped>
.collection-tree { padding: 4px 0; min-height: 100px; }
.tree-header {
  padding: 4px 8px 8px;
  border-bottom: 1px solid var(--app-border-light);
  margin-bottom: 4px;
}
.tree-list {
  padding: 0;
  min-height: 60px;
  border-radius: 4px;
  transition: all 0.15s;
}
.tree-list.root-drag-over {
  background: var(--app-active-bg);
  outline: 2px dashed var(--app-active-border);
  outline-offset: -2px;
}
.empty-tree { color: var(--app-text-disabled); font-size: 12px; padding: 16px; text-align: center; }
.root-drop-hint {
  text-align: center;
  padding: 8px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
</style>
