const fs = require('fs');
const path = require('path');
const toml = require('toml');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.api-key-manager');
    this.productConfigFile = this.resolveConfigPath('product-config.toml');
    this.tokenConfigFile = this.resolveConfigPath('token-config.toml');
  }

  resolveConfigPath(fileName) {
    const userPath = path.join(this.configDir, fileName);
    if (fs.existsSync(userPath)) return userPath;
    const appPath = path.join(__dirname, '../../config', fileName);
    return appPath;
  }

  async init() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    this.ensureExampleFiles();
  }

  ensureExampleFiles() {
    try {
      const appConfigDir = path.join(__dirname, '../../config');
      const examples = [
        { src: path.join(appConfigDir, 'product-config.toml'), dst: path.join(this.configDir, 'product-config.example.toml') },
        { src: path.join(appConfigDir, 'token-config.toml'), dst: path.join(this.configDir, 'token-config.example.toml') }
      ];
      for (const { src, dst } of examples) {
        if (fs.existsSync(src) && !fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
        }
      }
    } catch (_) {
      // ignore example copy failures to avoid blocking app
    }
  }

  readToml(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return toml.parse(content);
  }

  async getProducts() {
    const productConfig = this.readToml(this.productConfigFile);
    return Object.keys(productConfig.products || {});
  }

  async getModels(product) {
    const productConfig = this.readToml(this.productConfigFile);
    return Object.keys(productConfig.products?.[product]?.models || {});
  }

  async getAccountsByModel(model) {
    const tokenConfig = this.readToml(this.tokenConfigFile);
    return Object.keys(tokenConfig.models?.[model] || {});
  }

  async getModelConfig(product, model) {
    const productConfig = this.readToml(this.productConfigFile);
    return productConfig.products?.[product]?.models?.[model];
  }

  async buildEnv(product, model, accountName) {
    const modelConfig = await this.getModelConfig(product, model);
    const tokenConfig = this.readToml(this.tokenConfigFile);
    const token = tokenConfig.models?.[model]?.[accountName]?.token;

    if (!modelConfig) throw new Error('模型配置不存在');
    if (!token) throw new Error('账号或token不存在');

    const defaultEnv = modelConfig.default_config || {};
    const tokenField = modelConfig.token_field;

    return {
      ...defaultEnv,
      [tokenField]: token
    };
  }
}

module.exports = ConfigManager; 