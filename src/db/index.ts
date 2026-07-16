import Dexie, { type Table } from 'dexie'
import type { Collection, ApiRequest, Environment, HistoryEntry, AppSettings, ProxyRule } from './models'

class ApiToolDB extends Dexie {
  collections!: Table<Collection, number>
  requests!: Table<ApiRequest, number>
  environments!: Table<Environment, number>
  history!: Table<HistoryEntry, number>
  settings!: Table<AppSettings, number>
  proxyRules!: Table<ProxyRule, number>

  constructor() {
    super('apitool')
    this.version(1).stores({
      collections: '++id, parentId, order',
      requests: '++id, collectionId, order',
      environments: '++id, name',
      history: '++id, timestamp',
      settings: '++id'
    })
    this.version(2).stores({
      collections: '++id, parentId, order',
      requests: '++id, collectionId, order',
      environments: '++id, name',
      history: '++id, timestamp',
      settings: '++id',
      proxyRules: '++id, enabled, order'
    })
  }

  async seedDefaults(): Promise<void> {
    const envCount = await this.environments.count()
    if (envCount === 0) {
      await this.environments.bulkAdd([
        {
          name: 'Development',
          variables: [{ id: '1', key: 'base_url', value: 'http://localhost:3000', enabled: true }],
          baseUrl: 'http://localhost:3000',
          baseUrlEnabled: false,
          globalHeaders: [],
          createdAt: Date.now()
        },
        {
          name: 'Staging',
          variables: [{ id: '1', key: 'base_url', value: 'https://staging.example.com', enabled: true }],
          baseUrl: 'https://staging.example.com',
          baseUrlEnabled: false,
          globalHeaders: [],
          createdAt: Date.now()
        },
        {
          name: 'Production',
          variables: [{ id: '1', key: 'base_url', value: 'https://api.example.com', enabled: true }],
          baseUrl: 'https://api.example.com',
          baseUrlEnabled: false,
          globalHeaders: [],
          createdAt: Date.now()
        }
      ])
    }

    const settingsCount = await this.settings.count()
    if (settingsCount === 0) {
      await this.settings.add({
        theme: 'light',
        activeEnvId: null,
        sidebarWidth: 280
      })
    }
  }
}

export const db = new ApiToolDB()
