# AIOS Desktop 实现差距审计

状态：仅审计与规划。本文不实施修复，不修改运行时代码、扫描器、UI、包配置、工作流、生成资产、版本、标签或发布内容。

依据：`docs/product/README.zh-CN.md` 与 `docs/product/*.zh-CN.md` 是本次审计的产品事实来源。当前实现证据来自前端、Tauri/Rust 扫描器、TypeScript 扫描器、资源库、路由配置、README 与测试。

## 1. 执行摘要

当前实现已经具备一组有价值的安全基础：本地优先、元数据读取、Tauri 扫描边界、敏感路径与 secret-like 字段规避、MCP 不启动不连接、SKILL.md 有受限解析能力、技能身份合并与搜索有雏形。但产品形态仍主要是“本机 AI 资源控制台 / 扫描管理器”，而不是新产品文档要求的“面向普通用户的本地 Skill 与 MCP 浏览器”。

最核心的不合规点有五类：

1. 主导航仍公开旧的一等模块：`扫描管理`、`脚本`、`报告`、`项目包`、`策略`、`验证器`、`旧入口`，不符合目标 IA `首页 / 技能 / MCP / 高级`。
2. 首页仍围绕资源库、扫描来源、策略审计、报告时间线组织，而不是围绕“开始查找本机 AI 技能和 MCP 工具”的一键路径。
3. Skills 与 MCP 页面主要消费前端已加载资源数组，缺少后端聚合的产品级计数、状态、来源、可用工具、使用方式、问题说明与修复建议。
4. 扫描器仍是通用资源发现器，`script/report/project-pack/policy/validator/legacy/raw resource` 等内部概念仍进入默认产品模型。
5. 测试未证明 200+ 技能机器上的准确计数、分组、解释与搜索；现有快照有 285 个资源，其中 skill-like 并非产品口径的去重可用技能总数。

因此，下一阶段应先完成 P0 信息架构与产品数据口径收敛，再做 Skills 与 MCP 的领域模型增强。不要先扩写旧模块，否则会继续扩大后续删除面。

## 2. 按产品文档映射的实现合规矩阵

