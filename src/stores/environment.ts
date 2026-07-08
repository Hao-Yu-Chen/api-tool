import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db'
import type { Environment, EnvVariable } from '@/db/models'

export const useEnvironmentStore = defineStore('environment', () => {
  const environments = ref<Environment[]>([])
  const activeEnv = ref<Environment | null>(null)
  const loading = ref(false)

  async function loadEnvironments(): Promise<void> {
    loading.value = true
    try {
      environments.value = await db.environments.toArray()
      const settings = await db.settings.toCollection().first()
      if (settings?.activeEnvId) {
        activeEnv.value = environments.value.find(e => e.id === settings.activeEnvId) || null
      }
    } finally {
      loading.value = false
    }
  }

  async function setActiveEnv(id: number): Promise<void> {
    activeEnv.value = environments.value.find(e => e.id === id) || null
    const settings = await db.settings.toCollection().first()
    if (settings?.id) {
      await db.settings.update(settings.id, { activeEnvId: id })
    }
  }

  async function clearActiveEnv(): Promise<void> {
    activeEnv.value = null
    const settings = await db.settings.toCollection().first()
    if (settings?.id) {
      await db.settings.update(settings.id, { activeEnvId: 0 })
    }
  }

  async function createEnvironment(name: string): Promise<number> {
    const id = await db.environments.add({
      name,
      variables: [],
      baseUrl: '',
      baseUrlEnabled: false,
      globalHeaders: [],
      createdAt: Date.now()
    })
    await loadEnvironments()
    return id as number
  }

  async function updateEnvironment(id: number, data: Partial<Environment>): Promise<void> {
    // Deep clone to strip Vue reactivity proxies before IndexedDB
    const plain = JSON.parse(JSON.stringify(data))
    await db.environments.update(id, plain)
    await loadEnvironments()
  }

  async function deleteEnvironment(id: number): Promise<void> {
    await db.environments.delete(id)
    await loadEnvironments()
    if (activeEnv.value?.id === id) {
      activeEnv.value = null
    }
  }

  async function addVariable(envId: number, variable: EnvVariable): Promise<void> {
    const env = environments.value.find(e => e.id === envId)
    if (env) {
      env.variables.push(variable)
      // Clone to strip reactivity from the store's reactive array
      const plainVars = JSON.parse(JSON.stringify(env.variables))
      await db.environments.update(envId, { variables: plainVars })
      await loadEnvironments()
    }
  }

  async function updateVariable(envId: number, index: number, variable: EnvVariable): Promise<void> {
    const env = environments.value.find(e => e.id === envId)
    if (env && index >= 0 && index < env.variables.length) {
      env.variables[index] = variable
      const plainVars = JSON.parse(JSON.stringify(env.variables))
      await db.environments.update(envId, { variables: plainVars })
      await loadEnvironments()
    }
  }

  async function removeVariable(envId: number, index: number): Promise<void> {
    const env = environments.value.find(e => e.id === envId)
    if (env && index >= 0 && index < env.variables.length) {
      env.variables.splice(index, 1)
      const plainVars = JSON.parse(JSON.stringify(env.variables))
      await db.environments.update(envId, { variables: plainVars })
      await loadEnvironments()
    }
  }

  return {
    environments,
    activeEnv,
    loading,
    loadEnvironments,
    setActiveEnv,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    addVariable,
    updateVariable,
    removeVariable,
    clearActiveEnv
  }
})
