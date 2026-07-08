<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NButtonGroup, NIcon } from 'naive-ui'
import { CodeSlash, GitBranchOutline } from '@vicons/ionicons5'
import CodeEditor from './CodeEditor.vue'
import JsonTreeNode from './JsonTreeNode.vue'

const props = withDefaults(defineProps<{
  modelValue: string
  readonly?: boolean
  language?: 'json' | 'xml' | 'text'
  maxExpandDepth?: number
  defaultView?: 'code' | 'tree'
}>(), {
  readonly: true,
  language: 'json' as const,
  maxExpandDepth: 2,
  defaultView: 'code'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const viewMode = ref<'code' | 'tree'>('code')
const expandedPaths = ref(new Set<string>())

const parsedData = computed<unknown>(() => {
  if (!props.modelValue.trim()) return null
  try {
    return JSON.parse(props.modelValue)
  } catch {
    return undefined
  }
})

const parseError = computed(() => parsedData.value === undefined)

// Auto-switch to tree view on mount when defaultView is tree and JSON is valid
onMounted(() => {
  if (props.defaultView === 'tree' && !parseError.value && props.modelValue.trim()) {
    viewMode.value = 'tree'
  }
})

/** Recursively collect all object/array paths */
function collectAllPaths(data: unknown, prefix: string): string[] {
  if (data === null || typeof data !== 'object') return []
  const paths: string[] = []
  if (Array.isArray(data)) {
    paths.push(prefix)
    data.forEach((item, i) => {
      paths.push(...collectAllPaths(item, `${prefix}[${i}]`))
    })
  } else {
    paths.push(prefix)
    Object.entries(data as object).forEach(([key, val]) => {
      paths.push(...collectAllPaths(val, `${prefix}['${key}']`))
    })
  }
  return paths
}

function expandAll() {
  if (parsedData.value && typeof parsedData.value === 'object') {
    const allPaths = collectAllPaths(parsedData.value, '$')
    expandedPaths.value = new Set(allPaths)
  }
}

function collapseAll() {
  expandedPaths.value = new Set<string>()
}
</script>

<template>
  <div class="json-tree-viewer">
    <!-- Toolbar -->
    <div class="tree-toolbar">
      <n-button-group size="tiny">
        <n-button
          :type="viewMode === 'code' ? 'primary' : 'default'"
          @click="viewMode = 'code'"
        >
          <template #icon><n-icon><CodeSlash /></n-icon></template>
          Code
        </n-button>
        <n-button
          :type="viewMode === 'tree' ? 'primary' : 'default'"
          :disabled="parseError"
          @click="viewMode = 'tree'"
        >
          <template #icon><n-icon><GitBranchOutline /></n-icon></template>
          Tree
        </n-button>
      </n-button-group>

      <template v-if="viewMode === 'tree' && !parseError">
        <n-button size="tiny" @click="expandAll">展开全部</n-button>
        <n-button size="tiny" @click="collapseAll">收起全部</n-button>
      </template>
    </div>

    <!-- Body -->
    <div class="tree-body">
      <template v-if="viewMode === 'code'">
        <CodeEditor
          :model-value="modelValue"
          :language="language"
          :readonly="readonly"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </template>

      <template v-else-if="viewMode === 'tree' && parseError">
        <div class="parse-error">
          <span class="error-icon">⚠️</span>
          无法解析 JSON，请切换到 Code 视图检查格式
        </div>
      </template>

      <template v-else-if="viewMode === 'tree' && parsedData !== null">
        <div class="tree-view">
          <JsonTreeNode
            :key-name="null"
            :value="parsedData"
            :depth="0"
            path="$"
            :expanded-paths="expandedPaths"
            :max-initial-depth="maxExpandDepth"
            :is-last="true"
          />
        </div>
      </template>

      <template v-else>
        <CodeEditor
          :model-value="modelValue"
          :language="language"
          :readonly="readonly"
          @update:model-value="emit('update:modelValue', $event)"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.json-tree-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--app-border-light);
  background: var(--app-surface-bg);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.tree-body {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.tree-view {
  padding: 10px 12px;
  overflow: auto;
}

.parse-error {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--app-text-disabled);
  font-size: 13px;
}

.error-icon {
  font-size: 18px;
}
</style>
