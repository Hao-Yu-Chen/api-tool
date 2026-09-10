<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import {
  NButton,
  NTag,
  NIcon,
  NInputNumber,
  NSpace,
  NEmpty,
  NAlert,
  NModal,
  useMessage
} from 'naive-ui'
import { Add, Play, Stop, Refresh } from '@vicons/ionicons5'
import { useProxyStore } from '@/stores/proxy'
import ProxyRuleItem from './ProxyRuleItem.vue'
import ProxyRuleEditor from './ProxyRuleEditor.vue'
import type { ProxyRule } from '@/db/models'

const store = useProxyStore()
const message = useMessage()

const editorVisible = ref(false)
const showStopConfirm = ref(false)
const editingRule = ref<ProxyRule | null>(null)

// 端口输入（独立 ref，避免和 store.port 双向绑定延迟问题）
const portInput = ref(8899)

onMounted(async () => {
  await store.loadRules()
  if (store.isElectron()) {
    await store.refreshStatus()
    await store.refreshSystemState()
    await store.refreshCertStatus()
  }
  portInput.value = store.port
})

// ====== 规则操作 ======

function openAddRule() {
  editingRule.value = null
  editorVisible.value = true
}

function openEditRule(rule: ProxyRule) {
  editingRule.value = rule
  editorVisible.value = true
}

async function handleSave(data: Partial<ProxyRule>) {
  if (editingRule.value?.id) {
    await store.updateRule(editingRule.value.id, data)
  } else {
    await store.addRule(data)
  }
}

async function handleToggle(id: number) {
  await store.toggleRule(id)
}

async function handleDelete(id: number) {
  await store.deleteRule(id)
}

// ====== 代理控制 ======

async function handleStart() {
  // 校验端口
  if (portInput.value < 1024 || portInput.value > 65535) {
    message.warning('端口范围：1024-65535')
    return
  }

  const available = await store.checkPort(portInput.value)
  if (!available) {
    message.error(`端口 ${portInput.value} 已被占用，请更换`)
    return
  }

  store.port = portInput.value

  if (store.enabledRules.length === 0) {
    message.warning('没有已启用的规则，请先添加并启用规则')
    return
  }

  const error = await store.startProxy()
  if (error) {
    message.error(`代理启动失败：${error}`, { duration: 6000 })
  } else {
    message.success(`代理已启动，系统代理已指向 127.0.0.1:${store.port}`)
  }
}

function handleStopClick() {
  showStopConfirm.value = true
}

async function handleConfirmStop() {
  try {
    await store.stopProxy()
    showStopConfirm.value = false
    message.success('代理已停止，系统代理已恢复')
  } catch (err: any) {
    showStopConfirm.value = false
    message.error('停止失败: ' + (err?.message || '未知错误'))
    console.error('[ProxyPanel] stopProxy failed:', err)
  }
}

function handleCancelStop() {
  showStopConfirm.value = false
}

async function handleRefresh() {
  await store.refreshStatus()
  await store.refreshSystemState()
  await store.refreshCertStatus()
}

// ====== HTTPS 解密证书 ======

async function handleInstallCert() {
  const error = await store.installCert()
  if (error) {
    message.error(`安装失败：${error}`, { duration: 6000 })
  } else {
    message.success('根证书已安装，HTTPS 解密已开启')
  }
}

async function handleUninstallCert() {
  const error = await store.uninstallCert()
  if (error) {
    message.error(`卸载失败：${error}`, { duration: 6000 })
  } else {
    message.success('根证书已卸载')
  }
}

async function handleExportCert() {
  const result = await store.exportCert()
  if (result.error) {
    if (result.error !== '已取消') {
      message.error(`导出失败：${result.error}`)
    }
  } else {
    message.success(`已导出到 ${result.path}`)
  }
}

// ====== 计算属性 ======

const sortedRules = computed(() => store.sortedRules)
const enabledCount = computed(() => store.enabledRules.length)

/** 代理运行中，但系统代理没有指向本应用端口 */
const systemProxyMismatch = computed(() => {
  if (!store.isRunning || !store.systemState) return false
  const expected = `127.0.0.1:${store.port}`
  return store.systemState.proxyServer !== expected
})
</script>

