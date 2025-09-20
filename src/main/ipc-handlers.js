const { ipcMain } = require('electron');
const ConfigManager = require('./config-manager');
const EnvManager = require('./env-manager');

let handlersRegistered = false;

class IPCHandlers {
  constructor() {
    if (handlersRegistered) {
      return;
    }
    this.configManager = new ConfigManager();
    this.envManager = new EnvManager();
    this.init();
    handlersRegistered = true;
  }

  init() {
    ipcMain.handle('config:getModelProviders', async () => {
      await this.configManager.init();
      return this.configManager.getModelProviders();
    });

    ipcMain.handle('config:getProductsByProvider', async (_event, providerKey) => {
      await this.configManager.init();
      return this.configManager.getProductsByProvider(providerKey);
    });

    ipcMain.handle('config:getAccountsByProvider', async (_event, providerKey) => {
      await this.configManager.init();
      return this.configManager.getAccountsByProvider(providerKey);
    });

    ipcMain.handle('config:buildEnv', async (_event, { providerKey, productKey, accountKey }) => {
      await this.configManager.init();
      return this.configManager.buildEnv(providerKey, productKey, accountKey);
    });

    ipcMain.handle('env:apply', async (_event, envMap) => {
      return this.envManager.applyEnv(envMap);
    });
  }
}

module.exports = IPCHandlers;
