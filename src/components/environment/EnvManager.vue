<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NButton, NInput, NSpace, NModal, NIcon, NPopconfirm, NTag, NDivider, NSwitch } from 'naive-ui'
import { Add, Trash, Create } from '@vicons/ionicons5'
import { useEnvironmentStore } from '@/stores/environment'
import type { Environment } from '@/db/models'
import KeyValueEditor from '@/components/shared/KeyValueEditor.vue'

defineEmits<{ (e: 'close'): void }>()

const store = useEnvironmentStore()
const editingEnv = ref<Environment | null>(null)
const showEditModal = computed({
  get: () => !!editingEnv.value,
  set: (v: boolean) => { if (!v) editingEnv.value = null }
})

onMounted(() => store.loadEnvironments())

async function createEnv() { await store.createEnvironment('New Environment') }

function editEnv(env: Environment) {
  const cloned = JSON.parse(JSON.stringify(env))
  // Provide defaults for newer fields that may be absent in old data
  cloned.baseUrl = cloned.baseUrl || ''
  cloned.baseUrlEnabled = !!cloned.baseUrlEnabled
  cloned.globalHeaders = cloned.globalHeaders || []
  editingEnv.value = cloned
}

function saveEnv() {
  if (!editingEnv.value?.id) return
  store.updateEnvironment(editingEnv.value.id, {
    name: editingEnv.value.name,
    variables: editingEnv.value.variables,
    baseUrl: editingEnv.value.baseUrl,
    baseUrlEnabled: editingEnv.value.baseUrlEnabled,
    globalHeaders: editingEnv.value.globalHeaders
  })
  editingEnv.value = null
}

const activeEnvId = computed(() => store.activeEnv?.id)
</script>

<template>
  <div class="env-manager">
    <!-- 总览统计 -->
    <div class="env-summary">
      <span class="summary-text">
        共 <strong>{{ store.environments.length }}</strong> 个环境
      </span>
      <span v-if="store.activeEnv" class="summary-active">
        当前激活：<n-tag type="info" size="small">{{ store.activeEnv.name }}</n-tag>
      </span>
    </div>

    <n-divider style="margin: 8px 0" />

    <!-- 环境列表 -->
    <div class="env-list">
      <div
        v-for="env in store.environments"
        :key="env.id"
        class="env-row"
        :class="{ 'env-row-active': env.id === activeEnvId }"
      >
        <div class="env-row-left">
          <span class="env-icon">📋</span>
          <div class="env-info">
            <span class="env-name">{{ env.name }}</span>
            <span class="env-meta">
              {{ env.variables.length }} 个变量
              <n-tag v-if="env.id === activeEnvId" type="info" size="tiny" :bordered="false">当前</n-tag>
            </span>
          </div>
        </div>
        <div class="env-row-actions">
          <n-button text size="tiny" @click="editEnv(env)">
            <template #icon><n-icon><Create /></n-icon></template>
            编辑
          </n-button>
          <n-popconfirm @positive-click="env.id && store.deleteEnvironment(env.id)">
            <template #trigger>
              <n-button text size="tiny" type="error">
                <template #icon><n-icon><Trash /></n-icon></template>
              </n-button>
            </template>
            确认删除「{{ env.name }}」？变量数据将一并删除。
          </n-popconfirm>
        </div>
      </div>

      <div v-if="store.environments.length === 0" class="env-empty">
        <div class="env-empty-icon">📭</div>
        <div class="env-empty-text">暂无环境</div>
        <div class="env-empty-desc">创建一个环境来管理 API 地址等变量</div>
      </div>
    </div>

    <n-divider style="margin: 12px 0" />

    <!-- 操作按钮 -->
    <div class="env-footer">
      <n-button dashed @click="createEnv">
        <template #icon><n-icon><Add /></n-icon></template>
        新建环境
      </n-button>
    </div>

    <!-- 编辑弹窗 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      style="width: 700px"
      :bordered="false"
      size="huge"
    >
      <template #header>
        <div class="edit-modal-title">
          <span class="edit-modal-icon">✏️</span>
          编辑环境变量
        </div>
      </template>
      <template v-if="editingEnv">
        <div class="edit-section">
          <div class="edit-section-label">环境名称</div>
          <n-input v-model:value="editingEnv.name" placeholder="例如：Development" />
        </div>
        <n-divider style="margin: 16px 0" />
        <div class="edit-section">
          <div class="edit-section-label">
            变量列表
            <span class="edit-section-hint">使用 {<!-- -->{ 变量名 }} 在 URL、Header、Body 中引用</span>
          </div>
          <div class="edit-vars-wrapper">
            <KeyValueEditor v-model="editingEnv.variables" :show-description="false" />
          </div>
        </div>

        <n-divider style="margin: 16px 0" />

        <!-- Base URL -->
        <div class="edit-section">
          <div class="edit-section-label">🌐 基础域名（Base URL）</div>
          <div class="base-url-row">
            <n-input
              v-model:value="editingEnv.baseUrl"
              placeholder="例如：https://api.example.com"
              class="base-url-input"
            />
            <div class="base-url-toggle">
              <n-switch v-model:value="editingEnv.baseUrlEnabled" size="small" />
              <span class="toggle-label">{{ editingEnv.baseUrlEnabled ? '已启用' : '已禁用' }}</span>
            </div>
          </div>
          <div class="edit-section-hint" style="margin-top: 4px">
            启用后，若请求 URL 不以 http:// 或 https:// 开头，将自动拼接此域名
          </div>
        </div>

        <n-divider style="margin: 16px 0" />

        <!-- Global Headers -->
        <div class="edit-section">
          <div class="edit-section-label">
            📎 全局请求头（Global Headers）
            <span class="edit-section-hint">未冲突时自动注入到每个请求</span>
          </div>
          <div class="edit-vars-wrapper">
            <KeyValueEditor v-model="editingEnv.globalHeaders" :show-description="false" />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="edit-modal-footer">
          <n-button @click="editingEnv = null">取消</n-button>
          <n-button type="primary" @click="saveEnv">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
