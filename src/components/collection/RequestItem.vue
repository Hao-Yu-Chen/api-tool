<script setup lang="ts">
import { h } from 'vue'
import { NButton, NIcon, NDropdown, useDialog } from 'naive-ui'
import { Trash, Copy, Create } from '@vicons/ionicons5'
import { useCollectionStore } from '@/stores/collection'
import MethodBadge from '@/components/shared/MethodBadge.vue'
import type { ApiRequest } from '@/db/models'

const props = defineProps<{ request: ApiRequest; depth: number }>()
const store = useCollectionStore()
const dialog = useDialog()

const contextMenuOptions = [
  { label: '复制', key: 'duplicate', icon: () => h(NIcon, null, { default: () => h(Copy) }) },
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(Create) }) },
  { type: 'divider' as const, key: 'd1' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(Trash) }) }
]

async function handleSelect(key: string) {
  if (key === 'delete' && props.request.id) {
    dialog.warning({
      title: '确认删除',
      content: `确定删除请求「${props.request.name}」？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        await store.deleteRequest(props.request.id!)
      }
    })
  } else if (key === 'duplicate') {
    await store.createRequest(props.request.collectionId, {
      ...props.request,
      name: `${props.request.name} (副本)`,
      id: undefined
    })
  } else if (key === 'rename' && props.request.id) {
    const newName = window.prompt('输入新名称：', props.request.name)
    if (newName && newName.trim()) {
      await store.updateRequest(props.request.id, { name: newName.trim() })
    }
  }
}

// ====== Drag & Drop ======
let dragStarted = false

function onDragStart(e: DragEvent) {
  if (!props.request.id) return
  dragStarted = true
  e.stopPropagation()
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('application/x-item-type', 'request')
  e.dataTransfer!.setData('application/x-item-id', String(props.request.id))
}

function onDragEnd() {
  // Reset after a short delay so click handler can check the flag
  setTimeout(() => { dragStarted = false }, 50)
}

function onClick() {
  if (dragStarted) return
  store.setActiveRequest(props.request)
}
</script>

<template>
  <div
    class="request-item"
    :class="{ active: store.activeRequest?.id === request.id }"
    :style="{ paddingLeft: `${16 + depth * 16}px` }"
    draggable="true"
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @click="onClick"
  >
    <MethodBadge :method="request.method" />
    <span class="req-name">{{ request.name }}</span>
    <n-dropdown trigger="click" :options="contextMenuOptions" @select="handleSelect">
      <n-button text size="tiny" @click.stop class="more-btn">···</n-button>
    </n-dropdown>
  </div>
</template>

<style scoped>
.request-item {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 8px 5px 4px; cursor: grab; border-radius: 4px;
  font-size: 13px; margin: 1px 4px; border: 1px solid transparent;
  transition: all 0.15s;
}
.request-item:active { cursor: grabbing; }
.request-item:hover { background: var(--app-hover-bg); border-color: var(--app-border-light); }
.request-item.active { background: var(--app-active-bg); border-color: var(--app-active-border); }
.req-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; color: var(--app-text); }
.more-btn { opacity: 0; color: var(--app-text-disabled); }
.request-item:hover .more-btn { opacity: 1; }
</style>
