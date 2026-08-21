import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCollectionStore } from '@/stores/collection'
import type { ApiRequest } from '@/db/models'
import type { ResponseData } from '@/composables/useRequest'

function makeRequest(): ApiRequest {
  return {
    collectionId: 0,
    name: 'Test',
    method: 'GET',
    url: 'http://example.com',
    params: [],
    headers: [],
    body: { type: 'none' },
    auth: { type: 'none' },
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function makeResponse(blobUrl: string | null): ResponseData {
  return {
    status: 200,
    statusText: 'OK',
    headers: {},
    body: '',
    duration: 10,
    size: 0,
    isBinary: blobUrl !== null,
    fileName: 'f.bin',
    blobUrl
  }
}

let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL

beforeEach(() => {
  setActivePinia(createPinia())
  originalCreate = URL.createObjectURL
  originalRevoke = URL.revokeObjectURL
  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  URL.createObjectURL = originalCreate
  URL.revokeObjectURL = originalRevoke
  vi.restoreAllMocks()
})

describe('collection store blobUrl 生命周期', () => {
  it('覆盖标签页响应时撤销旧的下载链接', () => {
    const store = useCollectionStore()
    const tabId = store.openTab(makeRequest())

    store.setTabResponse(tabId, makeResponse('blob:old'))
    store.setTabResponse(tabId, makeResponse('blob:new'))

    expect(vi.mocked(URL.revokeObjectURL)).toHaveBeenCalledWith('blob:old')
    expect(vi.mocked(URL.revokeObjectURL)).not.toHaveBeenCalledWith('blob:new')
  })

  it('关闭标签页时撤销其下载链接', () => {
    const store = useCollectionStore()
    const tabId = store.openTab(makeRequest())

    store.setTabResponse(tabId, makeResponse('blob:old'))
    store.closeTab(tabId)

    expect(vi.mocked(URL.revokeObjectURL)).toHaveBeenCalledWith('blob:old')
  })

  it('覆盖响应前不清除当前链接，新响应保存到 tab 状态', () => {
    const store = useCollectionStore()
    const tabId = store.openTab(makeRequest())

    store.setTabResponse(tabId, makeResponse('blob:new'))

    expect(store.getTab(tabId)?.response?.blobUrl).toBe('blob:new')
    expect(vi.mocked(URL.revokeObjectURL)).not.toHaveBeenCalled()
  })
})
