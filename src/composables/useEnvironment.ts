import type { KeyValuePair } from '@/db/models'
import { useEnvironmentStore } from '@/stores/environment'

export function useEnvironment() {
  const envStore = useEnvironmentStore()

  /**
   * Replace all {{variable}} patterns in a string with their values
   * from the active environment. Disabled variables are not replaced.
   */
  function replace(str: string): string {
    if (!str) return str
    return str.replace(/\{\{(.+?)\}\}/g, (match, varName: string) => {
      const trimmed = varName.trim()
      const variable = envStore.activeEnv?.variables.find(
        v => v.key === trimmed && v.enabled
      )
      return variable ? variable.value : match
    })
  }

  /**
   * Resolve a full URL from the request URL. If base URL is enabled in the
   * active environment and the request URL is not an absolute HTTP(S) URL,
   * prepend the base URL (with sensible slash normalization).
   */
  function resolveUrl(url: string): string {
    const env = envStore.activeEnv
    if (!env?.baseUrlEnabled || !env?.baseUrl) return url
    if (/^https?:\/\//i.test(url)) return url

    const base = env.baseUrl.replace(/\/+$/, '')
    const path = url.replace(/^\/+/, '')
    return `${base}/${path}`
  }

  /**
   * Merge global headers from the active environment into the request headers.
   * Only injects headers whose key does NOT already exist in the request
   * (case-insensitive check). Disabled global headers and those with empty
   * keys are skipped. Returns a new array — the input is not mutated.
   */
  function mergeHeaders(headers: KeyValuePair[]): KeyValuePair[] {
    const env = envStore.activeEnv
    if (!env?.globalHeaders?.length) return headers

    const existingKeys = new Set(
      headers.filter(h => h.enabled).map(h => h.key.toLowerCase())
    )

    const toAdd: KeyValuePair[] = []
    for (const gh of env.globalHeaders) {
      if (!gh.enabled || !gh.key) continue
      if (existingKeys.has(gh.key.toLowerCase())) continue
      // Avoid adding duplicates from globalHeaders itself
      if (toAdd.some(h => h.key.toLowerCase() === gh.key.toLowerCase())) continue
      toAdd.push({ ...gh })
    }

    return toAdd.length > 0 ? [...headers, ...toAdd] : headers
  }

  /**
   * Extract all unique variable names from a string.
   */
  function extractVariables(str: string): string[] {
    const matches = str.match(/\{\{(.+?)\}\}/g)
    if (!matches) return []
    const vars = matches.map(m => m.replace(/^\{\{|\}\}$/g, '').trim())
    return [...new Set(vars)]
  }

  /**
   * Validate that all variables in the string exist in the active environment.
   */
  function validateVariables(str: string): { valid: boolean; undefined: string[] } {
    const allVars = extractVariables(str)
    const envVarKeys = new Set(
      (envStore.activeEnv?.variables || [])
        .filter(v => v.enabled)
        .map(v => v.key)
    )
    const undefinedVars = allVars.filter(v => !envVarKeys.has(v))
    return {
      valid: undefinedVars.length === 0,
      undefined: undefinedVars
    }
  }

  return { replace, resolveUrl, mergeHeaders, extractVariables, validateVariables }
}
