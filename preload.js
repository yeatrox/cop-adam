const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updater', {
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  launch: () => ipcRenderer.invoke('app:launch'),
  quit: () => ipcRenderer.invoke('app:quit'),
  onProgress: (cb) => ipcRenderer.on('update:progress', (_e, p) => cb(p)),
});
