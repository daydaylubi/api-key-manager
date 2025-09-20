# API Key Manager - 产品需求文档 (PRD)

## 1. 产品概述

### 1.1 产品定位
API Key Manager 是一个本地API密钥管理平台，帮助开发者统一管理多个大语言模型的API配置，实现快速切换和集中管理。

### 1.2 目标用户
- 使用多个大语言模型API的开发者
- 需要在不同项目间切换API配置的团队
- 拥有多个API账号的开发者

### 1.3 核心价值
- **统一管理**：集中管理所有API密钥和配置
- **快速切换**：一键切换不同模型和账号组合
- **简化配置**：自动推导配置项，减少手动输入
- **本地存储**：数据安全，不上云

## 2. 产品目标

### 2.1 主要目标
- 解决多模型API配置管理复杂的问题
- 提供简单直观的配置切换体验
- 支持灵活的配置组合和扩展

### 2.2 成功指标
- 用户能在30秒内完成配置切换
- 支持主流大语言模型API
- 配置准确率100%

## 3. 功能需求

### 3.1 核心功能

#### 3.1.1 模型提供商选择
- 从 `config.toml` 读取模型提供商配置
- 支持选择不同模型提供商（ModelScope、BigModel等）
- 首页展示模型提供商选择界面

#### 3.1.2 产品选择
- 从 `config.toml` 读取模型提供商支持的产品列表
- 根据选择的模型提供商显示支持的产品类型（Claude Code、Codex等）
- 仅显示该模型提供商支持的产品

#### 3.1.3 账号选择
- 从 `config.toml` 读取模型提供商下的账号列表
- 支持选择预置的账号（如个人账号、公司账号）
- 仅支持选择与应用，不提供新增/编辑/删除，如需新增账号请修改 `config.toml`

#### 3.1.4 配置推导
- 根据模型提供商+产品+账号组合自动推导配置项

#### 3.1.5 环境变量管理
- 自动设置系统环境变量
- 支持配置预览和确认
- 实时生效

### 3.2 配置管理

#### 3.2.1 配置文件
- 使用单个 TOML 配置文件：`config.toml`（参考：`docs/config-example.toml`）
- 配置文件包含：
  - 模型提供商基本信息
  - 模型提供商下的账号配置（名称和token）
  - 各产品的环境变量默认值配置
  - token字段映射关系

#### 3.2.2 配置结构
```toml
# config.toml
[models.modelscope]
name = "ModelScope"

# 账号配置
[models.modelscope.accounts]
[models.modelscope.accounts.personal]
name = "个人账号"
token = "ms-xxx"
[models.modelscope.accounts.company]
name = "公司账号"
token = "ms-yyy"

# ModelScope 针对 Claude Code 的配置
[models.modelscope.products.claude_code]
description = "modelscope 针对 claude_code 需要配置的环境变量"
default_config = {
    ANTHROPIC_BASE_URL = "https://api-inference.modelscope.cn",
    ANTHROPIC_SMALL_FAST_MODEL = "Qwen/Qwen3-Coder-480B-A35B-Instruct",
    ANTHROPIC_MODEL = "Qwen/Qwen3-Coder-480B-A35B-Instruct"
}
token_field = "ANTHROPIC_AUTH_TOKEN"

# ModelScope 针对 Codex 的配置
[models.modelscope.products.codex]
description = "modelscope 针对 codex 需要配置的环境变量"
default_config = {
    CODEX_BASE_URL = "https://api-inference.modelscope.cn",
    CODEX_MODEL = "Qwen/Qwen3-Coder-480B-A35B-Instruct"
}
token_field = "CODEX_AUTH_TOKEN"
```

## 4. 用户流程

### 4.1 首次使用流程

1. 启动应用 → 显示模型提供商选择页面（来自 `config.toml`）
2. 选择模型提供商 → 显示产品选择页面（来自 `config.toml`）
3. 选择产品 → 显示账号选择页面（来自 `config.toml`）
4. 选择账号 → 显示该模型+产品+账号的配置信息（来自 `config.toml`）
5. 确认配置 → 应用配置
6. 应用成功 → 环境变量生效

### 4.2 日常使用流程

1. 启动应用 → 显示模型提供商选择页面
2. 选择模型提供商 → 显示产品选择页面
3. 选择产品 → 显示账号选择页面
4. 选择账号 → 确认并应用配置

## 5. 界面设计

### 5.1 首页 - 模型提供商选择
```
┌─────────────────────────────────────┐
│           API Key Manager           │
│                                     │
│    ┌─────────────┐  ┌─────────────┐ │
│    │ ModelScope  │  │  BigModel   │ │
│    └─────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
```

### 5.2 产品选择页面
```
┌─────────────────────────────────────┐
│  ModelScope - 选择产品              │
│                                     │
│  ┌─────────────┐ ┌─────────────┐     │
│  │ Claude Code │ │    Codex    │     │
│  └─────────────┘ └─────────────┘     │
└─────────────────────────────────────┘
```

### 5.3 账号选择页面
```
┌─────────────────────────────────────┐
│  Claude Code - 选择账号             │
│                                     │
│  ┌─────────────┐ ┌─────────────┐     │
│  │   个人账号   │ │   公司账号   │     │
│  └─────────────┘ └─────────────┘     │
└─────────────────────────────────────┘
```

### 5.4 配置确认页面
```
┌─────────────────────────────────────┐
│  确认应用配置                       │
│                                     │
│  模型提供商: ModelScope             │
│  产品: Claude Code                  │
│  账号: 个人账号                     │
│                                     │
│  将设置以下环境变量:                │
│  • ANTHROPIC_BASE_URL=xxx           │
│  • ANTHROPIC_AUTH_TOKEN=xxx         │
│  • ANTHROPIC_SMALL_FAST_MODEL=xxx   │
│  • ANTHROPIC_MODEL=xxx              │
│                                     │
│  ┌─────────────┐  ┌─────────────┐   │
│  │   应用配置   │  │    取消     │   │
│  └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```
