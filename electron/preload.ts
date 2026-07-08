import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  minimizeWindow: () => {
    ipcRenderer.send('minimize-window')
  },

  getDesktopSettings: () => {
    return ipcRenderer.invoke('get-desktop-settings')
  },

  setDesktopSetting: (key: string, value: boolean) => {
    return ipcRenderer.invoke('set-desktop-setting', key, value)
  },

  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', title, body)
  },

  getAppVersion: () => {
    return ipcRenderer.invoke('get-app-version')
  },

  onFileOpen: (callback: (filePath: string) => void) => {
    ipcRenderer.on('open-file', (_event, filePath: string) => {
      callback(filePath)
    })
  }
})
