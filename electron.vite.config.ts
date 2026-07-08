import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('electron/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('electron/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    base: './',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve('src')
      }
    },
    build: {
      modulePreload: false,
      rollupOptions: {
        input: resolve('index.html')
      }
    }
  }
})
