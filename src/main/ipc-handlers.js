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
    ipcMain.handle('config:getProducts', async () => {
      await this.configManager.init();
      return this.configManager.getProducts();
    });

    ipcMain.handle('config:getModels', async (_event, product) => {
      await this.configManager.init();
      return this.configManager.getModels(product);
    });

    ipcMain.handle('config:getAccountsByModel', async (_event, model) => {
      await this.configManager.init();
      return this.configManager.getAccountsByModel(model);
    });

    ipcMain.handle('config:buildEnv', async (_event, { product, model, accountName }) => {
      await this.configManager.init();
      return this.configManager.buildEnv(product, model, accountName);
    });

    ipcMain.handle('env:apply', async (_event, envMap) => {
      return this.envManager.applyEnv(envMap);
    });
  }
}

module.exports = IPCHandlers; 