/* ====== 主容器 ====== */
.env-manager {
  padding: 0;
}

/* ====== 顶部统计 ====== */
.env-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
}
.summary-text {
  font-size: 13px;
  color: var(--app-text-secondary);
}
.summary-text strong {
  color: var(--app-text);
}
.summary-active {
  font-size: 12px;
  color: var(--app-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* ====== 环境列表 ====== */
.env-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.env-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid var(--app-border);
  background: var(--app-card-bg);
  transition: all 0.15s;
}
.env-row:hover {
  border-color: var(--app-active-border);
  background: var(--app-hover-bg);
}
.env-row-active {
  border-color: rgba(24, 144, 255, 0.4);
  box-shadow: 0 0 0 1px rgba(24, 144, 255, 0.1);
}

.env-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.env-icon { font-size: 18px; flex-shrink: 0; }

.env-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.env-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--app-text);
}

.env-meta {
  font-size: 12px;
  color: var(--app-text-disabled);
  display: flex;
  align-items: center;
  gap: 6px;
}

.env-row-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

/* ====== 空状态 ====== */
.env-empty {
  text-align: center;
  padding: 32px 16px;
}
.env-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: 0.4; }
.env-empty-text { font-size: 14px; font-weight: 600; color: var(--app-text-secondary); margin-bottom: 4px; }
.env-empty-desc { font-size: 12px; color: var(--app-text-disabled); }

/* ====== 底部操作 ====== */
.env-footer {
  display: flex;
  justify-content: center;
}

/* ====== 编辑弹窗 ====== */
.edit-modal-title {
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}
.edit-modal-icon { font-size: 18px; }

.edit-section-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.edit-section-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--app-text-disabled);
}

.edit-vars-wrapper {
  background: var(--app-card-bg);
  border: 1px solid var(--app-border);
  border-radius: 6px;
  padding: 10px;
}

.edit-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ====== Base URL ====== */
.base-url-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.base-url-input {
  flex: 1;
}
.base-url-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  white-space: nowrap;
}
.toggle-label {
  font-size: 12px;
  color: var(--app-text-secondary);
  min-width: 42px;
}
</style>
