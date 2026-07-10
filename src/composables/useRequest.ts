import { ref } from 'vue'
import type { HttpMethod, KeyValuePair, RequestBody } from '@/db/models'

export interface SendRequestParams {
  method: HttpMethod
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
}

export interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  duration: number
  size: number
  /** Whether the response is binary (file download) */
  isBinary: boolean
  /** Suggested filename from Content-Disposition or URL */
  fileName: string | null
  /** Blob URL for download (only set when isBinary) */
  blobUrl: string | null
}

const BINARY_CONTENT_TYPES = [
  'application/octet-stream',
  'application/pdf',
  'application/zip',
  'application/gzip',
  'application/x-tar',
  'application/x-rar-compressed',
  'image/',
  'audio/',
  'video/',
  'font/',
  'application/vnd.',
  'application/x-msdownload',
  'application/x-apple-diskimage'
]

function isBinaryContentType(contentType: string): boolean {
  return BINARY_CONTENT_TYPES.some(prefix => contentType.startsWith(prefix))
}

function parseFileName(headers: Record<string, string>, url: string): string | null {
  // Try Content-Disposition first
  const disposition = headers['content-disposition'] || ''
  const filenameMatch = disposition.match(/filename[^;=\n]*=["']?((['"]).*?\2|[^;\n]*)["']?/i)
  if (filenameMatch && filenameMatch[1]) {
    return filenameMatch[1].replace(/['"]/g, '')
  }
  // Fall back to URL path
  try {
    const pathname = new URL(url).pathname
    const parts = pathname.split('/')
    const lastPart = parts[parts.length - 1]
    if (lastPart && lastPart.includes('.')) return lastPart
  } catch {
    // Invalid URL, ignore
  }
  return null
}

export function useRequest() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const response = ref<ResponseData | null>(null)

  async function send(params: SendRequestParams): Promise<ResponseData> {
    loading.value = true
    error.value = null
    // Revoke previous blob URL if any
    if (response.value?.blobUrl) {
      URL.revokeObjectURL(response.value.blobUrl)
    }
    response.value = null

    const startTime = performance.now()

    try {
      // Build headers
      const headersObj = new Headers()
      for (const h of params.headers) {
        if (h.enabled && h.key) {
          headersObj.append(h.key, h.value)
        }
      }

      // Build body
      let bodyInit: BodyInit | undefined
      if (['GET', 'HEAD'].includes(params.method)) {
        bodyInit = undefined
      } else if (params.body.type === 'json' && params.body.raw) {
        bodyInit = params.body.raw
      } else if (params.body.type === 'form-data' && params.body.formData) {
        const fd = new FormData()
        for (const item of params.body.formData) {
          if (item.enabled && item.key) {
            fd.append(item.key, item.value)
          }
        }
        bodyInit = fd
      } else if (params.body.type === 'x-www-form-urlencoded' && params.body.urlEncoded) {
        const urlParams = new URLSearchParams()
        for (const item of params.body.urlEncoded) {
          if (item.enabled && item.key) {
            urlParams.append(item.key, item.value)
          }
        }
        bodyInit = urlParams.toString()
      } else if (params.body.type === 'raw' && params.body.raw) {
        bodyInit = params.body.raw
      }

      // Build query string from params and append to URL
      // Strip existing query string first to prevent double-appending
      // (bidirectional sync already writes params into URL for display)
      let finalUrl = params.url
      const qIndex = finalUrl.indexOf('?')
      if (qIndex !== -1) {
        finalUrl = finalUrl.slice(0, qIndex)
      }
      const enabledParams = (params.params || []).filter(p => p.enabled && p.key)
      if (enabledParams.length > 0) {
        const qs = new URLSearchParams()
        for (const p of enabledParams) {
          qs.append(p.key, p.value)
        }
        const qsStr = qs.toString()
        if (qsStr) {
          finalUrl += '?' + qsStr
        }
      }

      const res = await fetch(finalUrl, {
        method: params.method,
        headers: headersObj,
        body: bodyInit
      })

      const endTime = performance.now()
      const duration = Math.round(endTime - startTime)

      // Parse response headers
      const respHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        respHeaders[key] = value
      })

      const contentType = respHeaders['content-type'] || ''
      const contentDisposition = respHeaders['content-disposition'] || ''
      const isBin = isBinaryContentType(contentType) || contentDisposition.includes('attachment')

      let textBody = ''
      let blobUrl: string | null = null
      let size = 0
      const fileName = parseFileName(respHeaders, params.url)

      if (isBin) {
        const blob = await res.blob()
        size = blob.size
        blobUrl = URL.createObjectURL(blob)
        // Also store text for preview if it's small enough
        if (blob.size < 1024 * 1024) {
          textBody = await blob.text().catch(() => '[Binary data]')
        } else {
          textBody = `[Binary data: ${(blob.size / 1024).toFixed(1)} KB]`
        }
      } else {
        textBody = await res.text()
        size = new Blob([textBody]).size
      }

      const data: ResponseData = {
        status: res.status,
        statusText: res.statusText,
        headers: respHeaders,
        body: textBody,
        duration,
        size,
        isBinary: isBin,
        fileName,
        blobUrl
      }

      response.value = data
      return data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      error.value = message
      return {
        status: 0,
        statusText: message,
        headers: {},
        body: '',
        duration: Math.round(performance.now() - startTime),
        size: 0,
        isBinary: false,
        fileName: null,
        blobUrl: null
      }
    } finally {
      loading.value = false
    }
  }

  return { loading, error, response, send }
}
