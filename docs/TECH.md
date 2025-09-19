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
│   │   ├── config-manager.js   # 配置管理模块（读取 product/token 配置）
│   │   ├── env-manager.js      # 环境变量管理模块
│   │   └── ipc-handlers.js     # IPC通信处理
│   ├── renderer/               # React渲染进程
│   │   ├── components/         # UI组件
│   │   │   ├── ProductSelector.jsx
│   │   │   ├── ModelSelector.jsx
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
├── config/                     # 配置文件模板（可选）
│   ├── product-config.toml    # 运行时使用（用户自行拷贝示例生成）
│   └── token-config.toml      # 运行时使用（用户自行拷贝示例生成）
├── public/                     # 静态资源
├── dist/                      # 构建输出
├── package.json
├── electron-builder.json      # 打包配置
└── vite.config.js            # Vite配置
```

## 3. 核心模块设计

### 3.1 配置管理模块 (config-manager.js)

- 拆分为两个只读配置源：
  - `product-config.toml`：定义产品/模型的默认环境变量及 `token_field`
  - `token-config.toml`：定义各模型下的账号及其 `token`
- 不再支持新增/编辑账号；仅提供读取和合并能力。

```javascript
const fs = require('fs');
const path = require('path');
const toml = require('toml');

class ConfigManager {
  constructor() {
    this.configDir = path.join(require('os').homedir(), '.api-key-manager');
    this.productConfigFile = this.resolveConfigPath('product-config.toml');
    this.tokenConfigFile = this.resolveConfigPath('token-config.toml');
  }

  resolveConfigPath(fileName) {
    // 优先使用用户目录下配置，其次回退到应用内 config 目录
    const userPath = path.join(this.configDir, fileName);
    if (fs.existsSync(userPath)) return userPath;
    const appPath = path.join(__dirname, '../../config', fileName);
    return appPath;
  }

  async init() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
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
    return Object.keys(tokenConfig.models?.[model] || {}); // e.g. ["personal", "company"]
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
    const tokenField = modelConfig.token_field; // 字符串

    return {
      ...defaultEnv,
      [tokenField]: token
    };
  }
}
```

### 3.2 环境变量管理模块 (env-manager.js)

- 将 `ConfigManager.buildEnv` 构建的环境变量键值对应用到当前 shell，并写入 `~/.api-key-manager/.env`。
- 不修改：命令执行与写入 `.env` 的逻辑；仅强调输入为“最终合并后的环境变量”。

```javascript
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class EnvManager {
  constructor() {
    this.envFile = path.join(require('os').homedir(), '.api-key-manager', '.env');
  }

  async applyEnv(envMap) {
    const commands = this.generateEnvCommands(envMap);
    await this.execute(commands);
    await this.saveToEnvFile(envMap);
    return { success: true };
  }

  generateEnvCommands(envMap) {
    const exports = Object.entries(envMap).map(([k, v]) => `export ${k}="${v}"`).join('\n');
    const shellConfig = this.getShellConfigFile();
    return [
      Object.entries(envMap).map(([k, v]) => `export ${k}="${v}"`).join(' && '),
      `echo '${exports}' >> ${shellConfig}`
    ];
  }

  async execute(commands) {
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
    if (shell.includes('zsh')) return path.join(require('os').homedir(), '.zshrc');
    if (shell.includes('bash')) return path.join(require('os').homedir(), '.bashrc');
    return path.join(require('os').homedir(), '.profile');
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
    "node_modules/**/*"
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
    mainWindow.loadFile('dist/renderer/index.html');
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

## 7. 安全考虑

### 7.1 API密钥安全
- 不传输到外部服务器

### 7.2 权限管理
- 仅读写用户目录
- 不请求系统级权限
- 环境变量修改需要用户确认