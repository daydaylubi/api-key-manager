# API Key Manager - 技术文档

## 1. 技术架构

### 1.1 整体架构
```
┌─────────────────────────────────────┐
│           Electron App              │
│  ┌─────────────────────────────────┐ │
│  │        React Frontend           │ │
│  │  ┌─────────┐ ┌─────────┐       │ │
│  │  │ 页面组件 │ │ 状态管理 │       │ │
│  │  └─────────┘ └─────────┘       │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │        Node.js Backend          │ │
│  │  ┌─────────┐ ┌─────────┐       │ │
│  │  │ 配置管理 │ │ 环境变量 │       │ │
│  │  └─────────┘ └─────────┘       │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 1.2 技术栈
- **桌面应用框架**：Electron
- **前端框架**：React + JavaScript
- **状态管理**：React Context + useReducer
- **配置管理**：TOML + Node.js fs模块
- **环境变量管理**：Node.js child_process + shell命令
- **构建工具**：Vite + Electron Builder

## 2. 项目结构

```
api-key-manager/
├── src/
│   ├── main/                    # Electron主进程
│   │   ├── main.js             # 应用入口
│   │   ├── config-manager.js   # 配置管理模块（读取 config.toml）
│   │   ├── env-manager.js      # 环境变量管理模块
│   │   └── ipc-handlers.js     # IPC通信处理
│   ├── renderer/               # React渲染进程
│   │   ├── components/         # UI组件
│   │   │   ├── ProviderSelector.jsx
│   │   │   ├── ProductSelector.jsx
│   │   │   ├── AccountSelector.jsx
│   │   │   └── ConfigPreview.jsx
│   │   ├── pages/              # 页面组件
│   │   │   ├── HomePage.jsx
│   │   │   └── ConfirmPage.jsx
│   │   ├── hooks/              # 自定义Hooks
│   │   │   ├── useConfig.js
│   │   │   └── useEnvManager.js
│   │   ├── context/            # React Context
│   │   │   └── AppContext.js
│   │   └── App.jsx             # 应用入口
│   └── shared/                 # 共享代码
│       ├── constants.js        # 常量定义
│       └── utils.js           # 工具函数
├── docs/                       # 文档目录
│   └── config-example.toml    # 配置文件示例
├── public/                     # 静态资源
├── dist/                      # 构建输出
├── package.json
├── electron-builder.json      # 打包配置
└── vite.config.js            # Vite配置
```

## 3. 核心模块设计

### 3.1 配置管理模块 (config-manager.js)

- 使用单个配置文件：`~/.api-key-manager/config.toml`
- 配置文件包含模型提供商基本信息、账号配置和各产品的环境变量配置
- 应用启动时自动在用户目录生成 config-example.toml 示例文件
- 如果用户配置文件不存在，会提示用户参考示例文件进行配置
- 支持多账号配置，每个模型提供商可以有多个账号

```javascript
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

  // 生成示例配置文件
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

  // 检查配置文件是否存在
  async checkConfigExists() {
    if (!fs.existsSync(this.configFile)) {
      throw new Error(`配置文件不存在: ${this.configFile}\n请参考 ${this.exampleConfigFile} 创建配置文件`);
    }
    return true;
  }

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

  async getProductsByProvider(providerKey) {
    const config = this.readToml(this.configFile);
    const providerConfig = config.models?.[providerKey];
    
    if (!providerConfig || !providerConfig.products) {
      return [];
    }
    
    const products = [];
    Object.keys(providerConfig.products).forEach(productKey => {
      products.push({
        key: productKey,
        name: productKey
      });
    });
    
    return products;
  }

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

  async getProviderInfo(providerKey) {
    const config = this.readToml(this.configFile);
    return config.models?.[providerKey];
  }

  async getProviderProductConfig(providerKey, productKey) {
    const config = this.readToml(this.configFile);
    return config.models?.[providerKey]?.products?.[productKey];
  }

  // 读取TOML配置文件
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
   * 构建环境变量配置
   * @param {string} providerKey - 模型提供商key
   * @param {string} productKey - 产品key
   * @param {string} accountKey - 账号key
   * @returns {Object} 环境变量键值对
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
```

### 3.2 环境变量管理模块 (env-manager.js)

- 将 `ConfigManager.buildEnv` 构建的环境变量键值对应用到当前 shell，并写入 `~/.api-key-manager/.env`。
- 支持多账号环境变量管理，自动清理之前的配置

```javascript
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class EnvManager {
  constructor() {
    this.envFile = path.join(os.homedir(), '.api-key-manager', '.env');
    this.blockStart = '# >>> api-key-manager >>>';
    this.blockEnd = '# <<< api-key-manager <<<'
  }

  async applyEnv(envMap) {
    const previousKeys = this.getPreviousKeys();
    const commands = this.generateEnvCommands(previousKeys, envMap);
    await this.execute(commands);
    await this.updateShellConfig(envMap);
    await this.saveToEnvFile(envMap);
    return { success: true };
  }

  getPreviousKeys() {
    try {
      if (!fs.existsSync(this.envFile)) return [];
      const content = fs.readFileSync(this.envFile, 'utf8');
      const keys = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.split('=')[0])
        .filter(Boolean);
      return Array.from(new Set(keys));
    } catch {
      return [];
    }
  }

  generateEnvCommands(previousKeys, nextEnvMap) {
    const unsets = (previousKeys || [])
      .filter((k) => k && !(k in nextEnvMap))
      .map((k) => `unset ${k}`)
      .join(' && ');

    const exports = Object.entries(nextEnvMap)
      .map(([k, v]) => `export ${k}="${String(v).replace(/"/g, '\\"')}"`)
      .join(' && ');

    const cmds = [];
    if (unsets) cmds.push(unsets);
    if (exports) cmds.push(exports);
    return cmds;
  }

  async execute(commands) {
    if (!commands.length) return;
    return new Promise((resolve, reject) => {
      exec(commands.join(' && '), (error, stdout) => error ? reject(error) : resolve(stdout));
    });
  }

  async saveToEnvFile(envMap) {
    const content = Object.entries(envMap).map(([k, v]) => `${k}=${v}`).join('\n');
    fs.writeFileSync(this.envFile, content);
  }

  getShellConfigFile() {
    const shell = process.env.SHELL || '/bin/zsh';
    if (shell.includes('zsh')) return path.join(os.homedir(), '.zshrc');
    if (shell.includes('bash')) return path.join(os.homedir(), '.bashrc');
    return path.join(os.homedir(), '.profile');
  }

  async updateShellConfig(envMap) {
    const shellConfig = this.getShellConfigFile();
    const exportsText = Object.entries(envMap)
      .map(([k, v]) => `export ${k}="${String(v).replace(/\"/g, '"').replace(/"/g, '\\"')}"`)
      .join('\n');

    const block = [
      this.blockStart,
      '# Managed by API Key Manager. Do not edit between these markers.',
      exportsText,
      this.blockEnd,
      ''
    ].join('\n');

    let original = '';
    try {
      if (fs.existsSync(shellConfig)) {
        original = fs.readFileSync(shellConfig, 'utf8');
      }
    } catch (error) {
      console.error('Error reading shell config file:', error);
      throw new Error(`Failed to read shell config file: ${error.message}`);
    }

    // More robust regex pattern that handles various line endings and whitespace
    const startEsc = this.blockStart.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const endEsc = this.blockEnd.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Match the entire block with any characters (including newlines) in between
    const blockRegexGlobal = new RegExp(`\n?${startEsc}[^]*?${endEsc}\n?`, 'g');

    // Remove any existing blocks
    let next = original.replace(blockRegexGlobal, '').trim();
    
    // Add new block with proper spacing
    if (next) {
      next = `${next}\n\n${block}`;
    } else {
      next = block;
    }

    try {
      // Ensure the file ends with a single newline
      fs.writeFileSync(shellConfig, `${next}\n`, { encoding: 'utf8' });
    } catch (error) {
      console.error('Error writing to shell config file:', error);
      throw new Error(`Failed to update shell config file: ${error.message}`);
    }
  }
}
```

## 4. 构建和打包配置

### 4.1 package.json

```json
{
  "name": "api-key-manager",
  "version": "1.0.0",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "dist": "npm run build && electron-builder",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:win": "npm run build && electron-builder --win",
    "dist:linux": "npm run build && electron-builder --linux"
  },
  "dependencies": {
    "electron": "^27.0.0",
    "toml": "^3.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "concurrently": "^8.2.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}