| 产品文档 | 核心要求 | 当前实现证据 | 结论 |
|---|---|---|---|
| `README.zh-CN.md` | `docs/product/` 为 canonical source；AIOS Desktop 是普通用户的本地 AI 能力浏览器 | README 已基本改成新方向；但 `package.json:5` 与 `src-tauri/Cargo.toml:4` 仍描述为 metadata/resource workspace；运行界面仍是资源控制台 | 文档方向合规，产品实现不合规 |
| `01-product-positioning.zh-CN.md` | 默认用户是普通用户；开发者诊断仅在高级 | `frontend/src/components/shell/moduleConfig.ts:14` 默认暴露 10 个模块；`DashboardModule.tsx:352` 展示系统状态与安全审计 | 不合规 |
| `02-user-requirements.zh-CN.md` | 回答“我有多少技能 / MCP、它们有什么用、在哪里、怎么用、哪里需要处理” | Skills 详情主要显示路径、风险、元数据、Token 压力；MCP 详情主要显示 command/env var names/source config；缺少产品级 usage/status/repair 聚合 | 部分基础存在，用户问题未闭环 |
| `03-first-run-and-scan-flow.zh-CN.md` | 首次进入不自动扫描；首页一键“开始查找”；说明会做什么和不会做什么 | `DashboardModule.tsx:258` 空状态是“尚未扫描任何目录”；CTA 跳转 `custom-scan`；`CustomScanModule.tsx` 要用户理解扫描模式与来源 | 不合规 |
| `04-information-architecture.zh-CN.md` | 主导航只保留 首页、技能、MCP、高级 | `moduleConfig.ts:14` 暴露 dashboard/custom-scan/skills/mcp/scripts/reports/project-packs/policies/validators/legacy | 不合规 |
| `05-terminology-and-copy.zh-CN.md` | 避免普通用户看到资源库、扫描管理、验证器、策略、旧入口等技术词 | `zh-CN.ts:51`、`AiosTopCommandBar.tsx:49`、`AiosResourceScopeBar.tsx:31`、`ResourceCorpusIndicator.tsx:12` 仍使用资源、扫描、模块、风险、旧入口等词 | 不合规 |
| `06-skills-library-requirements.zh-CN.md` | 技能库要回答数量、用途、来源、可用工具、使用方式、注意状态；支持普通来源分组与状态过滤 | `SkillsModule.tsx:18` 只有 capability/source 和 quality 过滤；`SkillsModule.tsx:37` 来源组是活跃入口、蒸馏、归档、注册表等技术组；`ResourceInspector.tsx:122` 使用方式依赖 prompts | 部分合规 |
| `07-mcp-library-requirements.zh-CN.md` | MCP 页解释 MCP，显示服务/工具、配置来源、用途、状态、问题和人工修复建议 | `McpModule.tsx:11` 仅分组卡片；`server/src/scanners/mcp-scanner.ts:96` 主要解析 Codex config 的 command/args/env var names；无 tool list/repair guidance | 部分安全合规，产品能力不足 |
| `08-privacy-and-safety.zh-CN.md` | 不上传、不执行、不启动 MCP、不读取/展示 secret 值；默认只读基础元数据 | Tauri 与 TS 扫描器有 no-content/no-execute/redaction/env-name-only 逻辑，如 `scanner.rs:3145`、`mcp-scanner.ts:54` | 基础合规，应保留 |
| `09-acceptance-criteria.zh-CN.md` | 首页计数准确；重复/未知/损坏状态口径清晰；详情可解释使用方式与来源 | 计数来自前端数组和 generic summary，如 `SkillsModule.tsx:190`、`McpModule.tsx:18`、`resource_store.rs:1254`；无产品聚合口径 | 不合规 |
| `10-product-documentation-map.zh-CN.md` | 产品文档与实现应解除旧控制台模型绑定 | 旧模块仍是默认入口，且多处测试固定旧文案 | 不合规 |
| `11-product-correction-checklist.zh-CN.md` | 消除旧 IA、旧术语、旧默认路径 | `resourceCorpus.test.ts` 仍断言“扫描管理”“添加自选目录”“查看智能发现”等旧路径 | 不合规 |
| `12-current-documentation-audit-inventory.zh-CN.md` | 旧文档可作为历史，不可继续驱动产品 | 实现仍体现历史模块：Scripts/Reports/Policies/Validators/Legacy/Project Packs | 不合规 |
| `13-product-docs-correction-report.zh-CN.md` | 文档修正完成后，下一步是实现差距收敛 | 当前阶段正是本报告覆盖的差距清单 | 本报告提供后续实施依据 |

## 3. UI / 导航差距清单

1. 主导航未采用目标 IA。`frontend/src/components/shell/moduleConfig.ts:14` 的 `consoleViews` 仍包含 `custom-scan`、`scripts`、`reports`、`project-packs`、`policies`、`validators`、`legacy`。这与目标 `首页 / 技能 / MCP / 高级` 直接冲突。
2. 导航分组仍是内部控制台结构。`moduleConfig.ts:23` 将入口分成 `总览 / 清单 / 操作 / 治理 / 兼容`，其中 `治理`、`兼容` 对普通用户不应默认可见。
3. `frontend/src/App.tsx:328` 的 `renderModule` 仍把旧模块作为正式路由渲染，包括 `ScriptsModule`、`ReportsModule`、`ProjectPacksModule`、`PoliciesModule`、`LegacyModule`。
4. 首页仍叫 `DashboardModule` 并围绕资源库组织。`DashboardModule.tsx:153` 的摘要是“本机资源库、扫描状态和只读边界”，不是普通用户视角的本机 AI 能力概览。
5. 首页快捷入口仍列出全部旧模块。`DashboardModule.tsx:31` 的 `quickViews` 包括扫描管理、脚本、报告、项目包、策略、验证器、旧入口。
6. 首次进入路径不合规。`DashboardModule.tsx:258` 空态是“尚未扫描任何目录”，按钮导向自选目录/智能发现/高级扫描，而不是一键“开始查找”与确认说明。
7. 顶部命令栏仍把“模块切换”和“资源搜索”作为默认体验。`AiosTopCommandBar.tsx:49` 使用“搜索资源、路径、风险；输入模块名后按 Enter 切换”，不适合普通用户默认页。
8. 默认 Shell 强制展示资源范围栏。`AiosConsoleShell.tsx:71` 渲染 `AiosResourceScopeBar`，其文案使用 `资源范围`、`项目`、`来源`、`未归类`、`全局` 等内部过滤概念。
9. `ResourceCorpusIndicator.tsx:12` 继续展示“本机资源”“旧入口示例”“尚未扫描任何目录”，与新产品语言不一致。
10. 首页的系统审计、策略哈希、Codex 自动化、风险分布、最近报告等模块应移入高级或开发者诊断，不应出现在普通用户默认 Home。

