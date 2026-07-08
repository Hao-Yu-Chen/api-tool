<script setup lang="ts">
import { NTabs, NTabPane } from 'naive-ui'
import HeadersEditor from './HeadersEditor.vue'
import ParamsEditor from './ParamsEditor.vue'
import BodyEditor from './BodyEditor.vue'
import AuthEditor from './AuthEditor.vue'
</script>

<template>
  <div class="request-tabs-wrapper">
    <n-tabs type="line" size="small" default-value="headers" animated>
      <n-tab-pane name="headers" tab="Headers">
        <div class="tab-panel"><HeadersEditor /></div>
      </n-tab-pane>
      <n-tab-pane name="params" tab="Params">
        <div class="tab-panel"><ParamsEditor /></div>
      </n-tab-pane>
      <n-tab-pane name="body" tab="Body">
        <div class="tab-panel"><BodyEditor /></div>
      </n-tab-pane>
      <n-tab-pane name="auth" tab="Auth">
        <div class="tab-panel"><AuthEditor /></div>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<style scoped>
.request-tabs-wrapper { background: var(--app-panel-bg); }
.request-tabs-wrapper :deep(.n-tabs-nav) { padding-left: 12px; }
.tab-panel { padding: 8px 0; min-height: 120px; }
</style>