```

### 4.2 electron-builder.json

```json
{
  "appId": "com.api-key-manager.app",
  "productName": "API Key Manager",
  "directories": {
    "output": "dist-electron"
  },
  "files": [
    "dist/**/*",
    "docs/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.developer-tools",
    "target": "dmg"
  },
  "win": {
    "target": "nsis"
  },
  "linux": {
    "target": "AppImage"
  }
}
```

## 5. 开发环境配置

### 5.1 vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer'
  },
  server: {
    port: 3000
  }
});
```

### 5.2 主进程入口 (main.js)

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const IPCHandlers = require('./main/ipc-handlers');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // 初始化IPC处理器
  new IPCHandlers();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

## 6. 部署和分发

### 6.1 构建流程
1. 开发环境：`npm run dev`
2. 生产构建：`npm run build`
3. 打包分发：`npm run dist`

### 6.2 系统要求
- macOS 10.14+（MVP 仅支持 macOS 系统）

### 6.3 安装包
- macOS: `.dmg` 文件

## 7. 配置文件管理

### 7.1 配置文件位置
- 用户配置文件：`~/.api-key-manager/config.toml`
- 示例配置文件：`docs/config-example.toml`（打包时包含）

### 7.2 首次运行流程
1. 应用启动时检查 `~/.api-key-manager/config.toml` 是否存在
2. 如果不存在，从 `docs/config-example.toml` 复制生成
3. 用户可编辑生成的配置文件来设置自己的模型和token

### 7.3 配置文件结构
```toml
[models.modelscope]
name = "ModelScope"

# 账号配置
[models.modelscope.accounts]
[models.modelscope.accounts.personal]
name = "个人账号"
token = "ms-your-actual-token"
[models.modelscope.accounts.company]
name = "公司账号"
token = "ms-company-token"

# 产品配置
[models.modelscope.products.claude_code]
description = "ModelScope 针对 claude_code 需要配置的环境变量"
default_config = {
    ANTHROPIC_BASE_URL = "https://api-inference.modelscope.cn",
    ANTHROPIC_SMALL_FAST_MODEL = "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    ANTHROPIC_MODEL = "Qwen/Qwen3-Coder-480B-A35B-Instruct"
}
token_field = "ANTHROPIC_AUTH_TOKEN"
```

## 8. 安全考虑

### 8.1 API密钥安全
- 不传输到外部服务器
- 仅存储在用户本地配置文件

### 8.2 权限管理
- 仅读写用户目录
- 不请求系统级权限
- 环境变量修改需要用户确认
