import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useRequest, type SendRequestParams } from '@/composables/useRequest'
import type { HttpMethod } from '@/db/models'

const enc = new TextEncoder()

/** Minimal Response stand-in for happy-dom: status/headers/arrayBuffer/blob/text */
function fakeResponse(bodyBytes: Uint8Array, headers: Record<string, string> = {}) {
  return {
    status: 200,
    statusText: 'OK',
    headers: {
      forEach(cb: (value: string, key: string) => void) {
        for (const [key, value] of Object.entries(headers)) cb(value, key)
      }
    },
    arrayBuffer: async () => {
      const copy = new Uint8Array(bodyBytes.byteLength)
      copy.set(bodyBytes)
      return copy.buffer
    },
    blob: async () => new Blob([bodyBytes]),
    text: async () => new TextDecoder().decode(bodyBytes)
  } as unknown as Response
}

function baseParams(url = 'http://example.com/report.csv'): SendRequestParams {
  return {
    method: 'GET' as HttpMethod,
    url,
    headers: [],
    params: [],
    body: { type: 'none' }
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
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useRequest 二进制响应识别', () => {
  it('将 text/csv 响应识别为二进制并提供下载链接', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse(enc.encode('a,b\n1,2'), { 'content-type': 'text/csv' })
    ))
    const { send } = useRequest()

    const data = await send(baseParams())

    expect(data.isBinary).toBe(true)
    expect(data.blobUrl).toBe('blob:mock')
    expect(data.fileName).toBe('report.csv')
  })

  it('嗅探出缺失 Content-Type 的二进制响应', async () => {
    // ZIP magic bytes + NUL bytes, no content-type header at all
    const zipish = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x01, 0x02])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(zipish)))
    const { send } = useRequest()

    const data = await send(baseParams())

    expect(data.isBinary).toBe(true)
    expect(data.blobUrl).toBe('blob:mock')
  })

  it('嗅探出被服务器误标为 text/plain 的二进制响应', async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG magic + NUL
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse(bytes, { 'content-type': 'text/plain' })
    ))
    const { send } = useRequest()

    const data = await send(baseParams())

    expect(data.isBinary).toBe(true)
    expect(data.blobUrl).toBe('blob:mock')
  })

  it('不将普通 JSON 文本误判为二进制', async () => {
    const json = '{"message":"你好，世界"}'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse(enc.encode(json), { 'content-type': 'application/json' })
    ))
    const { send } = useRequest()

    const data = await send(baseParams('http://example.com/api/data'))

    expect(data.isBinary).toBe(false)
    expect(data.blobUrl).toBeNull()
    expect(data.body).toBe(json)
  })

  it('将 Content-Disposition attachment 响应识别为二进制并解析文件名', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      fakeResponse(enc.encode('anything'), {
        'content-type': 'application/json',
        'content-disposition': 'attachment; filename="data.bin"'
      })
    ))
    const { send } = useRequest()

    const data = await send(baseParams('http://example.com/download'))

    expect(data.isBinary).toBe(true)
    expect(data.fileName).toBe('data.bin')
  })

  it('发送新请求时不撤销已保存响应的下载链接', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(fakeResponse(enc.encode('a,b\n1,2'), { 'content-type': 'application/octet-stream' }))
      .mockResolvedValueOnce(fakeResponse(enc.encode('x'), { 'content-type': 'application/octet-stream' }))
    vi.stubGlobal('fetch', fetchMock)
    const { send } = useRequest()

    await send(baseParams())
    await send(baseParams())

    // 旧响应仍保存在 tab 状态中供切换查看，revoke 职责在 store 层
    expect(vi.mocked(URL.revokeObjectURL)).not.toHaveBeenCalled()
  })
})