## 4. Skills Library 差距清单

1. 技能计数不是后端聚合的产品口径。`SkillsModule.tsx:58` 从传入 `resources` 构建 identity rows；`SkillsModule.tsx:190` 展示 `visibleRows.length`。如果前端分页、筛选或只加载部分资源，计数会偏离真实本机技能总数。
2. 来源分组不符合普通用户认知。`SkillsModule.tsx:37` 使用 `active-entrypoint`、`distilled`、`archived`、`filesystem`、`registry`、`index`、`project-pack`、`runtime-view`，而产品需要 Codex、Claude、Agents、本地共享、项目里的技能、全局来源、手动选择的文件夹、插件、来源不明。
3. 状态过滤不足。当前只有 `qualityMode` 的 `all / needs-work`，没有 `可用 / 需要处理 / 重复 / 已损坏 / 来源不明` 等产品状态。
4. 可用工具未成为一等字段。`CompactSkillRow.tsx:39` 把 Codex/Agents/Claude 合并为“入口”，但详情中没有稳定展示“可在哪个 AI 工具使用”。
5. 使用方式不稳定。`ResourceInspector.tsx:122` 只有 `resource.prompts` 存在时展示“如何使用”，而产品要求技能详情必须说明如何在对应工具中使用，或说明为何无法判断。
6. 注意状态没有产品化。`skillDisplayEnrichment.ts:219` 有质量等级和原因，但 UI 未将其转成普通用户可理解的 `需要处理`、`重复`、`来源不明`、`无法读取` 等状态。
7. 技能详情默认暴露过多内部信息。`ResourceInspector.tsx:129` 之后显示来源路径、安全风险、元数据质量、Token 压力、动态资源元数据等；这些应默认收敛，必要时放入高级。
8. 技能身份合并已有基础但产品口径未完成。`skillIdentityModel.ts:53` 能按 manifest/canonical/name 合并来源；还需要把重复项从“可用技能数”中排除，并把重复原因暴露为注意状态。
9. 搜索能力已有雏形但未证明大规模可用。`skillIdentityModel.ts:126` 将名称、别名、标签、路径、能力文本纳入搜索；测试未覆盖 200+ 技能机器的性能、排序、分组与准确计数。
10. Skill 页面仍受 generic `AiosResource` 模型约束，缺少独立的 `SkillLibrarySummary`、`SkillDetail`、`SkillStatus`、`SkillUsage`、`SkillSourceGroup` 等产品边界。

## 5. MCP Library 差距清单

