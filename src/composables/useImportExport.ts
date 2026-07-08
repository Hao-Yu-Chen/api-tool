import { nanoid } from 'nanoid'
import { useCollectionStore } from '@/stores/collection'
import { useEnvironmentStore } from '@/stores/environment'
import type { ApiRequest, HttpMethod, KeyValuePair } from '@/db/models'

export function useImportExport() {
  const collectionStore = useCollectionStore()
  const envStore = useEnvironmentStore()

  // ========== 导出 ==========
  async function exportAll(): Promise<string> {
    const data: {
      version: string
      exportedAt: string
      collections: unknown[]
      environments: unknown[]
    } = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      collections: [],
      environments: envStore.environments
    }

    for (const col of collectionStore.collections) {
      const requests = collectionStore.requests.filter(r => r.collectionId === col.id)
      data.collections.push({ ...col, requests })
    }

    return JSON.stringify(data, null, 2)
  }

  function downloadJSON(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportFile(): Promise<void> {
    const data = await exportAll()
    downloadJSON(data, `api-tool-export-${Date.now()}.json`)
  }

  // ========== 导出 cURL ==========
  function exportCurl(req: ApiRequest): string {
    const parts: string[] = ['curl']
    if (req.method !== 'GET') {
      parts.push(`-X ${req.method}`)
    }
    for (const h of req.headers) {
      if (h.enabled && h.key) {
        parts.push(`-H '${h.key}: ${h.value}'`)
      }
    }
    if (req.body.type !== 'none' && req.body.raw) {
      parts.push(`-d '${req.body.raw.replace(/'/g, "\\'")}'`)
    }
    parts.push(`'${req.url}'`)
    return parts.join(' \\\n  ')
  }

  // ========== 导入 ==========
  async function importJSON(jsonStr: string): Promise<number> {
    const data = JSON.parse(jsonStr)
    let count = 0

    if (data.info && data.item) {
      return importPostman(data)
    }

    if (data.collections) {
      for (const col of data.collections) {
        const colId = await collectionStore.createCollection(col.name, col.parentId || null)
        if (col.requests) {
          for (const req of col.requests) {
            await collectionStore.createRequest(colId, req)
            count++
          }
        }
      }
    }

    if (data.environments) {
      for (const env of data.environments) {
        await envStore.createEnvironment(env.name)
        const created = envStore.environments.find(e => e.name === env.name)
        if (created?.id) {
          await envStore.updateEnvironment(created.id, { variables: env.variables || [] })
        }
      }
    }

    return count
  }

  // ========== Postman v2.1 导入 ==========
  async function importPostman(data: Record<string, unknown>): Promise<number> {
    let count = 0

    async function parseItems(items: Record<string, unknown>[], parentId: number | null = null) {
      for (const item of items) {
        if (item.item) {
          const colId = await collectionStore.createCollection(item.name as string, parentId)
          await parseItems(item.item as Record<string, unknown>[], colId)
        } else if (item.request) {
          const req = item.request as Record<string, unknown>
          const headers: KeyValuePair[] = []
          const headerList = req.header as Array<Record<string, unknown>> | undefined
          if (headerList) {
            for (const h of headerList) {
              headers.push({
                id: nanoid(),
                key: h.key as string,
                value: h.value as string,
                enabled: !h.disabled
              })
            }
          }

          const url = req.url as string | Record<string, unknown> | undefined
          const urlStr = typeof url === 'string' ? url : (url?.raw as string) || ''

          const body = req.body as Record<string, unknown> | undefined

          await collectionStore.createRequest(parentId!, {
            name: item.name as string,
            method: ((req.method as string) || 'GET') as HttpMethod,
            url: urlStr,
            headers,
            body: body ? { type: 'raw', raw: (body.raw as string) || '' } : { type: 'none' }
          })
          count++
        }
      }
    }

    await parseItems(data.item as Record<string, unknown>[])
    return count
  }

  function triggerFileInput(callback: (content: string) => void): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const text = await file.text()
      callback(text)
    }
    input.click()
  }

  async function importFile(): Promise<void> {
    triggerFileInput(async (content) => {
      try {
        const count = await importJSON(content)
        alert(`成功导入 ${count} 个请求`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        alert(`导入失败: ${message}`)
      }
    })
  }

  return { exportFile, importFile, exportCurl }
}
