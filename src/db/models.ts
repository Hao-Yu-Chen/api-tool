// ========== 环境变量 ==========
export interface EnvVariable {
  id: string
  key: string
  value: string
  enabled: boolean
}

export interface Environment {
  id?: number
  name: string
  variables: EnvVariable[]
  baseUrl: string
  baseUrlEnabled: boolean
  globalHeaders: KeyValuePair[]
  createdAt: number
}

// ========== 集合与请求 ==========
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary'

export type AuthType = 'none' | 'basic' | 'bearer' | 'api-key'

export interface AuthConfig {
  type: AuthType
  basic?: { username: string; password: string }
  bearer?: { token: string }
  apiKey?: { key: string; value: string; addTo: 'header' | 'query' }
}

export interface KeyValuePair {
  id: string
  key: string
  value: string
  enabled: boolean
  description?: string
}

export interface RequestBody {
  type: BodyType
  raw?: string
  formData?: KeyValuePair[]
  urlEncoded?: KeyValuePair[]
}

export interface ApiRequest {
  id?: number
  collectionId: number
  name: string
  method: HttpMethod
  url: string
  params: KeyValuePair[]
  headers: KeyValuePair[]
  body: RequestBody
  auth: AuthConfig
  order: number
  createdAt: number
  updatedAt: number
}

export interface Collection {
  id?: number
  name: string
  description: string
  parentId: number | null
  order: number
  createdAt: number
}

// ========== 历史记录 ==========
export interface ResponseSnapshot {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string
  duration: number
  size: number
}

export interface RequestSnapshot {
  method: HttpMethod
  url: string
  headers: KeyValuePair[]
  params: KeyValuePair[]
  body: RequestBody
  auth: AuthConfig
}

export interface HistoryEntry {
  id?: number
  request: RequestSnapshot
  response: ResponseSnapshot
  timestamp: number
}

// ========== 代理规则 ==========
export interface ProxyRule {
  id?: number
  name: string
  sourcePattern: string
  targetAddress: string
  enabled: boolean
  order: number
  createdAt: number
  updatedAt: number
}

// ========== 全局设置 ==========
export interface AppSettings {
  id?: number
  theme: 'dark' | 'light'
  activeEnvId: number | null
  sidebarWidth: number
  themeColor?: string
  themeStyle?: string
  themeDark?: boolean
  themeAnimation?: string
  themeReduceMotion?: boolean
  themeMouseTrail?: boolean
}