1. MCP 页面未先解释 MCP 的普通用户含义。`McpModule.tsx:11` 直接展示分组统计，没有首屏说明“这些是本机 AI 工具可连接的服务和工具”。
2. 服务计数和工具计数没有分离。`McpModule.tsx:18` 使用 `resources.length`，无法回答“有多少 MCP 服务、多少工具”。
3. 工具列表不存在。`server/src/domain/types.ts:81` 的 `McpServerRecord` 只有 command/args/envVarNames/transport/sourcePath/safety，未建模工具名称、用途、来源与状态。
4. 配置来源覆盖不足。`server/src/scanners/mcp-scanner.ts:96` 主要从 `CODEX_CONFIG_PATH` 读取 `mcp_servers`，未覆盖 Claude、项目级配置、手动选择目录或其他常见本机配置来源。
5. 修复建议缺失。当前风险标签可提示 credential/npx/remote 等问题，但没有普通用户可执行的“在哪里修、修什么、不要把密钥贴给 AIOS”的指导。
6. MCP 默认分组不合规。`moduleUtils.ts:89` 按 credential/npx/remote/local/unknown 分组，这更像风险维度；普通用户默认应按状态和来源理解，风险细节放入详情或高级。
7. MCP 详情显示偏技术。`ResourceInspector.tsx:545` 展示 command、args、env var names、transport、source config，但缺少服务用途、工具用途、可用性、问题原因与人工修复路径。
8. MCP 安全边界值得保留。`mcp-scanner.ts:179` 的 safety profile 表示不启动、不连接、不读取 env value；这符合产品安全要求，不应为补工具列表而改成默认启动服务。
9. 若未来要得到 MCP 工具列表，需要设计“安全来源”。可优先从静态配置、已知 server manifest、用户授权的只读说明文件或未来显式确认流程获取，默认不能调用 MCP server。

## 6. 扫描与数据模型差距清单

1. Tauri 扫描器仍是通用资源分类。`src-tauri/src/scanner.rs:2881` 的 `classify_resource` 用文件名和路径启发式识别 `skill`、`mcp-config`、`script`、`report-doc`、`project-pack`、`policy-governance`、`validator` 等，不是 Skill/MCP-aware 的领域发现。
2. 前端扫描类型仍包含旧模块。`frontend/src/lib/customDirectoryScan.ts:5` 的 `ScanResourceKind` 公开 script/report/project-pack/policy/validator/package-manifest/unknown-local-resource 等普通用户不应默认看到的类型。
3. 资源库 summary 是 generic resource summary。`frontend/src/lib/resourceStore.ts:81` 与 `src-tauri/src/resource_store.rs:263` 只提供 resource/source/job/location/countsByKind/skips/errors；缺少产品所需的 skills total/usable/attention/duplicate/unknown/broken 和 MCP service/tool/status 聚合。
4. 前端存在分页/加载上限风险。`frontend/src/lib/resourceCorpus.ts:375` 默认 `limit=300`；Skills/MCP 当前从已加载数组算数，不能作为 200+ 或更大机器的权威计数。
5. `resourceCorpus.ts:548` 的 `kindMapping` 继续把 generic kind 映射进旧 capability types，导致 UI 与数据模型继续服务旧 IA。
6. `src-tauri/src/lib.rs:16` 暴露的 Tauri 命令仍以资源库、扫描源、扫描任务、按 kind 查询为中心，没有产品级 `getSkillLibrarySummary`、`listSkillGroups`、`getMcpLibrarySummary` 等接口。
7. TypeScript skill scanner 有较好基础，但与 Tauri 扫描结果未形成统一产品模型。`server/src/scanners/skill-discovery-scanner.ts:63` 的 SKILL.md 安全解析、`dedupeSkillResources` 与 `skillIdentityModel.ts` 应收敛成同一套技能身份与状态规则。
8. SKILL.md 处理需要更产品化：只读受限 metadata、提取名称/用途/何时使用/来源/可用工具/使用方式；不能把全文内容默认展示或纳入普通 UI。
9. MCP config 处理需要更产品化：只显示配置来源、服务名、工具名、用途、状态和修复建议；继续禁止读取或展示 env 值、token、password、private key。
10. 扫描管理概念应拆分：普通用户只看到“查找本机 AI 能力”的引导、进度和结果；扫描根目录、跳过路径、错误详情、批处理、源表、作业 ID、数据库状态归入高级。

## 7. 术语与用户可见文案差距清单

