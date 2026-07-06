# 逐文档修正报告

状态：本轮 docs-only correction 记录。

本轮只改文档，不改运行时代码、扫描代码、UI 代码、包文件、构建文件、工作流、生成资产、标签、发行或版本文件。

## 主要冲突

审计发现旧文档中存在这些冲突：

- README 把 AIOS Desktop 描述为广义资源发现与控制中心。
- README 和旧验收文档把脚本、报告、项目包、策略、验证器、旧入口描述为默认模块。
- 设计系统旧导航包含大量一级模块。
- 旧产品 RFC 把产品定位为本地 AI 能力与资源控制中心。
- 多个内部文档保留旧模块名、扫描实现、存储实现和历史验收语言，容易被误读为当前产品定义。

## 修正策略

- 用户-facing 文档直接改写为普通用户能理解的产品说明。
- 产品规划文档以 `docs/product/` 为权威来源。
- 必须保留工程术语的文档标明内部、历史或发行用途。
- 不删除历史文档，避免丢失工程追溯。

## 逐文档报告

| 文档 | 修正动作 | 结果 |
| --- | --- | --- |
| `README.md` | 重写。 | 改为普通用户入口，定义产品为本地技能和 MCP 查看、理解、整理和使用工具。 |
| `docs/ROADMAP.zh-CN.md` | 重写。 | 改为围绕首页、技能、MCP、高级的路线图。 |
| `docs/DESIGN_SYSTEM.zh-CN.md` | 重写。 | 主导航改为首页、技能、MCP、高级，移除旧模块作为主导航。 |
| `docs/DESKTOP_PRODUCT_RFC.zh-CN.md` | 重写并历史化。 | 标明已被 `docs/product/` 取代，保留为历史 RFC。 |
| `docs/ARCHITECTURE.zh-CN.md` | 添加内部历史说明。 | 保留工程内容，但不再定义当前产品。 |
| `docs/DESKTOP_ARCHITECTURE.zh-CN.md` | 添加开发者内部说明。 | 保留 Tauri 架构细节。 |
| `docs/SCANNER_POLICY.zh-CN.md` | 添加内部安全说明。 | 保留工程边界，说明普通用户应使用简单术语。 |
| `docs/SAFETY.zh-CN.md` | 添加内部安全说明。 | 不再被误读为用户产品模块定义。 |
| `docs/TAURI_MIGRATION_PLAN.zh-CN.md` | 添加内部历史说明。 | 保留迁移历史和旧模块记录。 |
| `docs/PRODUCT_UX_ACCEPTANCE_0.1.0.zh-CN.md` | 添加历史验收说明。 | 当前验收改以 `docs/product/09-product-acceptance-criteria.zh-CN.md` 为准。 |
| `docs/RELEASE_BASELINE_0.1.0.zh-CN.md` | 添加内部发行说明。 | 保留 0.1.0 发行历史。 |
| `docs/NATIVE_APP_DATA_ACCEPTANCE_0.1.0.zh-CN.md` | 添加内部验收说明。 | 保留原生 app-data 验收记录。 |
| `docs/DISCOVERY_SAFETY_ACCEPTANCE.zh-CN.md` | 添加内部安全验收说明。 | 保留查找安全验收记录。 |
| `docs/DESKTOP_CUSTOM_SCAN_SMOKE.zh-CN.md` | 添加内部验收说明。 | 保留指定目录查找验收记录。 |
| `docs/DESKTOP_SHELL_SMOKE.zh-CN.md` | 添加内部验收说明。 | 保留桌面壳验收记录。 |
| `docs/DESKTOP_RELEASE_READINESS.zh-CN.md` | 添加内部发行说明。 | 保留发行准备信息。 |
| `docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md` | 添加内部发行说明。 | 保留内部测试版流程。 |
| `docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md` | 添加内部发行工程说明。 | 保留打包自动化计划。 |
| `docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md` | 添加内部发行审计说明。 | 保留打包兼容性审计。 |
| `docs/product/README.zh-CN.md` | 更新。 | 增加文档地图、检查清单、审计清单和修正报告入口。 |
| `docs/product/01-product-positioning.zh-CN.md` | 更新。 | 增加“查看、理解、整理和使用”定位。 |
| `docs/product/02-user-requirements.zh-CN.md` | 更新。 | 增加可用工具、整理需求和开发者来源分组。 |
| `docs/product/03-user-journey-first-run.zh-CN.md` | 更新。 | 增加可用工具和高级来源分组。 |
| `docs/product/04-information-architecture.zh-CN.md` | 更新。 | 增加可用工具、配置来源和高级来源分组。 |
| `docs/product/05-ui-content-terminology.zh-CN.md` | 更新。 | 增加全局来源、项目来源、手动选择的文件夹和使用文案。 |
| `docs/product/06-skill-library-requirements.zh-CN.md` | 更新。 | 明确技能必须说明哪个 AI 工具可用和怎么用。 |
| `docs/product/07-mcp-library-requirements.zh-CN.md` | 更新。 | 明确 MCP 必须说明配置来源、用途、风险和人工处理建议。 |
| `docs/product/08-privacy-safety-requirements.zh-CN.md` | 未改。 | 已符合当前产品方向。 |
| `docs/product/09-product-acceptance-criteria.zh-CN.md` | 更新。 | 增加技能可用工具、使用方式和 MCP 修复建议验收。 |
| `docs/product/10-documentation-map.zh-CN.md` | 新增。 | 建立文档权威性地图。 |
| `docs/product/11-terminology-compliance-checklist.zh-CN.md` | 新增。 | 建立术语检查标准。 |
| `docs/product/12-documentation-audit-inventory.zh-CN.md` | 新增。 | 建立完整 Markdown 审计清单。 |
| `docs/product/13-document-correction-report.zh-CN.md` | 新增。 | 记录本轮逐文档修正。 |
| `test-fixtures/custom-scan-basic/**/*.md` | 未改。 | 分类为测试样例，不是产品文档。 |

## 未删除文件

本轮没有删除任何文档。历史文档仍有工程追溯价值，因此采用重写、标注内部用途或标注被取代的方式处理。

## 当前合规结论

- README 不再把 AIOS Desktop 定义为广义资源控制台。
- `docs/product/` 是权威产品规划来源。
- 目标主导航明确为：首页、技能、MCP、高级。
- 普通用户是一切用户文案的默认对象。
- 高级开发者内容留在“高级”或内部文档。
- 脚本、报告、策略、验证器、旧入口、项目包、原始查找诊断和内部调试信息不再被定义为普通用户主功能。
