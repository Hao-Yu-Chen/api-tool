<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CodeEditor from '@/components/shared/CodeEditor.vue'
import JsonTreeViewer from '@/components/shared/JsonTreeViewer.vue'

const props = defineProps<{ body: string; contentType: string }>()

const language = computed(() => {
  if (props.contentType.includes('json')) return 'json' as const
  if (props.contentType.includes('xml')) return 'xml' as const
  return 'text' as const
})

/** Try to pretty-print JSON, fall back to raw string */
const formattedBody = computed(() => {
  if (!props.body) return ''
  if (language.value === 'json') {
    try {
      return JSON.stringify(JSON.parse(props.body), null, 2)
    } catch {
      return props.body
    }
  }
  return props.body
})

// Recreate JsonTreeViewer when body changes (reset tree state)
const bodyVersion = ref(0)
watch(() => props.body, () => { bodyVersion.value++ })
</script>

<template>
  <div class="response-body">
    <template v-if="formattedBody && language === 'json'">
      <JsonTreeViewer
        :key="'json-resp-' + bodyVersion"
        :model-value="formattedBody"
        language="json"
        :readonly="true"
        default-view="tree"
      />
    </template>
    <CodeEditor v-else-if="formattedBody" :model-value="formattedBody" :language="language" :readonly="true" />
    <div v-else class="empty-body">响应体为空</div>
  </div>
</template>

<style scoped>
.response-body {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.empty-body { text-align: center; color: var(--app-text-disabled); padding: 32px; font-size: 13px; }
</style>
