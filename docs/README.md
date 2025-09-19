# API Key Manager 文档

## 文档结构

### 核心文档
- **[PRD.md](./PRD.md)** - 产品需求文档，包含完整的产品规格和功能定义
- **[user-flow.md](./user-flow.md)** - 用户流程图，详细描述用户操作流程和页面转换
- **产品配置示例**: [docs/product-config-example.toml](./product-config-example.toml)
- **账号/Token配置示例**: 根目录 [token-config-example.toml](../token-config-example.toml)

## 快速导航

### 产品概述
- 产品定位：本地API密钥管理平台
- 目标用户：使用多个大语言模型API的开发者
- 核心价值：统一管理、快速切换、简化配置

### 核心功能
1. **产品选择** - 选择Claude Code或Codex
2. **模型选择** - 选择底层模型（Claude、OpenAI等）
3. **账号选择（预置）** - 从预置账号列表选择（不支持新增/编辑/删除）
4. **配置推导** - 自动合并默认配置与所选账号token
5. **环境变量管理** - 预览并应用为系统环境变量

### 用户流程
1. 启动应用 → 选择产品
2. 选择产品 → 选择模型
3. 选择模型 → 选择账号（预置，不可新增）
4. 选择账号 → 确认配置
5. 确认配置 → 应用环境变量

## 配置说明

首次使用时，请将示例文件拷贝为实际配置文件：

```bash
cp docs/product-config-example.toml product-config.toml
cp token-config-example.toml token-config.toml
```

### TOML配置结构

- 产品与模型配置：`product-config.toml`
```toml
[products.产品名.models.模型名]
name = "显示名称"
description = "配置字段及相应默认值说明"
# 默认配置（会直接写入环境变量）
default_config = { KEY1 = "VALUE1", KEY2 = "VALUE2" }
# 该模型所需 token 字段名（从账号配置中读取后映射到此环境变量名）
token_field = "ENV_TOKEN_KEY"
```

- 账号/Token配置：`token-config.toml`
```toml
[models.模型名.账号名]
# 仅包含 token 值
# 注意：不会在UI中新增/编辑，仅供选择
token = "xxx"
```

### 配置示例
- Claude Code + A模型：需要4个环境变量，其中3个来自默认值，1个为 token 映射到 `ANTHROPIC_AUTH_TOKEN`
- Codex + A模型：默认值包含 `OPENAI_BASE_URL/OPENAI_MODEL/OPENAI_ORGANIZATION`，token 映射到 `OPENAI_API_KEY`

## 开发计划

### MVP版本
- [x] 产品需求文档
- [x] 用户流程设计
- [x] 配置格式定义（产品配置与账号配置分离）
- [ ] 前端界面开发（产品/模型/账号选择 + 确认）
- [ ] 配置合并与环境变量应用
- [ ] 构建打包

### 后续版本
- [ ] 配置导入导出
- [ ] 批量操作
- [ ] 高级配置选项
- [ ] 团队协作功能

## 联系方式

如有问题或建议，请通过以下方式联系：
- 项目仓库：api-key-manager
- 文档更新：请提交PR或Issue