以下术语仍在默认 UI 或测试中出现，应删除、重命名或移入高级：

- `扫描管理`：普通用户默认应看到“查找”或“查找本机 AI 能力”。
- `资源 / 资源库 / 本机资源 / 动态资源`：默认应改为“技能”和“MCP 工具/服务”。
- `脚本 / 报告 / 项目包 / 策略 / 验证器 / 旧入口`：不应是一等导航。
- `模块 / 模块切换`：普通用户不应理解应用为模块控制台。
- `资源范围 / 项目 / 来源 / 未归类 / 全局`：默认应按“来源”和“状态”解释，技术过滤放高级。
- `registry / runtime view / active entrypoint / distilled / archived / project pack`：默认 UI 应改成 Codex、Claude、Agents、本地共享、项目里的技能、插件等普通来源。
- `Token 压力 / 安全审计 / 策略哈希 / Codex 自动化 / SQLite / scan job / source id`：应归入高级诊断。
- `npx 拉取风险 / 需要凭据` 可保留为详情状态，但默认要配普通解释和人工修复建议。

已发现的直接证据：

- `frontend/src/i18n/zh-CN.ts:51` 定义旧模块名。
- `frontend/src/components/shell/AiosTopCommandBar.tsx:49` 使用“搜索资源、路径、风险”。
- `frontend/src/components/shell/AiosResourceScopeBar.tsx:31` 使用“资源范围过滤”。
- `frontend/src/components/ResourceCorpusIndicator.tsx:12` 使用“本机资源”“旧入口示例”。
- `frontend/src/components/modules/moduleUtils.ts:107` 的空态仍引导用户去“扫描管理”。
- `frontend/src/lib/resourceCorpus.test.ts` 固定旧空态和旧动作文案。

## 8. 测试差距清单

1. 没有 200+ 技能机器的产品验收测试。当前 `frontend/public/aios-inventory.snapshot.json` 有 285 个 resources，其中 `skill=92`、`runtime-view=110`、`project-pack=25`、`mcp-server=7`，但测试没有证明产品口径下的去重技能总数、可用数、重复数、未知数、需要处理数。
2. `frontend/src/lib/skillIdentityModel.test.ts` 主要验证少量命名技能的合并与搜索，未断言完整机器计数、普通来源分组、状态过滤、使用方式、可用工具。
3. `server/src/scanners/skill-discovery-scanner.test.ts` 验证安全解析、registry expansion、dedupe 基础，但没有覆盖 200+ 来源混合、重复来源优先级、损坏 SKILL.md、来源不明、普通来源标签。
4. `frontend/src/lib/resourceCorpus.test.ts` 仍断言旧产品路径，例如“请到扫描管理添加项目目录或运行智能发现”和 `添加自选目录 / 查看智能发现`。
5. `frontend/src/lib/customDirectoryScan.test.ts` 验证 generic resource kind 映射，包括 validator/policy/script/report/project-pack；这与新默认 IA 冲突，需要重写成 Skill/MCP 发现验收。
6. MCP 缺少产品测试：服务计数、工具计数、配置来源、状态、风险、修复建议、secret value 不显示、MCP 不启动不调用。
7. Tauri Rust 测试覆盖路径安全、内容读取边界、持久化和 generic corpus，但没有产品聚合 API 的验收。
8. 缺少 UI 级验收：首页四个统计、一键查找确认、四项主导航、旧模块默认不可见、Skills/MCP 搜索与筛选、Advanced 才显示诊断。
9. 缺少回归测试证明前端计数不依赖当前已加载数组，而依赖后端 aggregate summary。

## 9. 可能受影响的文件与模块

前端信息架构与 Shell：

- `frontend/src/App.tsx`
- `frontend/src/components/shell/moduleConfig.ts`
- `frontend/src/components/shell/AiosNavigationRail.tsx`
- `frontend/src/components/shell/AiosTopCommandBar.tsx`
- `frontend/src/components/shell/AiosResourceScopeBar.tsx`
- `frontend/src/lib/filtering.ts`
- `frontend/src/i18n/zh-CN.ts`

