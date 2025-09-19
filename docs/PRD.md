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

#### 3.1.1 产品选择
- 支持选择不同产品类型（Claude Code、Codex等）
- 首页展示产品选择界面

#### 3.1.2 模型选择
- 支持选择底层模型（Claude、OpenAI、Others等）
- 根据产品类型显示可用模型

#### 3.1.3 账号选择
- 从 `token-config.toml` 读取账号列表（由示例拷贝生成）
- 支持为同一模型显示多个预置账号（如 personal/company）
- 仅支持选择与应用，不提供新增/编辑/删除

#### 3.1.4 配置推导
- 根据产品+模型组合自动推导配置项
- 预置常用配置的默认值
- 不再需要用户手动输入密钥等必要信息（从 `token-config.toml` 获取）

#### 3.1.5 环境变量管理
- 自动设置系统环境变量
- 支持配置预览和确认
- 实时生效

### 3.2 配置管理

#### 3.2.1 配置文件
- 使用两个 TOML 配置文件：
  - `product-config.toml`：定义各产品、模型所需的环境变量字段和默认值（参考： `docs/product-config-example.toml`）
  - `token-config.toml`：定义各模型下的账号及其 token 值（参考： `token-config-example.toml` ）
- 产品配置中使用 `default_config` 定义环境变量默认值，使用 `token_field` 声明该模型所需的密钥字段名（如 `ANTHROPIC_AUTH_TOKEN`、`OPENAI_API_KEY` 等）
- 账号配置仅包含每个模型下各账号的 `token` 值

#### 3.2.2 配置结构
```toml
# product-config.toml
[products.claude_code.models.a]
name = "A模型"
description = "Claude Code A模型配置字段及相应默认值"
default_config = {
    ANTHROPIC_BASE_URL = "https://api.anthropic.com",
    ANTHROPIC_SMALL_FAST_MODEL = "claude-3-haiku-20240307",
    ANTHROPIC_MODEL = "claude-3-sonnet-20240229"
}
# 该模型所需 token 字段名
token_field = "ANTHROPIC_AUTH_TOKEN"

[products.codex.models.a]
name = "A模型"
description = "Codex A模型配置字段及相应默认值"
default_config = {
    OPENAI_BASE_URL = "https://api.a.com/v1",
    OPENAI_MODEL = "gpt-4",
    OPENAI_ORGANIZATION = "org-xxx"
}
# 该模型所需 token 字段名
token_field = "OPENAI_API_KEY"

# token-config.toml
[models.a.personal]
token = "a-xxx"

[models.a.company]
token = "a-yyy"

[models.b.personal]
token = "b-xxx"

[models.b.company]
token = "b-yyy"
```

## 4. 用户流程

### 4.1 首次使用流程

1. 启动应用 → 显示产品选择页面
2. 选择产品 → 显示模型选择页面
3. 选择模型 → 显示账号列表（来自 `token-config.toml`）
4. 选择账号 → 确认并应用配置
5. 应用成功 → 环境变量生效

### 4.2 日常使用流程

1. 启动应用 → 显示产品选择页面
2. 选择产品 → 显示模型选择页面
3. 选择模型 → 显示账号列表
4. 选择账号 → 确认并应用配置

## 5. 界面设计

### 5.1 首页 - 产品选择
```
┌─────────────────────────────────────┐
│           API Key Manager           │
│                                     │
│    ┌─────────────┐  ┌─────────────┐ │
│    │ Claude Code │  │    Codex    │ │
│    └─────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
```

### 5.2 模型选择页面
```
┌─────────────────────────────────────┐
│  Claude Code - 选择模型             │
│                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │ Claude  │ │ OpenAI  │ │ Others  │ │
│  └─────────┘ └─────────┘ └─────────┘ │
└─────────────────────────────────────┘
```

### 5.3 账号选择页面
```
┌─────────────────────────────────────┐
│  Claude Code + Claude - 选择账号    │
│                                     │
│  ┌─────────────────────────────────┐ │
│  │ 账号1 (个人)                    │ │
│  │ 账号2 (公司)                    │ │
│  │ 账号3 (测试)                    │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 5.4 配置确认页面
```
┌─────────────────────────────────────┐
│  确认应用配置                       │
│                                     │
│  产品: Claude Code                  │
│  模型: A模型                        │
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
