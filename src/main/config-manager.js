const fs = require('fs');
const path = require('path');
const toml = require('toml');
const os = require('os');

class ConfigManager {
  constructor() {
    this.configDir = path.join(os.homedir(), '.api-key-manager');
    this.configFile = path.join(this.configDir, 'config.toml');
    this.exampleConfigFile = path.join(this.configDir, 'config-example.toml');
    this.sourceExampleFile = path.join(__dirname, '../../docs/config-example.toml');
  }

  /**
   * 初始化配置管理器
   */
  async init() {
    // 确保配置目录存在
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    
    // 生成示例配置文件（如果不存在）
    if (!fs.existsSync(this.exampleConfigFile)) {
      await this.generateExampleConfig();
    }
    
    // 检查用户配置文件是否存在
    await this.checkConfigExists();
  }

  /**
   * 生成示例配置文件
   */
  async generateExampleConfig() {
    try {
      const exampleContent = fs.readFileSync(this.sourceExampleFile, 'utf8');
      fs.writeFileSync(this.exampleConfigFile, exampleContent);
      console.log(`示例配置文件已生成: ${this.exampleConfigFile}`);
    } catch (error) {
      console.error(`生成示例配置文件失败: ${error.message}`);
      throw new Error(`无法生成示例配置文件: ${error.message}`);
    }
  }

  /**
   * 检查配置文件是否存在
   * @throws {Error} 当配置文件不存在时抛出异常
   */
  async checkConfigExists() {
    if (!fs.existsSync(this.configFile)) {
      throw new Error(`配置文件不存在: ${this.configFile}\n请参考 ${this.exampleConfigFile} 创建配置文件`);
    }
    return true;
  }

  /**
   * 读取TOML配置文件
   * @param {string} filePath - 配置文件路径
   * @returns {Object} 解析后的配置对象
   */
  readToml(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return toml.parse(content);
    } catch (error) {
      console.error(`读取配置文件失败: ${filePath}`, error);
      throw new Error(`配置文件格式错误: ${error.message}`);
    }
  }

  /**
   * 获取所有模型提供商列表
   * @returns {Promise<Array<string>>} 模型提供商名称数组
   */
  async getModelProviders() {
    const config = this.readToml(this.configFile);
    const providers = [];
    
    Object.keys(config.models || {}).forEach(providerKey => {
      const providerConfig = config.models[providerKey];
      if (providerConfig.name) {
        providers.push({
          key: providerKey,
          name: providerConfig.name
        });
      }
    });
    
    return providers;
  }

  /**
   * 获取指定模型提供商支持的产品列表
   * @param {string} providerKey - 模型提供商key
   * @returns {Promise<Array<string>>} 产品名称数组
   */
  async getProductsByProvider(providerKey) {
    const config = this.readToml(this.configFile);
    const providerConfig = config.models?.[providerKey];
    
    if (!providerConfig || !providerConfig.products) {
      return [];
    }
    
    const products = [];
    Object.entries(providerConfig.products).forEach(([productKey, productConfig]) => {
      products.push({
        key: productKey,
        name: productConfig.name || productKey
      });
    });
    
    return products;
  }

  /**
   * 获取模型提供商下的账号列表
   * @param {string} providerKey - 模型提供商key
   * @returns {Promise<Array<Object>>} 账号信息数组，包含key、name和token
   */
  async getAccountsByProvider(providerKey) {
    const config = this.readToml(this.configFile);
    const providerConfig = config.models?.[providerKey];
    
    if (!providerConfig || !providerConfig.accounts) {
      return [];
    }
    
    const accounts = [];
    Object.keys(providerConfig.accounts).forEach(accountKey => {
      const account = providerConfig.accounts[accountKey];
      if (account.name && account.token) {
        accounts.push({
          key: accountKey,
          name: account.name,
          token: account.token
        });
      }
    });
    
    return accounts;
  }

  /**
   * 获取模型提供商信息
   * @param {string} providerKey - 模型提供商key
   * @returns {Promise<Object>} 模型提供商配置对象
   */
  async getProviderInfo(providerKey) {
    const config = this.readToml(this.configFile);
    return config.models?.[providerKey];
  }

  /**
   * 获取模型提供商在指定产品的配置
   * @param {string} providerKey - 模型提供商key
   * @param {string} productKey - 产品key
   * @returns {Promise<Object>} 产品特定的配置
   */
  async getProviderProductConfig(providerKey, productKey) {
    const config = this.readToml(this.configFile);
    return config.models?.[providerKey]?.products?.[productKey];
  }

  /**
   * 构建环境变量配置
   * @param {string} providerKey - 模型提供商key
   * @param {string} productKey - 产品key
   * @param {string} accountKey - 账号key
   * @returns {Promise<Object>} 环境变量键值对
   * @throws {Error} 当配置不存在或格式错误时抛出异常
   */
  async buildEnv(providerKey, productKey, accountKey) {
    if (!providerKey || !productKey || !accountKey) {
      throw new Error('模型提供商、产品和账号名称不能为空');
    }

    try {
      const config = this.readToml(this.configFile);
      const providerConfig = config.models?.[providerKey];
      const productConfig = providerConfig?.products?.[productKey];
      const accountConfig = providerConfig?.accounts?.[accountKey];

      if (!providerConfig) throw new Error(`模型提供商 ${providerKey} 的配置不存在`);
      if (!productConfig) throw new Error(`产品 ${productKey} 的配置不存在`);
      if (!accountConfig) throw new Error(`账号 ${accountKey} 的配置不存在`);
      if (!accountConfig.token) throw new Error(`账号 ${accountKey} 的token未配置`);

      const defaultEnv = productConfig.default_config || {};
      const tokenField = productConfig.token_field;

      if (!tokenField) {
        throw new Error(`产品 ${productKey} 的token_field未配置`);
      }

      return {
        ...defaultEnv,
        [tokenField]: accountConfig.token
      };
    } catch (error) {
      console.error('构建环境变量失败:', error);
      throw new Error(`构建环境变量失败: ${error.message}`);
    }
  }
}

module.exports = ConfigManager;
