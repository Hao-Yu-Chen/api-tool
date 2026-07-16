import { describe, it, expect } from 'vitest'
import { compilePattern, applyCaptures, matchRule } from './rule-engine'
import type { ProxyRule } from '@/db/models'

// ========== 测试辅助函数 ==========

function makeRule(
  id: number,
  name: string,
  sourcePattern: string,
  targetAddress: string,
  enabled = true,
  order = 0
): ProxyRule {
  return {
    id,
    name,
    sourcePattern,
    targetAddress,
    enabled,
    order,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

// ========== compilePattern ==========

describe('compilePattern', () => {
  it('应匹配不含通配符的精确 URL', () => {
    const regex = compilePattern('http://domain.com/api/get')
    expect(regex.test('http://domain.com/api/get')).toBe(true)
    expect(regex.test('http://domain.com/api/get/')).toBe(false)
    expect(regex.test('http://domain.com/api/other')).toBe(false)
  })

  it('* 应匹配单层路径段', () => {
    const regex = compilePattern('http://domain.com/api/*/profile')
    expect(regex.test('http://domain.com/api/user/profile')).toBe(true)
    expect(regex.test('http://domain.com/api/123/profile')).toBe(true)
    expect(regex.test('http://domain.com/api/a/b/profile')).toBe(false)
    expect(regex.test('http://domain.com/api/profile')).toBe(false)
  })

  it('** 应匹配多层路径段', () => {
    const regex = compilePattern('http://domain.com/api/user/**')
    expect(regex.test('http://domain.com/api/user/profile')).toBe(true)
    expect(regex.test('http://domain.com/api/user/a/b/c')).toBe(true)
    expect(regex.test('http://domain.com/api/user/')).toBe(false)
    expect(regex.test('http://domain.com/api/other/profile')).toBe(false)
  })

  it('* 在 host 中应匹配单层子域名', () => {
    const regex = compilePattern('http://*.example.com/api')
    expect(regex.test('http://api.example.com/api')).toBe(true)
    expect(regex.test('http://v2.example.com/api')).toBe(true)
    expect(regex.test('http://api.v2.example.com/api')).toBe(false)
  })

  it('** 在 host 中应匹配多层子域名', () => {
    const regex = compilePattern('http://**.example.com/api')
    expect(regex.test('http://api.example.com/api')).toBe(true)
    expect(regex.test('http://api.v2.example.com/api')).toBe(true)
    expect(regex.test('http://a.b.c.example.com/api')).toBe(true)
  })

  it('应转义正则特殊字符', () => {
    const regex = compilePattern('http://domain.com/api.json?foo=bar')
    // ? 是正则特殊字符，应该被转义为字面量
    expect(regex.test('http://domain.com/api.json?foo=bar')).toBe(true)
    expect(regex.test('http://domain.com/api.jsonXfoo=bar')).toBe(false)
  })

  it('应转义路径中的点号', () => {
    const regex = compilePattern('http://domain.com/file.json')
    expect(regex.test('http://domain.com/file.json')).toBe(true)
    // 点号应该只匹配字面量的点
    expect(regex.test('http://domain.com/fileXjson')).toBe(false)
  })

  it('应匹配端口号', () => {
    const regex = compilePattern('http://localhost:3000/api/test')
    expect(regex.test('http://localhost:3000/api/test')).toBe(true)
    expect(regex.test('http://localhost:8080/api/test')).toBe(false)
  })
})

// ========== applyCaptures ==========

describe('applyCaptures', () => {
  it('应将捕获组替换到目标地址的通配符位置', () => {
    const result = applyCaptures(
      'http://192.168.3.18:8080/api/user/admin/**',
      ['profile/settings']
    )
    expect(result).toBe(
      'http://192.168.3.18:8080/api/user/admin/profile/settings'
    )
  })

  it('应处理多个捕获组（* 和 ** 混合）', () => {
    const result = applyCaptures(
      'http://192.168.3.18:8080/*/admin/**',
      ['api', 'user/profile']
    )
    expect(result).toBe(
      'http://192.168.3.18:8080/api/admin/user/profile'
    )
  })

  it('应处理多个 * 通配符', () => {
    const result = applyCaptures(
      'http://target.com/*/*/detail',
      ['a', 'b']
    )
    expect(result).toBe('http://target.com/a/b/detail')
  })

  it('捕获值不够时应使用空字符串', () => {
    const result = applyCaptures('http://target.com/*/extra/**', ['only-one'])
    expect(result).toBe('http://target.com/only-one/extra/')
  })

  it('捕获值过多时多余的应被忽略', () => {
    const result = applyCaptures('http://target.com/*', ['a', 'b', 'c'])
    expect(result).toBe('http://target.com/a')
  })

  it('不含通配符的目标地址应直接返回', () => {
    const result = applyCaptures('http://static.example.com/page', [
      'unused'
    ])
    expect(result).toBe('http://static.example.com/page')
  })
})

// ========== matchRule ==========

describe('matchRule', () => {
  it('应命中匹配的规则并返回目标 URL', () => {
    const rules = [
      makeRule(
        1,
        'API 转发',
        'http://domain.com/api/**',
        'http://192.168.3.18:8080/api/admin/**'
      )
    ]
    const result = matchRule(
      'http://domain.com/api/user/profile',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe(
        'http://192.168.3.18:8080/api/admin/user/profile'
      )
      expect(result.ruleName).toBe('API 转发')
    }
  })

  it('未命中时应返回 matched: false', () => {
    const rules = [
      makeRule(
        1,
        'API 转发',
        'http://domain.com/api/**',
        'http://192.168.3.18:8080/api/**'
      )
    ]
    const result = matchRule('http://other.com/api/test', rules)
    expect(result.matched).toBe(false)
  })

  it('应按 order 顺序匹配，命中第一条即停止', () => {
    const rules = [
      makeRule(
        1,
        '通用 API 转发',
        'http://domain.com/api/**',
        'http://server1.com/api/**',
        true,
        0
      ),
      makeRule(
        2,
        'User 专用转发',
        'http://domain.com/api/user/**',
        'http://server2.com/user/**',
        true,
        1
      )
    ]
    // 请求匹配两条规则，应返回 order 更小的第一条
    const result = matchRule(
      'http://domain.com/api/user/profile',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.ruleName).toBe('通用 API 转发')
      expect(result.targetUrl).toBe(
        'http://server1.com/api/user/profile'
      )
    }
  })

  it('应跳过 disabled 的规则', () => {
    const rules = [
      makeRule(
        1,
        '禁用规则',
        'http://domain.com/api/**',
        'http://wrong.com/**',
        false,
        0
      ),
      makeRule(
        2,
        '启用规则',
        'http://domain.com/api/**',
        'http://right.com/**',
        true,
        1
      )
    ]
    const result = matchRule(
      'http://domain.com/api/test',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      // ** 匹配 "test"，目标 ** 替换为 "test" → http://right.com/test
    expect(result.targetUrl).toBe('http://right.com/test')
    }
  })

  it('空规则列表应返回 matched: false', () => {
    const result = matchRule('http://domain.com/api/test', [])
    expect(result.matched).toBe(false)
  })

  it('** 应捕获多层路径内容', () => {
    const rules = [
      makeRule(
        1,
        '批量转发',
        'http://domain.com/api/user/**',
        'http://192.168.3.18:8080/api/user/admin/**'
      )
    ]
    const result = matchRule(
      'http://domain.com/api/user/profile/settings/advanced',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe(
        'http://192.168.3.18:8080/api/user/admin/profile/settings/advanced'
      )
    }
  })

  it('* 应捕获单层路径内容', () => {
    const rules = [
      makeRule(
        1,
        '单层替换',
        'http://domain.com/api/*/detail',
        'http://target.com/new/*/info'
      )
    ]
    const result = matchRule(
      'http://domain.com/api/product/detail',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe(
        'http://target.com/new/product/info'
      )
    }
  })

  it('host 层的通配符匹配与路径层应有不同语义', () => {
    const rules = [
      makeRule(
        1,
        '子域名转发',
        'http://*.domain.com/api',
        'http://*.target.com/api'
      )
    ]
    // * 在 host 中匹配单层子域名
    const result = matchRule('http://api.domain.com/api', rules)
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe('http://api.target.com/api')
    }
  })

  it('应正确处理 HTTP 和 HTTPS 协议', () => {
    const rules = [
      makeRule(1, 'HTTPS', 'https://secure.com/api/**', 'http://local.com/**')
    ]
    const result = matchRule('https://secure.com/api/data', rules)
    expect(result.matched).toBe(true)
    expect(
      matchRule('http://secure.com/api/data', rules).matched
    ).toBe(false)
  })

  // ========== 精确 URL 匹配（无通配符） ==========

  it('精确 URL（无通配符）应正确匹配', () => {
    const rules = [
      makeRule(
        1,
        '精确转发',
        'http://domain.com/api/get',
        'http://192.168.3.18:8080/api/get'
      )
    ]
    const result = matchRule('http://domain.com/api/get', rules)
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe('http://192.168.3.18:8080/api/get')
    }
  })

  it('精确 URL 不应匹配不同的路径', () => {
    const rules = [
      makeRule(
        1,
        '精确转发',
        'http://domain.com/api/get',
        'http://192.168.3.18:8080/api/get'
      )
    ]
    expect(matchRule('http://domain.com/api/getAll', rules).matched).toBe(false)
    expect(matchRule('http://domain.com/api/get/extra', rules).matched).toBe(false)
    expect(matchRule('http://domain.com/api/other', rules).matched).toBe(false)
  })

  it('精确 URL 带查询参数应正确匹配', () => {
    const rules = [
      makeRule(
        1,
        '查询参数转发',
        'http://domain.com/api/search?q=test',
        'http://local.com/search?q=test'
      )
    ]
    const result = matchRule('http://domain.com/api/search?q=test', rules)
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe('http://local.com/search?q=test')
    }
  })

  // ========== 查询字符串追加（源模式无 ? 但请求带 ?） ==========

  it('源模式无查询串时应匹配带查询串的请求并保留查询串', () => {
    const rules = [
      makeRule(
        1,
        '无查询串规则',
        'http://domain.com/api/get',
        'http://192.168.3.18:48080/api/get'
      )
    ]
    const result = matchRule(
      'http://domain.com/api/get?pageNo=1&pageSize=10',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe(
        'http://192.168.3.18:48080/api/get?pageNo=1&pageSize=10'
      )
    }
  })

  it('源模式无查询串 + 目标有查询串时不追加', () => {
    const rules = [
      makeRule(
        1,
        '目标已有查询',
        'http://domain.com/api/**',
        'http://target.com/api/**?fixed=true'
      )
    ]
    const result = matchRule(
      'http://domain.com/api/data?extra=1',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      // ** 只捕获了 "data"，目标 ?fixed=true 已有查询串，不追加上游的 ?extra=1
      expect(result.targetUrl).toBe(
        'http://target.com/api/data?fixed=true'
      )
    }
  })

  it('精确URL + 通配符 + 查询串追加', () => {
    const rules = [
      makeRule(
        1,
        '实际场景',
        'http://xmjs.digitalwzjfjt.com:9527/api/admin-api/foreign/construction-scheme/page',
        'http://192.168.3.18:48080/admin-api/foreign/construction-scheme/page'
      )
    ]
    const result = matchRule(
      'http://xmjs.digitalwzjfjt.com:9527/api/admin-api/foreign/construction-scheme/page?pageNo=1&pageSize=10&sectionIds%5B0%5D=50',
      rules
    )
    expect(result.matched).toBe(true)
    if (result.matched) {
      expect(result.targetUrl).toBe(
        'http://192.168.3.18:48080/admin-api/foreign/construction-scheme/page?pageNo=1&pageSize=10&sectionIds%5B0%5D=50'
      )
    }
  })
})