首页与高级入口：

- `frontend/src/components/modules/DashboardModule.tsx`
- `frontend/src/components/modules/CustomScanModule.tsx`
- `frontend/src/components/modules/LegacyModule.tsx`
- `frontend/src/components/modules/ScriptsModule.tsx`
- `frontend/src/components/modules/ReportsModule.tsx`
- `frontend/src/components/modules/ProjectPacksModule.tsx`
- `frontend/src/components/modules/PoliciesModule.tsx`
- `frontend/src/components/modules/moduleUtils.ts`
- `frontend/src/components/ResourceCorpusIndicator.tsx`

Skills：

- `frontend/src/components/modules/SkillsModule.tsx`
- `frontend/src/components/CompactSkillRow.tsx`
- `frontend/src/components/ResourceInspector.tsx`
- `frontend/src/components/ResourceCard.tsx`
- `frontend/src/lib/skillIdentityModel.ts`
- `frontend/src/lib/skillDisplayEnrichment.ts`
- `frontend/src/lib/skillDiscoveryMetadata.ts`

MCP：

- `frontend/src/components/modules/McpModule.tsx`
- `frontend/src/lib/resourceText.ts`
- `server/src/scanners/mcp-scanner.ts`
- `server/src/domain/types.ts`
- `server/src/domain/prompt-templates.ts`

扫描、资源库与桥接：

- `frontend/src/lib/customDirectoryScan.ts`
- `frontend/src/lib/resourceCorpus.ts`
- `frontend/src/lib/resourceStore.ts`
- `src-tauri/src/lib.rs`
- `src-tauri/src/scanner.rs`
- `src-tauri/src/resource_store.rs`
- `server/src/scanners/skill-scanner.ts`
- `server/src/scanners/skill-discovery-scanner.ts`
- `server/src/scanners/baseline-scanner.ts`
- `server/src/scanners/aios-root-scanner.ts`

测试：

- `frontend/src/lib/resourceCorpus.test.ts`
- `frontend/src/lib/customDirectoryScan.test.ts`
- `frontend/src/lib/skillIdentityModel.test.ts`
- `frontend/src/lib/skillDisplayEnrichment.test.ts`
- `server/src/scanners/skill-discovery-scanner.test.ts`
- `server/src/scanners/mcp-scanner.test.ts` 如不存在，应新增对应覆盖
- `src-tauri/src/scanner.rs` tests
- `src-tauri/src/resource_store.rs` tests

## 10. P0 / P1 / P2 / P3 实施路线图

### P0：收敛默认产品壳与权威计数口径

目标：让应用默认看起来就是普通用户的 Skill/MCP 浏览器。

- 将主导航收敛为 `首页 / 技能 / MCP / 高级`。
- 首页替换 Dashboard 文案与 CTA：展示技能总数、MCP 服务数、MCP 工具数、需要处理数、最近查找时间、一键“开始查找”。
- 将旧模块从默认导航和首页入口移走；保留在高级或开发者模式中。
- 引入产品级 summary 接口：Skill summary 与 MCP summary 由后端资源库聚合，不从当前前端数组推断。
- 重写空态和一键查找确认流程，明确“不上传、不修改、不执行、不启动 MCP、不读取密钥值”。
- 建立最小测试：四项导航、首页空态、一键确认、旧模块默认不可见、summary 不依赖前端数组。

### P1：完成 Skills Library 产品模型

目标：技能库能准确回答数量、用途、来源、可用工具、使用方式和注意状态。

