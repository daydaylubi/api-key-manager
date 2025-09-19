const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getProducts: () => ipcRenderer.invoke('config:getProducts'),
  getModels: (product) => ipcRenderer.invoke('config:getModels', product),
  getAccountsByModel: (model) => ipcRenderer.invoke('config:getAccountsByModel', model),
  buildEnv: (product, model, accountName) => ipcRenderer.invoke('config:buildEnv', { product, model, accountName }),
  applyEnv: (envMap) => ipcRenderer.invoke('env:apply', envMap)
}); 