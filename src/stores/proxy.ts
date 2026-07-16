import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '@/db'
import type { ProxyRule } from '@/db/models'

export const useProxyStore = defineStore('proxy', () => {
  // ====== State ======
  const rules = ref<ProxyRule[]>([])
  const isRunning = ref(false)
  const port = ref(8899)
  const loading = ref(false)

  // ====== Computed ======
  const enabledRules = computed(() => rules.value.filter((r) => r.enabled))

  const sortedRules = computed(() =>
    [...rules.value].sort((a, b) => a.order - b.order)
  )

  // ====== 规则 CRUD ======

  async function loadRules(): Promise<void> {
    loading.value = true
    try {
      rules.value = await db.proxyRules.orderBy('order').toArray()
    } finally {
      loading.value = false
    }
  }

  async function addRule(data: Partial<ProxyRule>): Promise<number> {
    const plainData = JSON.parse(JSON.stringify(data))
    const maxOrder =
      rules.value.length > 0
        ? Math.max(...rules.value.map((r) => r.order))
        : -1
    const id = await db.proxyRules.add({
      name: plainData.name || 'New Rule',
      sourcePattern: plainData.sourcePattern || '',
      targetAddress: plainData.targetAddress || '',
      enabled: plainData.enabled ?? true,
      order: plainData.order ?? maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    await loadRules()
    await syncToProxy()
    return id as number
  }

  async function updateRule(
    id: number,
    data: Partial<ProxyRule>
  ): Promise<void> {
    const plain = JSON.parse(
      JSON.stringify({ ...data, updatedAt: Date.now() })
    )
    await db.proxyRules.update(id, plain)
    await loadRules()
    await syncToProxy()
  }

  async function deleteRule(id: number): Promise<void> {
    await db.proxyRules.delete(id)
    await loadRules()
    await syncToProxy()
  }

  async function toggleRule(id: number): Promise<void> {
    const rule = rules.value.find((r) => r.id === id)
    if (rule) {
      const plain = JSON.parse(JSON.stringify({ enabled: !rule.enabled, updatedAt: Date.now() }))
      await db.proxyRules.update(id, plain)
      await loadRules()
      await syncToProxy()
    }
  }

  async function reorderRules(fromIndex: number, toIndex: number): Promise<void> {
    const sorted = [...rules.value].sort((a, b) => a.order - b.order)
    const [moved] = sorted.splice(fromIndex, 1)
    sorted.splice(toIndex, 0, moved)

    const updates = sorted.map((r, i) => {
      if (r.order !== i) {
        return db.proxyRules.update(r.id!, { order: i, updatedAt: Date.now() })
      }
      return Promise.resolve()
    })
    await Promise.all(updates)
    await loadRules()
    await syncToProxy()
  }

  // ====== 运行时自动同步 ======

  /**
   * 代理运行时，将当前规则推送到主进程，实现热更新
   * 在所有规则变更操作（增删改/启用禁用/排序）后自动调用
   */
  async function syncToProxy(): Promise<void> {
    if (!isRunning.value) return
    const api = window.electronAPI
    if (!api) return
    try {
      await api.proxy.updateRules(JSON.parse(JSON.stringify(rules.value)))
      console.log('[proxyStore] 规则已同步到代理服务器')
    } catch (err) {
      console.warn('[proxyStore] 规则同步失败:', err)
    }
  }

  // ====== 代理生命周期 (IPC) ======

  /** 检查是否在 Electron 环境中 */
  function isElectron(): boolean {
    return typeof window !== 'undefined' && !!window.electronAPI?.isElectron
  }

  async function startProxy(): Promise<void> {
    const api = window.electronAPI
    if (!api || !api.isElectron) {
      console.warn('[proxyStore] 代理功能仅在桌面版中可用')
      return
    }
    try {
      const result = await api.proxy.start(
        port.value,
        JSON.parse(JSON.stringify(rules.value))
      )
      if (result.success) {
        isRunning.value = true
      } else {
        console.error('[proxyStore] 代理启动失败:', result.error)
      }
    } catch (err) {
      console.error('[proxyStore] startProxy error:', err)
    }
  }

  async function stopProxy(): Promise<void> {
    const api = window.electronAPI
    if (!api || !api.isElectron) return
    const result = await api.proxy.stop()
    isRunning.value = false
    if (!result.success) {
      console.warn('[proxyStore] stopProxy returned failure:', result)
    }
  }

  async function refreshStatus(): Promise<void> {
    const api = window.electronAPI
    if (!api || !api.isElectron) return
    try {
      const status = await api.proxy.status()
      isRunning.value = status.running
      if (status.running) {
        port.value = status.port
      }
    } catch (err) {
      console.error('[proxyStore] refreshStatus error:', err)
    }
  }

  async function checkPort(p: number): Promise<boolean> {
    const api = window.electronAPI
    if (!api || !api.isElectron) return false
    try {
      const result = await api.proxy.checkPort(p)
      return result.available
    } catch {
      return false
    }
  }

  return {
    // state
    rules,
    isRunning,
    port,
    loading,
    // computed
    enabledRules,
    sortedRules,
    // rules CRUD
    loadRules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    reorderRules,
    // proxy lifecycle
    isElectron,
    startProxy,
    stopProxy,
    refreshStatus,
    checkPort
  }
})