- 定义 `SkillLibrarySummary`、`SkillListItem`、`SkillDetail`、`SkillStatus`、`SkillSourceGroup`、`SkillUsage`。
- 统一 Tauri scanner、TS skill-discovery scanner 与前端 identity model 的去重规则。
- 将来源映射为普通用户分组：Codex、Claude、Agents、本地共享、项目里的技能、全局来源、手动选择的文件夹、插件、来源不明。
- 将重复、损坏、来源不明、不可用工具、缺少用途说明转成注意状态。
- 详情页默认展示：名称、原始名称、用途、何时使用、可用 AI 工具、如何使用、来源、状态、问题。
- 高级区保留路径、manifest、registry、runtime view、scan metadata、Token 压力等诊断信息。
- 增加 200+ 技能 fixture 验收：准确计数、分组、搜索、状态、重复排除、损坏计入需要处理。

### P2：完成 MCP Library 产品模型

目标：MCP 页能解释本机 MCP 服务与工具，并给出安全的人工修复指导。

- 定义 `McpLibrarySummary`、`McpServiceItem`、`McpToolItem`、`McpStatus`、`McpRepairHint`。
- 扩展配置来源发现：Codex、Claude、项目配置、手动目录、插件来源；仍只读元数据。
- 从静态配置、已知 manifest 或显式允许的说明文件中提取工具列表；默认不启动 MCP、不调用工具。
- 展示服务数、工具数、配置来源、用途、状态、问题、修复建议。
- 保持 env var names only，不显示 env values、token、password、private key。
- 增加测试：服务/工具计数、配置来源、风险状态、修复建议、secret 不显示、不会启动 MCP。

### P3：清理 Advanced 与旧控制台遗留

目标：保留开发者诊断价值，但不污染普通用户默认体验。

- 将扫描源、扫描任务、作业日志、跳过路径、错误详情、raw resource、策略、验证器、报告、项目包、旧入口统一纳入高级诊断或删除默认入口。
- 清理旧文案测试，保证默认 UI 不再出现旧一等模块。
- 保留必要导出、调试和证据能力，标明“高级/开发者”范围。
- 根据使用面决定是否删除不再需要的旧模块组件，或保留为内部诊断页。

## 11. 各阶段验收标准

P0 验收：

- 主导航只显示 `首页 / 技能 / MCP / 高级`。
- 首页首次进入显示“还没有查找这台电脑上的 AI 技能和 MCP 工具”含义的空态，并提供一键“开始查找”。
- 开始查找前有确认说明，明确不会上传、修改、执行、启动 MCP、读取密钥值。
- 首页统计来自后端 aggregate summary，不依赖 `visibleRows.length`、`resources.length` 或前端当前页数组。
- Scripts、Reports、Policies、Validators、Legacy、Project Packs、raw resources、scanner diagnostics 不在默认导航或首页入口出现。
- 相关单元测试与 UI 测试覆盖上述行为。

P1 验收：

- 技能总数等于后端去重后的可见技能口径。
- 重复技能不计入可用技能数，但计入重复/需要处理状态。
- 损坏或无法读取的技能计入需要处理，不计入可用技能数。
- 来源不明技能可见，但状态明确。
- 每个技能详情能回答用途、何时使用、可用工具、如何使用、来源、状态和问题。
- 200+ 技能 fixture 能通过计数、分组、搜索、状态过滤、详情解释验收。

P2 验收：

- MCP 首页显示服务数和工具数，二者口径清晰。
- 每个 MCP 服务显示配置来源、用途、状态、问题和人工修复建议。
- 每个可静态识别的工具显示工具名、用途、所属服务和状态。
- 不显示 secret/env 值；只显示变量名或“需要在原配置中检查”。
- 默认流程不启动 MCP server、不调用工具、不执行 command。
- 测试覆盖 Codex/Claude/项目配置/手动目录的来源识别与风险状态。

P3 验收：

- 默认 UI 搜索不到旧一等模块文案，除非进入高级诊断。
- 高级页清楚标注诊断属性，不把内部概念伪装成普通功能。
- 旧模块若保留，入口、标题、文案都在高级语境内。
- 删除或隐藏旧模块不会破坏资源库安全扫描、取消扫描、清空 app 记录等基础能力。

## 12. 风险与回滚说明

