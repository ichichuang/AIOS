# 文档审计清单

状态：本轮文档审计产物。

审计范围包括 README、`docs/**/*.md`、`docs/product/**/*.md` 和测试样例中的 Markdown。测试样例文件不作为产品文档，但为完整性列入清单。

## 分类说明

| 分类 | 含义 |
| --- | --- |
| user-facing | 普通用户或测试人员会优先阅读。 |
| product-planning | 定义产品方向、需求、信息架构、文案或验收。 |
| developer-only | 面向开发者的架构、实现、命令或迁移资料。 |
| safety/internal | 安全、发行、验收或内部流程资料。 |
| legacy/obsolete | 被新文档取代，仅保留历史价值。 |
| unclear | 不直接服务产品理解，或只是测试样例。 |

## 审计清单

| 文档 | 分类 | 本轮判断 |
| --- | --- | --- |
| `README.md` | user-facing | 已重写为普通用户入口，去掉广义资源控制台定位。 |
| `docs/ARCHITECTURE.zh-CN.md` | developer-only / legacy | 已标明内部历史架构，不定义当前主导航。 |
| `docs/DESIGN_SYSTEM.zh-CN.md` | product-planning | 已重写为当前产品方向的设计系统。 |
| `docs/DESKTOP_ARCHITECTURE.zh-CN.md` | developer-only | 已标明内部架构文档。 |
| `docs/DESKTOP_CUSTOM_SCAN_SMOKE.zh-CN.md` | safety/internal | 已标明内部验收文档。 |
| `docs/DESKTOP_PRODUCT_RFC.zh-CN.md` | legacy/obsolete | 已标明被 `docs/product/` 取代，并改写当前定位摘要。 |
| `docs/DESKTOP_RELEASE_READINESS.zh-CN.md` | safety/internal | 已标明内部发行准备文档。 |
| `docs/DESKTOP_SHELL_SMOKE.zh-CN.md` | safety/internal | 已标明内部验收文档。 |
| `docs/DISCOVERY_SAFETY_ACCEPTANCE.zh-CN.md` | safety/internal | 已标明内部安全验收文档。 |
| `docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md` | developer-only / safety/internal | 已标明内部发行工程文档。 |
| `docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md` | safety/internal | 已标明内部发行文档。 |
| `docs/NATIVE_APP_DATA_ACCEPTANCE_0.1.0.zh-CN.md` | safety/internal | 已标明内部验收文档。 |
| `docs/PRODUCT_UX_ACCEPTANCE_0.1.0.zh-CN.md` | legacy/obsolete / safety/internal | 已标明历史验收，当前验收以产品文档为准。 |
| `docs/RELEASE_BASELINE_0.1.0.zh-CN.md` | safety/internal | 已标明内部发行基线。 |
| `docs/ROADMAP.zh-CN.md` | product-planning | 已重写为当前产品方向路线图。 |
| `docs/SAFETY.zh-CN.md` | safety/internal | 已标明开发者内部安全文档。 |
| `docs/SCANNER_POLICY.zh-CN.md` | safety/internal / developer-only | 已标明内部安全文档，普通用户术语需用产品文档。 |
| `docs/TAURI_MIGRATION_PLAN.zh-CN.md` | developer-only / legacy | 已标明内部历史迁移文档。 |
| `docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md` | safety/internal | 已标明内部发行审计文档。 |
| `docs/product/README.zh-CN.md` | product-planning | 产品文档集入口，已补充文档地图、检查清单和审计报告链接。 |
| `docs/product/01-product-positioning.zh-CN.md` | product-planning | 权威产品定位。 |
| `docs/product/02-user-requirements.zh-CN.md` | product-planning | 权威用户需求。 |
| `docs/product/03-user-journey-first-run.zh-CN.md` | product-planning | 权威首次使用流程。 |
| `docs/product/04-information-architecture.zh-CN.md` | product-planning | 权威信息架构。 |
| `docs/product/05-ui-content-terminology.zh-CN.md` | product-planning | 权威术语和文案指南。 |
| `docs/product/06-skill-library-requirements.zh-CN.md` | product-planning | 权威技能库需求。 |
| `docs/product/07-mcp-library-requirements.zh-CN.md` | product-planning | 权威 MCP 工具库需求。 |
| `docs/product/08-privacy-safety-requirements.zh-CN.md` | product-planning | 权威隐私与安全需求。 |
| `docs/product/09-product-acceptance-criteria.zh-CN.md` | product-planning | 权威产品验收标准。 |
| `docs/product/10-documentation-map.zh-CN.md` | product-planning | 文档权威性地图。 |
| `docs/product/11-terminology-compliance-checklist.zh-CN.md` | product-planning | 术语合规检查清单。 |
| `docs/product/12-documentation-audit-inventory.zh-CN.md` | product-planning | 本文档审计清单。 |
| `docs/product/13-document-correction-report.zh-CN.md` | product-planning | 本轮逐文档修正报告。 |
| `test-fixtures/custom-scan-basic/policies/local-policy.md` | unclear | 测试样例，不是产品文档。 |
| `test-fixtures/custom-scan-basic/prompts/draft.prompt.md` | unclear | 测试样例，不是产品文档。 |
| `test-fixtures/custom-scan-basic/reports/phase-2a.md` | unclear | 测试样例，不是产品文档。 |
| `test-fixtures/custom-scan-basic/skills/writer/SKILL.md` | unclear | 测试样例，不是产品文档。 |

## 审计结论

- 用户入口已改为 README 和 `docs/product/`。
- 当前产品方向不再是广义资源控制台。
- 当前目标主导航为：首页、技能、MCP、高级。
- 旧模块名和工程术语仅可保留在内部、历史或审计说明中。
- 未删除任何文档。