<template>
  <div class="proxy-panel">
    <!-- Web 版提示 -->
    <n-alert
      v-if="!store.isElectron()"
      type="info"
      title="此功能仅在桌面版中可用"
      class="not-available-alert"
    >
      代理功能需要 Electron 桌面环境支持，请使用桌面版 API Tool。
    </n-alert>

    <!-- 状态区域 -->
    <div class="status-area">
      <div class="status-row">
        <div class="status-info">
          <n-tag :type="store.isRunning ? 'success' : 'default'" size="small" round>
            {{ store.isRunning ? '🟢 运行中' : '🔴 已停止' }}
          </n-tag>
          <span v-if="store.isRunning" class="port-label">
            :{{ store.port }}
          </span>
        </div>
        <n-space :size="8">
          <n-button
            v-if="!store.isRunning"
            type="primary"
            size="small"
            :disabled="!store.isElectron()"
            @click="handleStart"
          >
            <template #icon><n-icon :component="Play" /></template>
            启动代理
          </n-button>
          <n-button
            v-else
            type="error"
            size="small"
            @click="handleStopClick"
          >
            <template #icon><n-icon :component="Stop" /></template>
            停止代理
          </n-button>

          <n-button
            text
            size="small"
            :disabled="!store.isElectron()"
            @click="handleRefresh"
          >
            <template #icon><n-icon :component="Refresh" /></template>
          </n-button>
        </n-space>
      </div>

      <!-- 端口配置 -->
      <div class="port-row">
        <span class="port-label-text">端口</span>
        <n-input-number
          v-model:value="portInput"
          :min="1024"
          :max="65535"
          size="tiny"
          style="width: 100px"
          :disabled="store.isRunning"
          :show-button="false"
        />
      </div>

      <!-- HTTPS 解密 -->
      <div v-if="store.isElectron()" class="https-row">
        <div class="https-header">
          <span class="https-title">HTTPS 解密</span>
          <n-tag :type="store.certInstalled ? 'success' : 'warning'" size="small" round>
            {{ store.certInstalled ? '已信任根证书' : '未安装根证书' }}
          </n-tag>
        </div>
        <p class="https-hint">
          HTTPS 请求经过加密，只有在本机信任 API Tool 根证书后才能解密并改写地址，
          从而转发到 http 测试环境。
        </p>
        <n-space :size="8">
          <n-button
            v-if="!store.certInstalled"
            type="primary"
            size="tiny"
            :loading="store.certBusy"
            @click="handleInstallCert"
          >
            安装根证书
          </n-button>
          <n-button
            v-else
            size="tiny"
            :loading="store.certBusy"
            @click="handleUninstallCert"
          >
            卸载根证书
          </n-button>
          <n-button size="tiny" @click="handleExportCert">导出证书</n-button>
        </n-space>
        <p v-if="!store.certInstalled" class="https-warn">
          未安装时，https 请求只能整条隧道透传，无法改写路径或转发到 http 目标。
        </p>
      </div>

      <!-- 系统代理诊断 -->
      <div v-if="store.systemState" class="diag-row">
        <div class="diag-title">系统代理配置</div>
        <div class="diag-item">
          <span>启用</span>
          <code>{{ store.systemState.proxyEnable ?? '未设置' }}</code>
        </div>
        <div class="diag-item">
          <span>服务器</span>
          <code>{{ store.systemState.proxyServer ?? '未设置' }}</code>
        </div>
        <div class="diag-item">
          <span>绕过列表</span>
          <code>{{ store.systemState.proxyOverride ?? '无' }}</code>
        </div>
        <div v-if="store.systemState.autoDetect" class="diag-item">
          <span>自动检测</span>
          <code>{{ store.systemState.autoDetect }}</code>
        </div>
        <div v-if="store.systemState.autoConfigURL" class="diag-item">
          <span>PAC 脚本</span>
          <code>{{ store.systemState.autoConfigURL }}</code>
        </div>
        <div v-if="systemProxyMismatch" class="diag-warn">
          系统代理未指向本应用端口，请求不会经过本代理，请重新启动代理。
        </div>
      </div>
    </div>

    <!-- 规则列表 -->
    <div class="rules-section">
      <div class="rules-header">
        <span class="rules-title">
          转发规则
          <span class="rules-count">
            ({{ enabledCount }}/{{ sortedRules.length }} 启用)
          </span>
        </span>
        <n-button
          text
          size="small"
          @click="openAddRule"
        >
          <template #icon><n-icon :component="Add" /></template>
          新增规则
        </n-button>
      </div>

      <div class="rules-list">
        <div v-if="sortedRules.length === 0" class="empty-state">
          <n-empty description="暂无规则，点击上方新增规则" size="small" />
        </div>
        <ProxyRuleItem
          v-for="rule in sortedRules"
          :key="rule.id"
          :rule="rule"
          :disabled="false"
          @toggle="handleToggle"
          @edit="openEditRule"
          @delete="handleDelete"
        />
      </div>
    </div>

    <!-- 规则编辑器弹窗 -->
    <ProxyRuleEditor
      :visible="editorVisible"
      :rule="editingRule"
      @close="editorVisible = false"
      @save="handleSave"
    />

    <!-- 停止代理确认弹窗 -->
    <n-modal
      :show="showStopConfirm"
      preset="card"
      title="停止代理"
      style="width: 380px"
      :mask-closable="false"
      @update:show="(v: boolean) => { if (!v) handleCancelStop() }"
    >
      <p style="margin-bottom: 16px; color: var(--app-text-secondary);">
        停止代理将恢复系统代理设置，确认？
      </p>
      <n-space justify="end">
        <n-button @click="handleCancelStop">取消</n-button>
        <n-button type="error" @click="handleConfirmStop">确认停止</n-button>
      </n-space>
    </n-modal>
  </div>
</template>

<style scoped>
.proxy-panel {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.not-available-alert {
  margin-bottom: 4px;
  font-size: 12px;
}

/* 状态区域 */
.status-area {
  padding: 12px;
  border-radius: var(--app-radius-md);
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-light);
}
.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.status-info {
  display: flex;
  align-items: center;
  gap: 6px;
}
.port-label {
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  color: var(--app-active-border);
}
.port-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--app-border-light);
}
.port-label-text {
  font-size: 12px;
  color: var(--app-text-secondary);
}

/* HTTPS 解密 */
.https-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--app-border-light);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.https-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.https-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text);
}
.https-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--app-text-secondary);
}
.https-warn {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--app-warning, #f0a020);
}

/* 系统代理诊断 */
.diag-row {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--app-border-light);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.diag-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text);
}
.diag-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 11px;
  color: var(--app-text-secondary);
}
.diag-item span {
  flex: 0 0 60px;
}
.diag-item code {
  flex: 1;
  min-width: 0;
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--app-card-bg);
  border: 1px solid var(--app-border-light);
  font-size: 11px;
  word-break: break-all;
}
.diag-warn {
  margin-top: 4px;
  font-size: 11px;
  color: var(--app-warning, #f0a020);
}

/* 规则列表 */
.rules-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.rules-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.rules-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
}
.rules-count {
  font-size: 12px;
  font-weight: 400;
  color: var(--app-text-secondary);
}
.rules-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 2px;
}
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}
</style>