1. 导航收敛风险：直接删除旧模块入口可能影响开发者排障。建议先移动到高级，并保持路由组件可访问，待新验收通过后再裁剪。
2. 数据口径风险：从 generic resources 切到 Skill/MCP aggregate 可能出现数量变化。需要在报告 UI 中解释“可用 / 需要处理 / 重复 / 来源不明”的口径，避免用户以为数据丢失。
3. 扫描安全风险：为了提取 SKILL.md 和 MCP 信息而扩大读取范围，可能触碰隐私边界。应继续使用 byte cap、字段白名单、secret-like redaction、no symlink、no content dump。
4. MCP 工具列表风险：真实工具列表通常需要启动 server 才能查询。默认产品不能这么做，应优先静态来源；需要动态探测时必须是未来独立的显式授权流程。
5. 测试迁移风险：旧 tests 固定旧文案，会在 IA 改动后失败。这是预期产品变更，不应通过兼容旧文案解决。
6. 回滚策略：每阶段保持旧 generic scanner/store 只读能力；P0/P1/P2 以新增 product summary/model 叠加为主，避免破坏底层存储；旧模块先移动到高级再评估删除。

## 13. 应保留的代码区域

- Tauri 扫描边界：`src-tauri/src/scanner.rs` 中的 root/broad/system guard、跳过规则、secret-like segment redaction、no symlink、no content read、no execution 标记。
- 资源库 app-owned record 清理逻辑：`src-tauri/src/resource_store.rs` 中只删除 AIOS 数据库记录、不删除用户文件的能力。
- MCP 安全扫描基础：`server/src/scanners/mcp-scanner.ts` 中 redacted args、env var names only、不启动、不连接、不读取 env value 的约束。
- SKILL.md 安全解析基础：`server/src/scanners/skill-discovery-scanner.ts` 中 byte cap、YAML-lite whitelist、secret-like string redaction、bounded discovery。
- 技能身份合并基础：`frontend/src/lib/skillIdentityModel.ts` 的 identity key、source merge、search corpus 构建。
- 技能展示增强基础：`frontend/src/lib/skillDisplayEnrichment.ts` 的中文用途、场景、质量原因推断，可改造成产品状态说明。
- 大列表性能基础：`frontend/src/components/modules/SkillsModule.tsx` 使用 `react-window`，适合保留并接入产品模型。
- 本地优先与只读产品文案：`README.md` 与 `docs/product/` 已修正的产品方向。
- 现有 scanner/store 安全测试：应扩展，不应删除安全边界断言。

## 14. 应删除、隐藏、重命名或移入高级的模块与 UI 概念

应从默认主导航删除或隐藏：

- `custom-scan` / `扫描管理`
- `scripts` / `脚本`
- `reports` / `报告`
- `project-packs` / `项目包`
- `policies` / `策略`
- `validators` / `验证器`
- `legacy` / `旧入口`

应重命名：

- `Dashboard` / `总览` 改为 `首页`
- `扫描` 在普通路径中改为 `查找`
- `资源库` 在普通路径中改为 `本机 AI 技能和 MCP 工具`
- `MCP server` 默认文案改为 `MCP 服务`，首次出现解释其含义

应移入高级：

- 扫描源、扫描任务、批处理、作业 ID、跳过路径、错误详情
- raw resource 列表、resource scope bar、resource corpus indicator
- 策略哈希、治理状态、验证器、报告生成、旧入口示例
- registry、runtime view、active entrypoint、distilled、archived、project pack 等技术来源
- Token 压力、manifest/raw metadata、SQLite/corpus/source id/location id
- MCP command/args/transport 的完整技术展示；普通详情只显示必要来源与风险说明

应逐步删除或合并：

- 只为旧 IA 服务的 Dashboard 快捷入口与“全部类别入口”
- 以 generic resource kind 为核心的普通用户卡片、筛选和文案
- 与产品四页 IA 冲突的默认 module search/switch 行为

最终目标不是丢失诊断能力，而是把默认体验变成普通用户能理解的本机 Skill/MCP 浏览器，把内部扫描器与资源库概念收进高级诊断边界。
