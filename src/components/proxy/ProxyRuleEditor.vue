<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  NButton,
  NSpace,
  useMessage
} from 'naive-ui'
import type { ProxyRule } from '@/db/models'

const props = defineProps<{
  visible: boolean
  rule: ProxyRule | null // null = 新增模式
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<ProxyRule>]
}>()

const message = useMessage()

const name = ref('')
const sourcePattern = ref('')
const targetAddress = ref('')
const enabled = ref(true)

// 编辑模式载入已有数据
watch(
  () => props.visible,
  (v) => {
    if (v) {
      if (props.rule) {
        name.value = props.rule.name
        sourcePattern.value = props.rule.sourcePattern
        targetAddress.value = props.rule.targetAddress
        enabled.value = props.rule.enabled
      } else {
        name.value = ''
        sourcePattern.value = ''
        targetAddress.value = ''
        enabled.value = true
      }
    }
  }
)

function handleSave() {
  if (!name.value.trim()) {
    message.warning('请输入规则名称')
    return
  }
  if (!sourcePattern.value.trim()) {
    message.warning('请输入源匹配模式')
    return
  }
  if (!targetAddress.value.trim()) {
    message.warning('请输入目标地址')
    return
  }

  // 基本格式校验
  try {
    new URL(sourcePattern.value.replace(/\*/g, 'x'))
  } catch {
    message.warning('源匹配模式不是有效的 URL 格式')
    return
  }
  try {
    new URL(targetAddress.value.replace(/\*/g, 'x'))
  } catch {
    message.warning('目标地址不是有效的 URL 格式')
    return
  }

  emit('save', {
    name: name.value.trim(),
    sourcePattern: sourcePattern.value.trim(),
    targetAddress: targetAddress.value.trim(),
    enabled: enabled.value
  })
  emit('close')
}

function handleCancel() {
  emit('close')
}

const title = computed(() => (props.rule ? '编辑规则' : '新增规则'))
</script>

<template>
  <n-modal :show="visible" :title="title" preset="card" style="width: 520px" :mask-closable="false" @close="handleCancel">
    <n-form label-placement="top">
      <n-form-item label="规则名称" required>
        <n-input
          v-model:value="name"
          placeholder="例如：API 转发到本地"
          :maxlength="100"
        />
      </n-form-item>

      <n-form-item label="源匹配模式" required>
        <n-input
          v-model:value="sourcePattern"
          placeholder="http://domain.com/api/user/**"
          :maxlength="500"
        />
        <span class="field-hint">
          <code>*</code> 匹配单层 URI 段，<code>**</code> 匹配多层 URI 段
        </span>
      </n-form-item>

      <n-form-item label="目标地址" required>
        <n-input
          v-model:value="targetAddress"
          placeholder="http://192.168.3.18:8080/api/user/admin/**"
          :maxlength="500"
        />
        <span class="field-hint">
          使用 <code>*</code> / <code>**</code> 对应源模式中的捕获内容
        </span>
      </n-form-item>

      <n-form-item label="启用">
        <n-switch v-model:value="enabled" />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleCancel">取消</n-button>
        <n-button type="primary" @click="handleSave">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
.field-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--app-text-secondary);
}
.field-hint code {
  padding: 0 4px;
  border-radius: 3px;
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-light);
  font-size: 11px;
}
</style>
