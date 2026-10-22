const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API to the renderer via contextBridge.
// The renderer can never call arbitrary Node / Electron APIs.
contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  loadHistory: () => ipcRenderer.invoke('history:load'),
  saveHistory: (h) => ipcRenderer.invoke('history:save', h),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
});
