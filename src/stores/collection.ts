import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { nanoid } from 'nanoid'
import { db } from '@/db'
import type { Collection, ApiRequest, HttpMethod, KeyValuePair } from '@/db/models'
import type { ResponseData } from '@/composables/useRequest'

export interface TabState {
  id: string
  request: ApiRequest
  response: ResponseData | null
}

export interface CollectionTreeNode {
  id: number
  name: string
  type: 'collection'
  children: (CollectionTreeNode | RequestTreeNode)[]
}

export interface RequestTreeNode {
  id: number
  name: string
  type: 'request'
  method: HttpMethod
}

export const useCollectionStore = defineStore('collection', () => {
  const collections = ref<Collection[]>([])
  const requests = ref<ApiRequest[]>([])
  const activeRequest = ref<ApiRequest | null>(null)
  const loading = ref(false)

  // ====== Tab state ======
  const tabs = ref<TabState[]>([])
  const activeTabId = ref<string | null>(null)

  /** Current tab's response (for HomeView → ResponseViewer) */
  const activeResponse = computed<ResponseData | null>(() => {
    const tab = tabs.value.find(t => t.id === activeTabId.value)
    return tab?.response ?? null
  })

  async function loadCollections(): Promise<void> {
    loading.value = true
    try {
      collections.value = await db.collections.orderBy('order').toArray()
    } finally {
      loading.value = false
    }
  }

  async function loadRequests(collectionId?: number): Promise<void> {
    try {
      if (collectionId !== undefined) {
        requests.value = await db.requests
          .where('collectionId').equals(collectionId)
          .sortBy('order')
      } else {
        requests.value = await db.requests.orderBy('order').toArray()
      }
    } catch (err) {
      console.error('[collectionStore] loadRequests error:', err)
      // Keep existing data on error
    }
  }

  async function createCollection(name: string, parentId: number | null = null): Promise<number> {
    const id = await db.collections.add({
      name,
      description: '',
      parentId,
      order: collections.value.length,
      createdAt: Date.now()
    })
    await loadCollections()
    return id as number
  }

  async function updateCollection(id: number, data: Partial<Collection>): Promise<void> {
    const plain = JSON.parse(JSON.stringify(data))
    await db.collections.update(id, plain)
    await loadCollections()
  }

  async function deleteCollection(id: number): Promise<void> {
    const childCollections = collections.value.filter(c => c.parentId === id)
    for (const child of childCollections) {
      if (child.id) await deleteCollection(child.id)
    }
    const childRequests = await db.requests.where('collectionId').equals(id).toArray()
    for (const req of childRequests) {
      if (req.id) await db.requests.delete(req.id)
    }
    await db.collections.delete(id)
    await Promise.all([loadCollections(), loadRequests()])
    if (activeRequest.value?.collectionId === id) {
      activeRequest.value = null
    }
  }

  async function createRequest(collectionId: number, data: Partial<ApiRequest> = {}): Promise<number> {
    // Deep clone incoming data to strip Vue reactivity proxies
    const plainData = JSON.parse(JSON.stringify(data))
    const id = await db.requests.add({
      collectionId,
      name: plainData.name || 'New Request',
      method: plainData.method || 'GET',
      url: plainData.url || '',
      params: plainData.params || [],
      headers: plainData.headers || [{ id: nanoid(), key: 'Content-Type', value: 'application/json', enabled: true }],
      body: plainData.body || { type: 'none' },
      auth: plainData.auth || { type: 'none' },
      order: plainData.order ?? requests.value.filter(r => r.collectionId === collectionId).length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
    // Load ALL data so sidebar stays in sync across collections
    await Promise.all([loadCollections(), loadRequests()])
    return id as number
  }

  async function updateRequest(id: number, data: Partial<ApiRequest>): Promise<void> {
    try {
      // Deep clone to strip Vue reactivity proxies before IndexedDB storage
      const plain = JSON.parse(JSON.stringify({ ...data, updatedAt: Date.now() }))
      await db.requests.update(id, plain)
      await Promise.all([loadCollections(), loadRequests()])
      if (activeRequest.value?.id === id) {
        const updated = await db.requests.get(id)
        if (updated) activeRequest.value = JSON.parse(JSON.stringify(updated))
      }
    } catch (err) {
      console.error('[collectionStore] updateRequest error:', err)
    }
  }

  async function deleteRequest(id: number): Promise<void> {
    await db.requests.delete(id)
    await loadRequests()
    if (activeRequest.value?.id === id) {
      activeRequest.value = null
    }
  }

  async function moveRequest(id: number, newCollectionId: number): Promise<void> {
    await db.requests.update(id, { collectionId: newCollectionId, updatedAt: Date.now() })
    await Promise.all([loadCollections(), loadRequests()])
    if (activeRequest.value?.id === id) {
      const updated = await db.requests.get(id)
      if (updated) activeRequest.value = { ...updated }
    }
  }

  async function moveCollection(id: number, newParentId: number | null): Promise<void> {
    // Prevent cycles: if newParentId is a descendant of id, reject
    if (newParentId !== null && isDescendantOf(id, newParentId)) return
    await db.collections.update(id, { parentId: newParentId })
    await Promise.all([loadCollections(), loadRequests()])
  }

  function isDescendantOf(ancestorId: number, targetId: number): boolean {
    const children = collections.value.filter(c => c.parentId === targetId)
    for (const child of children) {
      if (child.id === ancestorId) return true
      if (child.id && isDescendantOf(ancestorId, child.id)) return true
    }
    return false
  }

  // ====== Tab management ======

  function openTab(request: ApiRequest, response?: ResponseData | null): string {
    // Check if tab already exists for a saved request
    if (request.id) {
      const existing = tabs.value.find(t => t.request.id === request.id)
      if (existing) {
        activeTabId.value = existing.id
        activeRequest.value = existing.request
        return existing.id
      }
    }

    // Create a reactive copy as the tab's request (same object as activeRequest)
    const tabRequest = JSON.parse(JSON.stringify(request))
    const id = nanoid()
    tabs.value.push({ id, request: tabRequest, response: response ?? null })
    activeTabId.value = id
    activeRequest.value = tabRequest  // SAME object → mutations auto-sync to tab
    return id
  }

  function closeTab(tabId: string): void {
    const idx = tabs.value.findIndex(t => t.id === tabId)
    if (idx === -1) return
    tabs.value.splice(idx, 1)
    if (activeTabId.value === tabId) {
      const newIdx = Math.min(idx, tabs.value.length - 1)
      if (newIdx >= 0) {
        const tab = tabs.value[newIdx]
        activeTabId.value = tab.id
        activeRequest.value = tab.request
      } else {
        activeTabId.value = null
        activeRequest.value = null
      }
    }
  }

  function setTabResponse(tabId: string, response: ResponseData): void {
    const tab = tabs.value.find(t => t.id === tabId)
    if (tab) tab.response = { ...response }
  }

  /** Get tab by ID */
  function getTab(tabId: string): TabState | undefined {
    return tabs.value.find(t => t.id === tabId)
  }

  // ====== Active request ======

  function setActiveRequest(request: ApiRequest | null): void {
    if (request) {
      openTab(request)
    } else {
      activeTabId.value = null
      activeRequest.value = null
    }
  }

  const collectionTree = computed<CollectionTreeNode[]>(() => {
    const roots = collections.value.filter(c => c.parentId === null)
    return roots.map(c => buildTreeNode(c))
  })

  function buildTreeNode(collection: Collection): CollectionTreeNode {
    const children: (CollectionTreeNode | RequestTreeNode)[] = []

    const childCollections = collections.value.filter(c => c.parentId === collection.id)
    for (const child of childCollections) {
      children.push(buildTreeNode(child))
    }

    const childRequests = requests.value.filter(r => r.collectionId === collection.id)
    for (const req of childRequests) {
      children.push({
        id: req.id!,
        name: req.name,
        type: 'request',
        method: req.method
      })
    }

    return {
      id: collection.id!,
      name: collection.name,
      type: 'collection',
      children
    }
  }

  return {
    collections,
    requests,
    activeRequest,
    loading,
    collectionTree,
    tabs,
    activeTabId,
    activeResponse,
    loadCollections,
    loadRequests,
    createCollection,
    updateCollection,
    deleteCollection,
    createRequest,
    updateRequest,
    deleteRequest,
    moveRequest,
    moveCollection,
    setActiveRequest,
    openTab,
    closeTab,
    setTabResponse,
    getTab
  }
})
