# AIOS Desktop 产品 RFC

文档类型：历史产品 RFC，已被 `docs/product/` 取代。

本文件保留为工程历史参考。当前权威产品定义见 `docs/product/README.zh-CN.md`。如果本文和 `docs/product/` 不一致，以 `docs/product/` 为准。

## 当前产品定位

AIOS Desktop 是一个简单的本地桌面应用，帮助用户查看、理解、整理和使用本机 AI 技能与 MCP 工具。

它不是复杂的 AI 资源管控后台，也不是脚本执行器、MCP 运行器或自动修复工具。

## 当前主导航

目标主导航只有四项：

- 首页。
- 技能。
- MCP。
- 高级。

旧工程阶段中提到的脚本、报告、项目包、策略、检查器和旧示例不是普通用户主功能。只有当它们直接帮助理解技能或 MCP 时，才可以作为高级信息出现。

## 核心原则

- 默认本地运行，不依赖远程服务完成核心查看。
- 默认只读。
- 首次启动不自动查找。
- 普通用户通过首页的一键查找开始。
- 高级用户可以手动选择明确文件夹。
- 不执行脚本。
- 不启动 MCP 服务，不调用 MCP 工具。
- 不读取、保存或展示密钥、令牌、密码、私钥、Cookie、登录会话或环境变量值。
- 不把查找到的技能或 MCP 自动同步到全局入口。

## 产品阶段说明

旧阶段名称仍可作为工程历史使用，但不再定义用户看到的主导航。

| 阶段 | 当前解释 |
| --- | --- |
| Phase 0 | 历史架构、安全、迁移和产品 RFC 文档。 |
| Phase 1 | 桌面壳基础。 |
| Phase 2 | 用户确认后的本地查找能力。 |
| Phase 3 | 本地结果保存和重新打开后查看。 |
| Phase 4 | 普通用户一键查找、高级来源管理和隐私控制。 |
| Phase 5 | 仅作为未来高级能力讨论，不能进入普通用户默认流程。 |

## 相关文档

- `docs/product/README.zh-CN.md`
- `docs/product/10-documentation-map.zh-CN.md`
- `docs/DESKTOP_ARCHITECTURE.zh-CN.md`
- `docs/SCANNER_POLICY.zh-CN.md`
- `docs/TAURI_MIGRATION_PLAN.zh-CN.md`
- `docs/SAFETY.zh-CN.md`
