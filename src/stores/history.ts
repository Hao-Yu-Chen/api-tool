import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db'
import type { HistoryEntry, RequestSnapshot, ResponseSnapshot } from '@/db/models'

const MAX_HISTORY = 500

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>([])
  const loading = ref(false)

  async function loadHistory(): Promise<void> {
    loading.value = true
    try {
      entries.value = await db.history
        .orderBy('timestamp')
        .reverse()
        .limit(MAX_HISTORY)
        .toArray()
    } finally {
      loading.value = false
    }
  }

  async function addEntry(request: RequestSnapshot, response: ResponseSnapshot): Promise<void> {
    // Deep clone to strip Vue reactivity proxies before IndexedDB storage
    const plainRequest = JSON.parse(JSON.stringify(request))
    const plainResponse = JSON.parse(JSON.stringify(response))
    await db.history.add({
      request: plainRequest,
      response: plainResponse,
      timestamp: Date.now()
    })
    await loadHistory()
    await trimHistory()
  }

  async function clearHistory(): Promise<void> {
    await db.history.clear()
    entries.value = []
  }

  async function deleteEntry(id: number): Promise<void> {
    await db.history.delete(id)
    await loadHistory()
  }

  async function trimHistory(): Promise<void> {
    const count = await db.history.count()
    if (count > MAX_HISTORY) {
      const oldest = await db.history
        .orderBy('timestamp')
        .limit(count - MAX_HISTORY)
        .toArray()
      for (const entry of oldest) {
        if (entry.id) await db.history.delete(entry.id)
      }
    }
  }

  return {
    entries,
    loading,
    loadHistory,
    addEntry,
    clearHistory,
    deleteEntry
  }
})
