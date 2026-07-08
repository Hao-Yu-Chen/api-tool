<script setup lang="ts">
import type { HttpMethod } from '@/db/models'

defineProps<{ method: HttpMethod }>()

const colorMap: Record<HttpMethod, string> = {
  GET: '#52c41a',
  POST: '#1890ff',
  PUT: '#fa8c16',
  DELETE: '#ff4d4f',
  PATCH: '#722ed1',
  HEAD: '#8c8c8c',
  OPTIONS: '#8c8c8c'
}
</script>

<template>
  <span
    class="method-badge"
    :style="{
      color: colorMap[method],
      fontWeight: '700',
      fontSize: '12px',
      fontFamily: 'monospace',
      minWidth: '56px',
      display: 'inline-block'
    }"
  >
    {{ method }}
  </span>
</template>
