# AIOS Desktop 产品文档集

状态：产品规划基线。

这些文档重新定义 AIOS Desktop。它是一款简单的本地桌面应用，帮助用户查看、理解、整理和使用自己电脑上已经安装或配置的 AI 技能和 MCP 工具。

本阶段只做产品规划和需求说明，不改运行时代码、扫描代码、界面代码、包配置、构建配置、工作流、标签、发行或生成文件。

## 文档目录

- [产品定位](./01-product-positioning.zh-CN.md)
- [用户需求](./02-user-requirements.zh-CN.md)
- [用户旅程与首次使用流程](./03-user-journey-first-run.zh-CN.md)
- [信息架构](./04-information-architecture.zh-CN.md)
- [界面文案与术语指南](./05-ui-content-terminology.zh-CN.md)
- [技能库需求](./06-skill-library-requirements.zh-CN.md)
- [MCP 工具库需求](./07-mcp-library-requirements.zh-CN.md)
- [隐私与安全需求](./08-privacy-safety-requirements.zh-CN.md)
- [产品验收标准](./09-product-acceptance-criteria.zh-CN.md)
- [文档地图](./10-documentation-map.zh-CN.md)
- [术语合规检查清单](./11-terminology-compliance-checklist.zh-CN.md)
- [文档审计清单](./12-documentation-audit-inventory.zh-CN.md)
- [逐文档修正报告](./13-document-correction-report.zh-CN.md)

## 规划原则

- 普通用户永远是默认用户。
- 高级开发者可以看到更多来源和问题细节，但这些内容不能压过普通用户的主要流程。
- 主导航只保留：首页、技能、MCP、高级。
- 用户最先看到的问题应该是：我有多少 AI 技能？每个技能做什么？从哪里来？哪个工具能用？怎么用？哪些需要处理？有哪些 MCP 工具可用？
- 旧的 Scripts、Reports、Policies、Validators、Legacy，以及原始查找诊断和内部调试概念，不是一级产品模块。只有当它们直接帮助理解技能或 MCP 时，才可以放到“高级”里。

## 与旧文档的关系

现有 README 已改为面向普通用户的入口说明。`docs/*.zh-CN.md` 中的架构、发行、验收和迁移文档仍可作为历史、工程和发行参考；这些文档如果保留旧模块名或工程术语，必须标明内部用途。本目录是新的产品规划入口。
