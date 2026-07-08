<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { NButton, NIcon, NDropdown, useDialog } from 'naive-ui'
import { ChevronForward, Add, Trash, Create, FolderOpen } from '@vicons/ionicons5'
import { useCollectionStore } from '@/stores/collection'
import RequestItem from './RequestItem.vue'
import type { Collection } from '@/db/models'

const props = defineProps<{ collection: Collection; depth: number }>()
const store = useCollectionStore()
const dialog = useDialog()
const expanded = ref(true)
const dragOver = ref(false)

const childCollections = computed(() => store.collections.filter(c => c.parentId === props.collection.id))
const childRequests = computed(() => store.requests.filter(r => r.collectionId === props.collection.id))

const contextMenuOptions = [
  { label: '新建请求', key: 'new-request', icon: () => h(NIcon, null, { default: () => h(Add) }) },
  { label: '新建子集合', key: 'new-folder', icon: () => h(NIcon, null, { default: () => h(FolderOpen) }) },
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(Create) }) },
  { type: 'divider' as const, key: 'd1' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(Trash) }) }
]

async function handleSelect(key: string) {
  if (key === 'new-request' && props.collection.id) {
    await store.createRequest(props.collection.id)
  } else if (key === 'new-folder' && props.collection.id) {
    await store.createCollection('新建子集合', props.collection.id)
  } else if (key === 'rename' && props.collection.id) {
    const newName = window.prompt('输入新名称：', props.collection.name)
    if (newName && newName.trim()) {
      await store.updateCollection(props.collection.id, { name: newName.trim() })
    }
  } else if (key === 'delete' && props.collection.id) {
    const childCount = childCollections.value.length + childRequests.value.length
    dialog.warning({
      title: '确认删除',
      content: childCount > 0
        ? `确定删除集合「${props.collection.name}」？其下的 ${childCount} 个子项（包括子集合和请求）也将被删除。`
        : `确定删除集合「${props.collection.name}」？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        await store.deleteCollection(props.collection.id!)
      }
    })
  }
}

// ====== Drag & Drop ======
function onDragStart(e: DragEvent) {
  if (!props.collection.id) return
  e.stopPropagation()
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('application/x-item-type', 'collection')
  e.dataTransfer!.setData('application/x-item-id', String(props.collection.id))
}

function onDragOver(e: DragEvent) {
  const type = e.dataTransfer?.types.includes('application/x-item-type')
  if (!type) return
  e.preventDefault()
  e.stopPropagation()
  e.dataTransfer!.dropEffect = 'move'
  dragOver.value = true
}

function onDragLeave(e: DragEvent) {
  // Only reset when actually leaving this element (not entering a child)
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const { clientX, clientY } = e
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    dragOver.value = false
  }
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  e.stopPropagation()
  dragOver.value = false

  const itemType = e.dataTransfer!.getData('application/x-item-type')
  const itemId = Number(e.dataTransfer!.getData('application/x-item-id'))
  if (!itemType || !itemId || !props.collection.id) return
  if (itemType === 'collection' && itemId === props.collection.id) return

  const sourceName = itemType === 'collection'
    ? store.collections.find(c => c.id === itemId)?.name || '集合'
    : store.requests.find(r => r.id === itemId)?.name || '请求'

  dialog.warning({
    title: '确认移动',
    content: `确定将「${sourceName}」移动到「${props.collection.name}」中？`,
    positiveText: '确定移动',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (itemType === 'collection') {
        await store.moveCollection(itemId, props.collection.id!)
      } else if (itemType === 'request') {
        await store.moveRequest(itemId, props.collection.id!)
      }
    }
  })
}
</script>

<template>
  <div class="collection-item">
    <div
      class="collection-header"
      :class="{ 'drag-over': dragOver }"
      :style="{ paddingLeft: `${8 + depth * 16}px` }"
      draggable="true"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <n-button text size="tiny" @click="expanded = !expanded" class="chevron-btn">
        <template #icon><n-icon :class="{ rotated: expanded }" class="chevron"><ChevronForward /></n-icon></template>
      </n-button>
      <n-dropdown trigger="click" :options="contextMenuOptions" @select="handleSelect">
        <span class="collection-name">📁 {{ collection.name }}</span>
      </n-dropdown>
      <n-button text size="tiny" @click="store.createRequest(collection.id!)" class="add-btn">
        <template #icon><n-icon><Add /></n-icon></template>
      </n-button>
    </div>
    <Transition name="collapse">
      <div v-if="expanded" class="collection-children">
        <CollectionItem v-for="child in childCollections" :key="child.id" :collection="child" :depth="depth + 1" />
        <RequestItem v-for="req in childRequests" :key="req.id" :request="req" :depth="depth + 1" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.collection-header {
  display: flex; align-items: center; gap: 2px;
  padding: 4px 8px 4px 4px; cursor: pointer; border-radius: 4px; margin: 1px 4px;
  border: 1px solid transparent; transition: all 0.15s;
}
.collection-header:hover { background: var(--app-hover-bg); }
.collection-header.drag-over {
  border-color: var(--app-active-border);
  background: var(--app-active-bg);
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.2);
}
.collection-name { font-size: 13px; font-weight: 600; flex: 1; color: var(--app-text); user-select: none; }
.chevron { transition: transform 0.2s; color: var(--app-text-disabled); }
.rotated { transform: rotate(90deg); }
.chevron-btn, .add-btn { opacity: 0.5; color: var(--app-text-disabled); }
.collection-header:hover .chevron-btn,
.collection-header:hover .add-btn { opacity: 1; }
.collection-children { border-left: 1px solid var(--app-guide-line); margin-left: 20px; }
</style>
