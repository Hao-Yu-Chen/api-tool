<script setup lang="ts">
import { computed, inject } from 'vue'
import { ChevronForward } from '@vicons/ionicons5'

const props = withDefaults(defineProps<{
  keyName: string | number | null
  value: unknown
  depth: number
  path: string
  expandedPaths: Set<string>
  maxInitialDepth: number
  isLast: boolean
}>(), {
  keyName: null,
  isLast: true
})

const visitedKey = Symbol('json-tree-visited')

type JsonType = 'null' | 'string' | 'number' | 'boolean' | 'object' | 'array'

const jsonType = computed<JsonType>(() => {
  if (props.value === null) return 'null'
  if (Array.isArray(props.value)) return 'array'
  const t = typeof props.value
  if (t === 'string') return 'string'
  if (t === 'number') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'object') return 'object'
  return 'null'
})

const displayValue = computed(() => {
  if (jsonType.value === 'string') return `"${props.value}"`
  if (jsonType.value === 'null') return 'null'
  return String(props.value)
})

const isExpandable = computed(() =>
  jsonType.value === 'object' || jsonType.value === 'array'
)

const isEmpty = computed(() => {
  if (jsonType.value === 'object') return Object.keys(props.value as object).length === 0
  if (jsonType.value === 'array') return (props.value as unknown[]).length === 0
  return false
})

const childEntries = computed<[string, unknown][]>(() => {
  if (jsonType.value === 'object') return Object.entries(props.value as object)
  if (jsonType.value === 'array') return (props.value as unknown[]).map((v, i) => [String(i), v])
  return []
})

const isExpanded = computed({
  get: () => props.expandedPaths.has(props.path),
  set: (v: boolean) => {
    if (v) props.expandedPaths.add(props.path)
    else props.expandedPaths.delete(props.path)
  }
})

// Auto-expand on mount up to maxInitialDepth
if (isExpandable.value && props.depth < props.maxInitialDepth) {
  props.expandedPaths.add(props.path)
}

function toggle() {
  isExpanded.value = !isExpanded.value
}
</script>

<template>
  <div class="json-tree-node">
    <!-- Toggle arrow -->
    <span
      v-if="isExpandable && !isEmpty"
      class="node-toggle"
      @click.stop="toggle"
    >
      <ChevronForward class="chevron" :class="{ rotated: isExpanded }" />
    </span>
    <span v-else class="node-toggle-spacer" />

    <!-- Key -->
    <span v-if="keyName !== null" class="node-key">
      <span class="key-str">"{{ keyName }}"</span><span class="node-colon">: </span>
    </span>

    <!-- Object -->
    <template v-if="jsonType === 'object'">
      <span class="bracket">{{ '{' }}</span>
      <span v-if="isEmpty" class="bracket">{{ '}' }}</span>
      <span v-else-if="!isExpanded" class="node-preview" @click="toggle">
        {{ '{…}' }}
        <span class="node-count">{{ childEntries.length }} props</span>
      </span>

      <template v-if="isExpanded && !isEmpty">
        <div class="node-children">
          <JsonTreeNode
            v-for="([key, val], index) in childEntries"
            :key="key"
            :key-name="key"
            :value="val"
            :depth="depth + 1"
            :path="`${path}['${key}']`"
            :expanded-paths="expandedPaths"
            :max-initial-depth="maxInitialDepth"
            :is-last="index === childEntries.length - 1"
          />
        </div>
        <div class="node-close-line">
          <span class="bracket">{{ '}' }}</span>
          <span v-if="!isLast" class="comma">,</span>
        </div>
      </template>

      <span v-if="!isEmpty && isExpanded" />
      <span v-if="isEmpty && !isLast" class="comma">,</span>
    </template>

    <!-- Array -->
    <template v-else-if="jsonType === 'array'">
      <span class="bracket">[</span>
      <span v-if="isEmpty" class="bracket">]</span>
      <span v-else-if="!isExpanded" class="node-preview" @click="toggle">
        […]
        <span class="node-count">{{ childEntries.length }} items</span>
      </span>

      <template v-if="isExpanded && !isEmpty">
        <div class="node-children">
          <JsonTreeNode
            v-for="([, val], index) in childEntries"
            :key="index"
            :key-name="index"
            :value="val"
            :depth="depth + 1"
            :path="`${path}[${index}]`"
            :expanded-paths="expandedPaths"
            :max-initial-depth="maxInitialDepth"
            :is-last="index === childEntries.length - 1"
          />
        </div>
        <div class="node-close-line">
          <span class="bracket">]</span>
          <span v-if="!isLast" class="comma">,</span>
        </div>
      </template>

      <span v-if="isEmpty && !isLast" class="comma">,</span>
    </template>

    <!-- Primitive -->
    <template v-else>
      <span :class="['primitive-value', `type-${jsonType}`]">{{ displayValue }}</span>
      <span v-if="!isLast" class="comma">,</span>
    </template>
  </div>
</template>

<style scoped>
.json-tree-node {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.55;
  white-space: nowrap;
  min-height: 21px;
}

.node-toggle {
  display: inline-flex;
  cursor: pointer;
  user-select: none;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  margin-right: 2px;
  vertical-align: middle;
  flex-shrink: 0;
}

.node-toggle-spacer {
  display: inline-block;
  width: 16px;
  margin-right: 2px;
  flex-shrink: 0;
}

.chevron {
  transition: transform 0.15s ease;
  font-size: 11px;
  color: var(--app-text-disabled);
}

.chevron.rotated {
  transform: rotate(90deg);
}

.node-key {
  color: var(--json-key-color);
}

.key-str {
  color: var(--json-key-color);
}

.node-colon {
  color: var(--app-text);
}

.bracket {
  color: var(--json-bracket-color);
}

.node-preview {
  cursor: pointer;
  color: var(--app-text-disabled);
  font-size: 12px;
  user-select: none;
}

.node-preview:hover {
  color: var(--app-text-secondary);
}

.node-count {
  font-size: 11px;
  color: var(--app-text-disabled);
  margin-left: 4px;
  font-style: italic;
}

.node-children {
  border-left: 1px solid var(--app-guide-line);
  margin-left: 3px;
  padding-left: 6px;
}

.node-close-line {
  /* closing bracket line */
}

.primitive-value {
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
}

.type-string {
  color: var(--json-string-color);
}

.type-number {
  color: var(--json-number-color);
}

.type-boolean {
  color: var(--json-boolean-color);
}

.type-null {
  color: var(--json-null-color);
  font-style: italic;
}

.comma {
  color: var(--app-text-disabled);
}
</style>
