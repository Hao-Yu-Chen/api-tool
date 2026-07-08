import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'

// Electron file:// 协议需要 hash 路由，Web 版本用 history 路由
// 双重检测：preload API 或 file:// 协议都视为 Electron 环境
const isElectron = typeof window !== 'undefined' && (
  window.electronAPI?.isElectron ||
  window.location.protocol === 'file:'
)

const router = createRouter({
  history: isElectron ? createWebHashHistory() : createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue')
    }
  ]
})

export default router
