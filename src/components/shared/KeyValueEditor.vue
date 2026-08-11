<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NInput, NCheckbox, NSelect, NIcon } from 'naive-ui'
import { Add, Trash, Close } from '@vicons/ionicons5'
import { nanoid } from 'nanoid'
import type { KeyValuePair } from '@/db/models'

const props = withDefaults(defineProps<{
  modelValue: KeyValuePair[]
  showDescription?: boolean
  allowFiles?: boolean
}>(), {
  showDescription: false,
  allowFiles: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: KeyValuePair[]): void
  (e: 'fileChange', payload: { id: string; file: File | null }): void
}>()

const typeOptions = [
  { label: '文本', value: 'text' },
  { label: '文件', value: 'file' }
]

// Track file input refs per row
const fileInputs = ref<Record<string, HTMLInputElement | null>>({})

function add() {
  const newItem: KeyValuePair = {
    id: nanoid(),
    key: '',
    value: '',
    enabled: true,
    type: props.allowFiles ? 'text' : undefined
  }
  const newList = [...props.modelValue, newItem]
  emit('update:modelValue', newList)
}

function remove(index: number) {
  const item = props.modelValue[index]
  if (item?.id) {
    emit('fileChange', { id: item.id, file: null })
  }
  const newList = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', newList)
}

function update(index: number, field: keyof KeyValuePair, val: unknown) {
  const newList = props.modelValue.map((item, i) =>
    i === index ? { ...item, [field]: val } : item
  )
  emit('update:modelValue', newList)
}

function onTypeChange(index: number, newType: 'text' | 'file') {
  const item = props.modelValue[index]
  if (newType === 'text' && item.type === 'file' && item.id) {
    emit('fileChange', { id: item.id, file: null })
    // Clear file metadata when switching back to text
    const newList = props.modelValue.map((row, i) =>
      i === index ? { ...row, type: 'text' as const, value: '', fileName: undefined } : row
    )
    emit('update:modelValue', newList)
    return
  }
  update(index, 'type', newType)
}

function triggerFileInput(rowId: string) {
  const input = fileInputs.value[rowId]
  if (input) {
    input.click()
  }
}

function handleFileChange(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const item = props.modelValue[index]
  const newList = props.modelValue.map((row, i) =>
    i === index
      ? { ...row, value: file.name, fileName: file.name }
      : row
  )
  emit('update:modelValue', newList)
  emit('fileChange', { id: item.id, file })

  // Reset input so the same file can be re-selected
  input.value = ''
}

function clearFile(index: number) {
  const item = props.modelValue[index]
  emit('fileChange', { id: item.id, file: null })
  const newList = props.modelValue.map((row, i) =>
    i === index
      ? { ...row, value: '', fileName: undefined }
      : row
  )
  emit('update:modelValue', newList)
}

function setFileInputRef(rowId: string, el: HTMLInputElement | null) {
  fileInputs.value[rowId] = el
}
</script>

<template>
  <div class="kv-editor">
    <TransitionGroup name="kv-row">
      <div v-for="(item, index) in modelValue" :key="item.id" class="kv-row">
        <n-checkbox
          :checked="item.enabled"
          @update:checked="(v: boolean) => update(index, 'enabled', v)"
          size="small"
        />
        <n-input
          :value="item.key"
          @update:value="(v: string) => update(index, 'key', v)"
          placeholder="Key"
          size="small"
          class="kv-key"
        />

        <!-- Type select dropdown (between key and value) -->
        <n-select
          v-if="allowFiles"
          :value="item.type || 'text'"
          @update:value="(v: 'text' | 'file') => onTypeChange(index, v)"
          :options="typeOptions"
          size="small"
          class="kv-type-select"
        />

        <!-- File type row -->
        <template v-if="allowFiles && item.type === 'file'">
          <div class="kv-file-area">
            <input
              :ref="(el: unknown) => setFileInputRef(item.id, el as HTMLInputElement | null)"
              type="file"
              style="display: none"
              @change="(e: Event) => handleFileChange(index, e)"
            />
            <n-button
              v-if="!item.fileName"
              size="small"
              dashed
              @click="triggerFileInput(item.id)"
              class="kv-file-btn"
            >
              选择文件
            </n-button>
            <div v-else class="kv-file-info">
              <span class="kv-file-name" :title="item.fileName">{{ item.fileName }}</span>
              <n-button text size="tiny" type="error" @click="clearFile(index)">
                <template #icon><n-icon><Close /></n-icon></template>
              </n-button>
            </div>
          </div>
        </template>

        <!-- Text type row (default) -->
        <n-input
          v-else
          :value="item.value"
          @update:value="(v: string) => update(index, 'value', v)"
          placeholder="Value"
          size="small"
          class="kv-value"
        />

        <n-input
          v-if="showDescription"
          :value="item.description || ''"
          @update:value="(v: string) => update(index, 'description', v)"
          placeholder="备注"
          size="small"
          class="kv-desc"
        />

        <n-button text type="error" @click="remove(index)" size="tiny">
          <template #icon><n-icon><Trash /></n-icon></template>
        </n-button>
      </div>
    </TransitionGroup>
    <n-button dashed size="small" @click="add" class="kv-add-btn">
      <template #icon><n-icon><Add /></n-icon></template>
      添加
    </n-button>
  </div>
</template>

<style scoped>
.kv-editor {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kv-row {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 2px 0;
}
.kv-desc { width: 120px; flex-shrink: 0; }
.kv-key { flex: 0 0 200px; }
.kv-value { flex: 1; }
.kv-type-select { width: 80px; flex-shrink: 0; }
.kv-add-btn { margin-top: 6px; }

/* File area */
.kv-file-area {
  flex: 1;
  min-width: 0;
}
.kv-file-btn {
  width: 100%;
}
.kv-file-info {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--app-surface-bg);
  border: 1px solid var(--app-border);
  border-radius: 3px;
  font-size: 12px;
}
.kv-file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--app-text-secondary);
}
</style>
