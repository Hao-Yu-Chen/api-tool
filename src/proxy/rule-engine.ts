import type { ProxyRule } from '@/db/models'

// ========== 匹配结果类型 ==========

export interface MatchSuccess {
  matched: true
  targetUrl: string
  ruleName: string
}

export interface MatchFailure {
  matched: false
}

export type MatchResult = MatchSuccess | MatchFailure

// ========== 正则编译 ==========
// 需要转义的正则特殊字符（不包含 *）
const REGEX_SPECIAL = /[.+?^${}()|[\]\\/]/g

/**
 * 将通配符模式转换为正则表达式字符串
 *
 * - `**` → 多层匹配（host: `(.+)`, path: `(.+)`）
 * - `*`  → 单层匹配（host: `([^./]+)`, path: `([^/]+)`）
 * - 其余正则特殊字符转义为字面量
 *
 * @param str - 待处理的字符串片段
 * @param singleRegex - 单层通配符 (*) 的正则替换
 * @param multiRegex - 多层通配符 (**) 的正则替换
 */
function wildcardToRegex(
  str: string,
  singleRegex: string,
  multiRegex: string
): string {
  return str
    .replace(/\*\*/g, '\x00') // 保护 **
    .replace(/\*/g, '\x01') // 保护 *
    .replace(REGEX_SPECIAL, '\\$&') // 转义正则特殊字符
    .replace(/\x00/g, multiRegex) // ** → 多层捕获
    .replace(/\x01/g, singleRegex) // * → 单层捕获
}

/**
 * 将源匹配模式编译为正则表达式
 *
 * @param pattern - 源匹配模式，如 "http://domain.com/api/user/**"
 * @returns 编译后的正则表达式
 */
export function compilePattern(pattern: string): RegExp {
  const url = new URL(pattern)

  const protocolEscaped = url.protocol.replace(REGEX_SPECIAL, '\\$&')
  // host 中 * 匹配单层子域名（不含 . 和 /），** 匹配多层
  const hostRegex = wildcardToRegex(url.host, '([^./]+)', '(.+)')
  // path 中 * 匹配单层路径段（不含 /），** 匹配多层但不含 ?（防止捕获查询串）
  const pathRegex = wildcardToRegex(url.pathname, '([^/]+)', '([^?]+)')
  // search (query string)
  // - 有指定 query: 精确匹配
  // - 无指定 query: 可选匹配任意查询串
  const searchRegex = url.search
    ? wildcardToRegex(url.search, '([^/&?]+)', '(.+)')
    : '(\\?.*)?'

  return new RegExp(
    '^' + protocolEscaped + '//' + hostRegex + pathRegex + searchRegex + '$'
  )
}

/**
 * 检查源匹配模式是否包含查询字符串
 */
export function hasQueryString(pattern: string): boolean {
  try {
    const url = new URL(pattern)
    return url.search !== ''
  } catch {
    return false
  }
}

// ========== 捕获替换 ==========
// 目标地址中的通配符占位
const TARGET_WILDCARD = /\*\*|\*/g

/**
 * 将正则捕获组依次替换到目标地址中的通配符位置
 *
 * @param targetPattern - 目标地址模式，如 "http://192.168.3.18:8080/api/user/admin/**"
 * @param captures - 正则匹配捕获组（`match.slice(1)`）
 * @returns 替换通配符后的完整目标 URL
 */
export function applyCaptures(
  targetPattern: string,
  captures: string[]
): string {
  let idx = 0
  return targetPattern.replace(TARGET_WILDCARD, () => {
    return captures[idx++] ?? ''
  })
}

// ========== 规则匹配入口 ==========

/**
 * 尝试将请求 URL 匹配到规则列表
 *
 * 规则按 `order` 升序排列，仅检查 `enabled === true` 的规则，
 * 命中第一条即停止。
 *
 * @param url - 请求的完整 URL，如 "http://domain.com/api/user/profile"
 * @param rules - 所有规则列表
 * @returns 匹配成功则返回目标 URL，未命中返回 `{ matched: false }`
 */
export function matchRule(url: string, rules: ProxyRule[]): MatchResult {
  const enabledRules = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.order - b.order)

  for (const rule of enabledRules) {
    const regex = compilePattern(rule.sourcePattern)
    const match = regex.exec(url)
    if (match) {
      const captures = match.slice(1) // 跳过完整匹配
      let targetUrl = applyCaptures(rule.targetAddress, captures)

      // 如果源模式未指定查询串，但请求 URL 带有查询串
      // → 追加到目标 URL（目标自身无查询串时）
      if (!hasQueryString(rule.sourcePattern)) {
        let requestQuery = ''
        try {
          requestQuery = new URL(url).search
        } catch { /* ignore */ }
        if (requestQuery) {
          const targetHasQuery = targetUrl.includes('?')
          if (!targetHasQuery) {
            targetUrl += requestQuery
          }
        }
      }

      return {
        matched: true,
        targetUrl,
        ruleName: rule.name
      }
    }
  }

  return { matched: false }
}
