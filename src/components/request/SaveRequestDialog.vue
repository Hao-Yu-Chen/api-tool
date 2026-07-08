<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NInput, NButton, NSpace, NRadio, NIcon, NDivider, NCard } from 'naive-ui'
import { FolderOutline, DocumentTextOutline } from '@vicons/ionicons5'
import { useCollectionStore } from '@/stores/collection'
import MethodBadge from '@/components/shared/MethodBadge.vue'
import type { HttpMethod, Collection, ApiRequest } from '@/db/models'

const props = defineProps<{
  show: boolean
  requestName: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'save': [collectionId: number, name: string]
}>()

const store = useCollectionStore()

const selectedCollectionId = ref<number>(0) // 0 = root
const editName = ref('')
const saving = ref(false)

interface TreeOption {
  type: 'separator' | 'root' | 'collection' | 'request'
  id: number
  name: string
  depth: number
  method?: HttpMethod
  indent?: number
}

const treeOptions = computed<TreeOption[]>(() => {
  const options: TreeOption[] = []

  // Root option
  options.push({
    type: 'root',
    id: 0,
    name: `根级 — 将自动创建新集合「${editName.value || '新建请求'}」`,
    depth: 0
  })

  // Separator
  if (store.collections.length > 0) {
    options.push({ type: 'separator', id: -1, name: '', depth: 0 })
  }

  // Recursively add collections
  function addChildren(parentId: number | null, depth: number) {
    const children = store.collections.filter(c => c.parentId === parentId)
    for (const col of children) {
      if (!col.id) continue
      options.push({ type: 'collection', id: col.id, name: col.name, depth })

      // Show child requests as context
      const childReqs = store.requests.filter(r => r.collectionId === col.id)
      for (const req of childReqs) {
        if (!req.id) continue
        options.push({
          type: 'request',
          id: req.id,
          name: req.name,
          depth: depth + 1,
          method: req.method
        })
      }

      // Recursively add nested collections
      addChildren(col.id, depth + 1)
    }
  }

  addChildren(null, 0)
  return options
})

// Reset state when dialog opens
watch(() => props.show, (val) => {
  if (val) {
    editName.value = props.requestName || ''
    selectedCollectionId.value = 0
    saving.value = false
  }
})

async function handleSave() {
  if (saving.value) return
  saving.value = true
  try {
    emit('save', selectedCollectionId.value, editName.value || '新建请求')
  } finally {
    // Let parent close dialog after save completes
    saving.value = false
  }
}

function handleClose() {
  emit('update:show', false)
}

function selectCollection(id: number) {
  selectedCollectionId.value = id
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="保存请求"
    style="max-width: 480px;"
    :mask-closable="false"
    @update:show="(v: boolean) => { if (!v) handleClose() }"
  >
    <template #header>
      <div class="dialog-header">
        <n-icon size="20"><FolderOutline /></n-icon>
        <span>保存请求</span>
      </div>
    </template>

    <div class="dialog-body">
      <!-- Request name -->
      <div class="form-group">
        <label class="form-label">请求名称</label>
        <n-input
          v-model:value="editName"
          placeholder="输入请求名称"
          size="small"
        />
      </div>

      <!-- Collection tree -->
      <div class="form-group">
        <label class="form-label">选择保存位置</label>
        <div class="tree-selector">
          <div
            v-for="option in treeOptions"
            :key="option.type + '-' + option.id"
            class="tree-option"
            :class="{
              'option-root': option.type === 'root',
              'option-collection': option.type === 'collection',
              'option-request': option.type === 'request',
              'option-selected': selectedCollectionId === option.id && option.type !== 'request',
              'option-separator': option.type === 'separator'
            }"
            :style="{
              paddingLeft: option.type === 'root' ? '8px' : `${8 + option.depth * 22}px`
            }"
            @click="option.type !== 'request' && option.type !== 'separator' ? selectCollection(option.id) : undefined"
          >
            <!-- Separator -->
            <template v-if="option.type === 'separator'">
              <n-divider style="margin: 4px 0" />
            </template>

            <!-- Root option -->
            <template v-else-if="option.type === 'root'">
              <n-radio
                :checked="selectedCollectionId === 0"
                style="margin-right: 6px"
              />
              <span class="option-icon">🏠</span>
              <span class="option-text">{{ option.name }}</span>
            </template>

            <!-- Collection option -->
            <template v-else-if="option.type === 'collection'">
              <n-radio
                :checked="selectedCollectionId === option.id"
                style="margin-right: 6px"
              />
              <n-icon size="16" style="margin-right: 4px; color: var(--app-text-secondary)">
                <FolderOutline />
              </n-icon>
              <span class="option-text">{{ option.name }}</span>
            </template>

            <!-- Request option (disabled, context only) -->
            <template v-else-if="option.type === 'request'">
              <span class="option-spacer" />
              <n-icon size="14" style="margin-right: 4px; color: var(--app-text-disabled)">
                <DocumentTextOutline />
              </n-icon>
              <MethodBadge v-if="option.method" :method="option.method" />
              <span class="option-text-disabled">{{ option.name }}</span>
            </template>
          </div>
        </div>

        <div v-if="store.collections.length === 0" class="empty-hint">
          暂无集合。选择「根级」将自动创建新集合。
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <n-space>
          <n-button @click="handleClose" size="small">取消</n-button>
          <n-button
            type="primary"
            size="small"
            :loading="saving"
            @click="handleSave"
          >
            保存
          </n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text-secondary);
}

.tree-selector {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--app-border-light);
  border-radius: 4px;
  background: var(--app-surface-bg);
}

.tree-option {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}

.tree-option:hover {
  background: var(--app-hover-bg);
}

.option-separator {
  cursor: default;
  padding: 0;
}

.option-request {
  cursor: default;
  opacity: 0.55;
}

.option-request:hover {
  background: transparent;
}

.option-spacer {
  display: inline-block;
  width: 20px;
  flex-shrink: 0;
}

.option-text {
  font-size: 13px;
  color: var(--app-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-text-disabled {
  font-size: 12px;
  color: var(--app-text-disabled);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-icon {
  margin-right: 4px;
  font-size: 14px;
}

.empty-hint {
  font-size: 12px;
  color: var(--app-text-disabled);
  padding: 8px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
