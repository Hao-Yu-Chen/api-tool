<script setup lang="ts">
import { NButton, NInput, NCheckbox, NIcon } from 'naive-ui'
import { Add, Trash } from '@vicons/ionicons5'
import { nanoid } from 'nanoid'
import type { KeyValuePair } from '@/db/models'

const props = defineProps<{
  modelValue: KeyValuePair[]
  showDescription?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: KeyValuePair[]): void
}>()

function add() {
  const newList = [...props.modelValue, { id: nanoid(), key: '', value: '', enabled: true }]
  emit('update:modelValue', newList)
}

function remove(index: number) {
  const newList = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', newList)
}

function update(index: number, field: keyof KeyValuePair, val: unknown) {
  const newList = props.modelValue.map((item, i) =>
    i === index ? { ...item, [field]: val } : item
  )
  emit('update:modelValue', newList)
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
      <n-input
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
.kv-add-btn { margin-top: 6px; }
</style>
