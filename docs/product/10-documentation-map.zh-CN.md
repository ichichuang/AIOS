# 文档地图

状态：产品文档导航和权威性说明。

AIOS Desktop 的当前产品定义以 `docs/product/` 为准。其他文档可以保留工程、发行、验收和历史信息，但不能覆盖这里的产品定位、主导航、术语和验收标准。

## 权威产品文档

这些文档定义当前产品方向，后续 UI、扫描和文案实现应优先遵守：

| 文档 | 权威内容 |
| --- | --- |
| `docs/product/01-product-positioning.zh-CN.md` | 产品定位、服务对象、产品承诺和边界。 |
| `docs/product/02-user-requirements.zh-CN.md` | 普通用户需求、高级开发者需求、优先级和非目标。 |
| `docs/product/03-user-journey-first-run.zh-CN.md` | 首次启动、一键查找、结果概览、详情和高级来源设置。 |
| `docs/product/04-information-architecture.zh-CN.md` | 目标主导航：首页、技能、MCP、高级。 |
| `docs/product/05-ui-content-terminology.zh-CN.md` | 用户界面术语、禁用说法、空状态、隐私和错误文案。 |
| `docs/product/06-skill-library-requirements.zh-CN.md` | 技能库列表、详情、分组、搜索、筛选和异常处理。 |
| `docs/product/07-mcp-library-requirements.zh-CN.md` | MCP 服务、工具、配置来源、状态、风险和人工处理建议。 |
| `docs/product/08-privacy-safety-requirements.zh-CN.md` | 面向用户的隐私、安全和确认边界。 |
| `docs/product/09-product-acceptance-criteria.zh-CN.md` | 产品验收标准。 |

## 支持文档

这些文档支持当前产品，但不单独定义产品方向：

| 文档 | 用途 |
| --- | --- |
| `README.md` | 普通用户和测试人员入口说明。 |
| `docs/ROADMAP.zh-CN.md` | 产品路线图支持文档。 |
| `docs/DESIGN_SYSTEM.zh-CN.md` | 面向当前产品方向的设计系统约束。 |
| `docs/product/10-documentation-map.zh-CN.md` | 文档权威性和分类说明。 |
| `docs/product/11-terminology-compliance-checklist.zh-CN.md` | 术语合规检查。 |
| `docs/product/12-documentation-audit-inventory.zh-CN.md` | 文档审计清单。 |
| `docs/product/13-document-correction-report.zh-CN.md` | 本轮逐文档修正报告。 |

## 内部工程文档

这些文档可保留技术词、历史模块名和验收细节，但必须视为内部资料。它们不定义普通用户主导航。

| 文档 | 类型 |
| --- | --- |
| `docs/ARCHITECTURE.zh-CN.md` | 开发者内部历史架构。 |
| `docs/DESKTOP_ARCHITECTURE.zh-CN.md` | 开发者内部 Tauri 架构。 |
| `docs/SCANNER_POLICY.zh-CN.md` | 开发者内部扫描与隐私策略。 |
| `docs/SAFETY.zh-CN.md` | 开发者内部安全边界。 |
| `docs/TAURI_MIGRATION_PLAN.zh-CN.md` | 开发者内部迁移历史。 |
| `docs/DESKTOP_RELEASE_READINESS.zh-CN.md` | 内部发行准备。 |
| `docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md` | 内部发行流程。 |
| `docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md` | 内部打包工程计划。 |
| `docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md` | 内部打包兼容性审计。 |
| `docs/DESKTOP_SHELL_SMOKE.zh-CN.md` | 内部桌面壳验收。 |
| `docs/DESKTOP_CUSTOM_SCAN_SMOKE.zh-CN.md` | 内部指定目录查找验收。 |
| `docs/DISCOVERY_SAFETY_ACCEPTANCE.zh-CN.md` | 内部查找安全验收。 |
| `docs/NATIVE_APP_DATA_ACCEPTANCE_0.1.0.zh-CN.md` | 内部原生应用数据验收。 |
| `docs/RELEASE_BASELINE_0.1.0.zh-CN.md` | 内部发行基线。 |

## 已被取代或历史化的文档

这些文档保留历史价值，但不再作为当前产品定义：

| 文档 | 当前状态 |
| --- | --- |
| `docs/DESKTOP_PRODUCT_RFC.zh-CN.md` | 已被 `docs/product/` 取代，保留为历史 RFC。 |
| `docs/PRODUCT_UX_ACCEPTANCE_0.1.0.zh-CN.md` | 0.1.0 历史验收，当前验收以 `docs/product/09-product-acceptance-criteria.zh-CN.md` 为准。 |
| `docs/ARCHITECTURE.zh-CN.md` | 早期 Control Center 架构，当前产品定义以 `docs/product/` 为准。 |

## Fixture Markdown

`test-fixtures/custom-scan-basic/**/*.md` 是测试样例数据，不是产品文档，不定义产品方向。

## 冲突处理规则

当文档之间发生冲突：

1. 先遵守 `docs/product/`。
2. 再参考 README 和支持文档。
3. 内部工程、发行、验收和历史文档只作为实现或追溯证据。
4. 如果旧文档出现旧模块名，应理解为历史实现或高级内部信息，不应进入普通用户主导航。
