const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getModelProviders: () => ipcRenderer.invoke('config:getModelProviders'),
  getProductsByProvider: (providerKey) => ipcRenderer.invoke('config:getProductsByProvider', providerKey),
  getAccountsByProvider: (providerKey) => ipcRenderer.invoke('config:getAccountsByProvider', providerKey),
  buildEnv: (providerKey, productKey, accountKey) => ipcRenderer.invoke('config:buildEnv', { providerKey, productKey, accountKey }),
  applyEnv: (envMap) => ipcRenderer.invoke('env:apply', envMap),
  getEnvTargetPaths: () => ipcRenderer.invoke('env:getTargetPaths'),
  setShellConfigFile: (filePath) => ipcRenderer.invoke('env:setShellConfigFile', filePath),
  listShellConfigCandidates: () => ipcRenderer.invoke('env:listShellConfigCandidates')
});
