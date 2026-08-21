import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ResponseViewer from '@/components/response/ResponseViewer.vue'
import type { ResponseData } from '@/composables/useRequest'

function makeResponse(overrides: Partial<ResponseData> = {}): ResponseData {
  return {
    status: 200,
    statusText: 'OK',
    headers: {},
    body: '',
    duration: 10,
    size: 0,
    isBinary: false,
    fileName: null,
    blobUrl: null,
    ...overrides
  }
}

let originalCreate: typeof URL.createObjectURL
let originalRevoke: typeof URL.revokeObjectURL

beforeEach(() => {
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

describe('ResponseViewer 下载入口', () => {
  it('二进制响应显示下载按钮，点击后以文件名触发下载', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = mount(ResponseViewer, {
      props: {
        modelValue: makeResponse({ isBinary: true, blobUrl: 'blob:test', fileName: 'a.bin' })
      }
    })

    const downloadBtn = wrapper.findAll('button').find(b => b.text().includes('下载'))
    expect(downloadBtn).toBeTruthy()

    await downloadBtn!.trigger('click')

    const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement
    expect(anchor).toBeTruthy()
    expect(anchor.href).toContain('blob:test')
    expect(anchor.download).toBe('a.bin')
  })

  it('非二进制响应不显示下载按钮', () => {
    const wrapper = mount(ResponseViewer, {
      props: { modelValue: makeResponse({ isBinary: false, blobUrl: null }) }
    })

    const downloadBtn = wrapper.findAll('button').find(b => b.text().includes('下载'))
    expect(downloadBtn).toBeUndefined()
  })

  it('组件卸载时不撤销下载链接（blobUrl 生命周期归 store 管理）', () => {
    const wrapper = mount(ResponseViewer, {
      props: { modelValue: makeResponse({ isBinary: true, blobUrl: 'blob:test' }) }
    })

    wrapper.unmount()

    expect(vi.mocked(URL.revokeObjectURL)).not.toHaveBeenCalled()
  })
})
