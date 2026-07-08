<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { NSelect, NButton, NModal } from 'naive-ui'
import { useEnvironmentStore } from '@/stores/environment'
import EnvManager from './EnvManager.vue'

const store = useEnvironmentStore()
const showManager = ref(false)

onMounted(() => store.loadEnvironments())

const options = computed(() =>
  store.environments.map(e => ({ label: e.name, value: e.id! }))
)

const activeId = computed({
  get: () => store.activeEnv?.id ?? null,
  set: (v: number | null) => {
    if (v) store.setActiveEnv(v)
    else store.clearActiveEnv()
  }
})
</script>

<template>
  <div class="env-selector">
    <n-select
      v-model:value="activeId" :options="options"
      placeholder="选择环境" clearable size="small" style="width: 160px"
    />
    <n-button text size="tiny" @click="showManager = true">管理</n-button>

    <n-modal
      v-model:show="showManager"
      preset="card"
      title="环境管理"
      style="width: 620px"
      :bordered="false"
      size="huge"
    >
      <template #header>
        <div class="modal-title">🌍 环境管理</div>
      </template>
      <EnvManager @close="showManager = false" />
    </n-modal>
  </div>
</template>

<style scoped>
.env-selector { display: flex; align-items: center; gap: 6px; }
.modal-title { font-size: 16px; font-weight: 700; }
</style>
