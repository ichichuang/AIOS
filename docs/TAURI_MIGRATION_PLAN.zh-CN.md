# AIOS Desktop Tauri 迁移计划

文档类型：开发者内部历史迁移文档。

当前用户-facing 产品定义见 `docs/product/`。本文保留阶段、扫描、存储、旧模块和验收历史，用于工程追溯。旧模块名不是当前主导航；目标主导航是：首页、技能、MCP、高级。

## 迁移原则

AIOS Desktop 迁移采用阶段化主干开发。后续工作直接在 `main` 上推进，但必须通过清晰提交范围隔离产品阶段。

要求：

- 不创建长期迁移分支。
- 不把不相关 UI polish 混入 Tauri 架构提交。
- 不把 shell MVP、Rust scanner、SQLite、扫描 UI、发现扫描模式混在同一提交。
- commit message 使用详细中文，记录目的、变更区域、验证和残余风险。
- 每个阶段完成后保留可运行、可验证、可回滚状态。

## Phase 0：文档与边界

目标：

- 定义 AIOS Desktop 产品定位。
- 定义 Tauri 架构边界。
- 定义扫描、隐私、redaction 和全盘扫描安全策略。
- 定义 staged roadmap 和提交边界。

交付：

- `docs/DESKTOP_PRODUCT_RFC.zh-CN.md`
- `docs/DESKTOP_ARCHITECTURE.zh-CN.md`
- `docs/SCANNER_POLICY.zh-CN.md`
- `docs/TAURI_MIGRATION_PLAN.zh-CN.md`
- README 文档入口。

非目标：

- 不新增 `src-tauri`。
- 不安装 Tauri。
- 不改 frontend UI。
- 不改 server runtime。
- 不运行 MCP、脚本或外部项目命令。

## Phase 1：Tauri shell MVP

状态：

已完成。当前实现范围为最小 Tauri v2 桌面壳，复用现有 Material Console 前端；后续 Phase 已加入扫描引擎和 Rust-owned SQLite 元数据资源库，仍未加入额外危险系统插件。

目标：

- 引入最小 `src-tauri` 桌面壳层。
- 嵌入现有 Material Console UI。
- 保持只读、local-first。
- 提供 app window、基础版本信息、受控 snapshot 读取。

本地命令：

- `pnpm desktop:dev`
- `pnpm desktop:build`

允许：

- Tauri v2 基础配置。
- app name、bundle id、window config。
- 只读 app status command。
- 只读 snapshot command。
- 最小 capabilities。

禁止：

- 全盘扫描。
- Rust 扫描引擎。
- 任意 shell/script execution。
- MCP 执行。
- 全局配置写入。
- 无关 UI polish。

验收：

- Web UI 仍可运行。
- Tauri dev/build 命令可在本地明确验证。
- `git diff --check` 通过。
- 未新增危险 command。

## Phase 2：受控 Rust 扫描引擎

状态：

已拆出 Phase 2A 指定目录扫描 MVP，在 Phase 2B 增加静态扫描模板与新用户引导，并在 Phase 2C 增加 bounded scan job progress、cancel 和恢复状态。当前实现只覆盖用户显式选择单个目录后的 metadata-only 扫描；模板不自动选择目录。Phase 3A 已在此基础上保存终态扫描安全元数据，但不扩大扫描范围。

目标：

- 用 Rust 引入 bounded、只读、metadata-first 扫描能力。
- 覆盖 AIOS Root、AI Toolchain、Project Roots 三类内置 profile。
- 支持 job progress、cancel 和可解释跳过原因。

允许 command：

- `scan_profile_list`
- `scan_start`
- `scan_cancel`
- `scan_status`

禁止：

- 全盘扫描。
- shell/script/MCP 执行。
- 任意 path scan。
- 任意 frontend FS 权限。

验收：

- 扫描 profile 固定且可审计。
- 路径 denylist 生效。
- redaction 测试覆盖 env/auth/session 场景。
- 结果不包含 raw secret。

## Phase 2A：指定目录扫描 MVP

状态：

已实现。

目标：

- 用户在 Tauri 桌面 app 中通过系统目录选择器选择一个目录。
- Rust 侧执行 bounded、metadata-only traversal。
- UI 在现有 Material Console 中展示目录摘要、扫描策略、计数、分类结果、跳过提示和检查器详情。

允许：

- Tauri dialog plugin，仅用于目录选择。
- `pick_scan_directory`、`scan_custom_directory`、`get_scan_policy` 三个显式 command。
- Rust `ignore` crate 遍历用户选择目录。
- 结果保存在当前前端内存中。

禁止：

- 全盘扫描。
- 多根目录批量扫描。
- SQLite、scan history、profile 持久化。
- Tauri filesystem/shell/process/updater/autostart/global-shortcut/notification/SQL plugins。
- 文件内容读取、manifest 解析、脚本执行、MCP 启动或 MCP tool 调用。
- 展示 raw secret、auth、session、token、credential、cookie 或 env value。

验收：

- broad/system root guard 生效。
- strong exclude 生效。
- sensitive-like path segment 被 redacted 并标记。
- Rust path guard 和分类测试通过。
- Web/static snapshot 模块继续工作。

## Phase 2B：扫描模板与首次使用引导

状态：

已实现。

目标：

- 在指定目录扫描 MVP 上增加静态 scan profiles，帮助用户判断该选择哪类文件夹。
- 保持目录选择强制由用户通过系统 picker 完成。
- 在 UI 中说明模板只是分类和边界预设，AIOS 只扫描用户选择的目录。
- 在扫描结果和检查器中展示实际使用的模板。
- 基于现有扫描结果数据展示 profile-based category summary。

允许：

- `get_scan_profiles` 返回静态模板定义。
- `scan_custom_directory` 接受可选 `profileId`，缺省为 `custom-folder`。
- 模板调整 UI 文案、分类重点、结果分组说明、max depth / max entries 上限和 exclude policy summary。

禁止：

- 自动扫描 `~/.codex`、`~/.claude`、`~/.ai`、home root、项目根、系统根或磁盘根。
- 放宽 Phase 2A broad/system/home root guard。
- 引入全盘扫描、SQLite、扫描历史、持久 profile 管理或 diff view。
- 新增 Tauri filesystem/shell/process/updater/autostart/global-shortcut/notification/SQL 插件或扩大 capabilities。
- 读取文件内容、解析 secret value、执行脚本、启动 MCP 或写回全局配置。

验收：

- profile 定义为静态只读数据，`get_scan_profiles` 不访问文件系统。
- 每次扫描仍需要 `selectionId`，profile 选择不会触发扫描。
- Rust 测试覆盖 profile 定义、缺省 profile、未知 profile 拒绝和跨 profile root guard 不变量。
- 前端测试覆盖 profile mapping 和缺省 fallback。
- 文档明确 SQLite、扫描历史和全盘扫描仍为未来工作。

## Phase 2C：扫描进度、取消与恢复状态

状态：

已实现。

目标：

- 将指定目录扫描从单次阻塞响应提升为 bounded job runtime。
- 在 UI 中展示 idle、directory selected、running、cancelling、completed、cancelled、failed 生命周期。
- 支持 Rust-side cancellation flag，遍历循环周期性检查并安全停止。
- 向前端发送低频聚合进度事件，不逐文件发送。
- 展示跳过摘要和恢复文案，失败或取消后可重新运行或重新选择目录。

允许：

- `start_custom_scan_job`：启动当前已授权目录的扫描任务。
- `cancel_scan_job`：请求取消当前任务。
- `get_scan_job_snapshot`：读取当前进程内任务快照。
- `aios://scan-job-progress` 聚合事件：只包含 visited/matched/skipped/elapsed/phase/profile/limit 等安全计数。
- 小型内存 job registry，用于当前运行时恢复和 terminal snapshot 修剪。

保留：

- `scan_custom_directory` 作为同步兼容命令。
- Phase 2B scan profiles 和强制用户目录选择。
- Phase 2A root/home/system/disk root guard。
- metadata-only、不跟随 symlink、强 exclude、redaction 和 no execution 边界。

禁止：

- 全盘扫描、自动扫描全局工具目录、隐藏 full-disk command 或 override。
- SQLite、持久扫描历史、持久 job registry、profile 持久化或 diff view。
- 新增 Tauri filesystem/shell/process/updater/autostart/global-shortcut/notification/SQL 插件或扩大 capabilities。
- 在进度事件、snapshot、错误或日志中暴露绝对路径、文件内容、raw secret、auth/session、provider key、token、cookie 或 env value。

验收：

- Rust 测试覆盖取消标志、聚合进度 payload、scan limit counters、root guard 和 no-content-reading invariant。
- 前端测试覆盖 job lifecycle mapping、progress event merge、terminal status 和 default fallback。
- UI 仅在 running 时显示取消按钮；取消/失败后可恢复。
- 跳过摘要覆盖 exclude、guard、metadata error、limit、cancellation、size/symlink。
- 文档明确 SQLite、扫描历史和全盘扫描仍为未来工作。

## Phase 3：SQLite 本地索引

状态：

Phase 3A 已实现本地资源库基础：Rust 后端拥有 SQLite 数据库、schema migration、终态 scan job persistence、只读查询 commands、资源库摘要 UI 和清空本地库控制。Phase 3B 已在该基础上增加多目录扫描来源管理、项目标签、启用状态、来源删除、顺序批次扫描、批次取消和来源级持久摘要。Phase 3C 已把主要资源模块接入 SQLite 动态资源语料。Phase 4C.2 修正数据来源语义：静态 snapshot 不再作为未扫描时的普通 fallback，只保留为 Legacy 示例/兼容数据。

目标：

- 引入本地 SQLite 索引，保存扫描 job、resources、source provenance、findings、redaction status、policy decisions。
- 保留 JSON snapshot export 兼容性。
- UI 查询通过预定义只读接口完成。
- 用户授权目录的完成、取消和失败终态扫描安全摘要写入 SQLite；当前运行时 job registry 仍只服务交互进度。

Phase 3A/3B/3C 已允许并实现：

- `rusqlite` 后端依赖，不添加 Tauri SQL plugin。
- app local data 目录下的 app-owned SQLite 数据库。
- idempotent schema migrations。
- typed Tauri commands：资源库状态、扫描来源、扫描任务、资源摘要、资源列表、资源 scope、按 scope/kind 查询、资源详情、来源更新/删除、批次扫描/取消/快照和清空本地库。
- 完成、取消、失败终态 job 的安全摘要持久化。
- 资源来源、redacted relative path、分类原因、聚合 skips/errors 和 project scope 元数据。
- 多个用户授权来源的 display name、root display path、profile、project label、enabled 和最近任务引用。
- 批次扫描默认顺序执行；只扫描已选择且已启用的来源。
- Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、Legacy 和 Inspector 动态优先读取 SQLite 语料。
- 移除来源只删除 AIOS SQLite 中该来源相关记录，不删除用户文件。
- 清空命令，但只删除 AIOS app 数据库记录，不删除用户文件。

禁止：

- 任意 SQL from frontend。
- 保存 raw secret。
- 取消 JSON snapshot 兼容。
- 外部数据库依赖。
- Tauri filesystem/shell/process/updater/autostart/global-shortcut/notification/SQL 插件。
- 资源模块触发扫描、任意 path scan、文件内容读取、脚本/MCP 执行或配置写入。
- 默认全盘扫描、后台静默扫描、diff view 或隐藏 broad-root override。Phase 4A 的高级发现只能通过显式确认路径启动。

验收：

- migrations 可重复执行且安全。
- Rust 测试覆盖 schema init、source upsert、resource persistence、cancelled/failed job persistence、clear library 和 no-content-storage invariant。
- 前端测试覆盖 store client fallback、summary mapping 和持久库状态 helpers。
- UI 在扫描管理模块展示保存来源、来源级 profile/project/启用控制、批次进度、最新任务、持久资源计数、分类计数和本地库清空控制。
- UI 在主要资源模块展示动态资源库 / 示例 snapshot 来源标识、scope tabs 和 Inspector provenance。
- redaction status 可追踪。

## Phase 3B：多目录扫描管理中心

状态：

已完成。扫描管理中心仍使用 `custom-scan` route/module，但显示为“扫描管理”。用户可以一次添加多个目录来源，逐来源设置模板、项目 / scope 标签、启用状态，选择要扫描的来源后手动启动顺序批次。

允许：

- `add_scan_sources` 通过现有 dialog capability 添加一个或多个目录。
- `update_scan_source` 修改 display/profile/project/enabled 等安全元数据。
- `remove_scan_source` 删除 AIOS 本地库中该来源相关记录，不删除用户文件。
- `start_scan_sources_batch` 顺序扫描已选择且已启用来源。
- `cancel_scan_batch` 请求取消当前批次；当前来源在遍历检查点停止，后续未开始来源标记为取消。
- `get_scan_batch_snapshot` 返回仅含安全计数和状态的内存批次快照。

禁止：

- 任何 full-disk command、隐藏 override、broad root bypass 或默认扩大扫描范围。
- Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或 capabilities 扩大。
- UI 任意 SQL、任意 path scan、脚本/MCP 执行、文件内容读取、symlink 跟随或 secret/env/auth/session/cookie/raw token 保存。
- 在扫描管理之外新增扫描执行入口。

验收：

- Rust 测试覆盖 source add/update/remove、duplicate handling、disabled exclusion、batch sequencing model、source deletion semantics、summary counts 和 root guard invariants。
- 前端测试覆盖 source list mapping、selection helper、batch state helper、reset fallback 和 Tauri unavailable fallback。
- UI 可见 saved sources、profile/project 控制、enabled/remove、手动扫描所选、批次取消、来源级摘要、全局持久库摘要和清空本地库控制。

## Phase 3C：动态资源语料与项目视角

状态：

已完成。AIOS Desktop 现在把 Rust-owned SQLite 中的扫描结果作为动态资源语料展示，并在 shell 顶部提供全局、项目 / scope、扫描来源和未归类 scope 过滤。未扫描任何目录时，默认产品模块显示空资源库和 0 计数；内置 JSON snapshot 只在 Legacy 示例/兼容入口显式查看。

允许：

- snapshot export 兼容路径。
- bounded SQLite read APIs：scope 列表、语料摘要、按 scope/kind 查询、资源详情和 scope 计数。
- Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators 和 Inspector 使用动态资源适配器；Legacy 模块使用显式 snapshot/demo 适配器。
- Inspector 显示 project/scope、扫描来源、授权 root display path、相对路径、profile、last scan job、classification reason、boundary labels 和 metadata-only 边界。

禁止：

- 默认 full-disk discovery。Phase 4A 已将高级发现限定在扫描管理中心、显式确认和强 exclude 路径内。
- 资源模块启动扫描、执行脚本/MCP、读取文件内容或写回全局配置。
- 前端传入 SQL、读取 raw database path 或发起通用 filesystem 浏览。

后续 Phase 3C.2 / Phase 4：

- 更细粒度分页 UI、资源 diff view 和 profile 持久化。
- 更完整的动态资源详情聚合，但仍必须只使用已持久化 metadata。

## Phase 4C.2：数据来源真值与 Legacy 隔离

状态：

已完成。首次进入时默认数据源为 dynamic-corpus；如果 Rust-owned SQLite 中没有动态资源，产品模块进入 empty 状态并显示 0 计数。Legacy snapshot 只在旧入口作为示例/兼容数据查看，并明确标注“不代表当前电脑扫描结果”。

允许：

- 动态资源库、空资源库、Legacy 示例数据三种前端数据来源状态。
- Legacy 模块读取内置 snapshot 作为 demo/compatibility surface。
- Scan Management 展示已存在的本地 SQLite 资源库摘要和用户触发的清空控制。

禁止：

- 将内置 snapshot 自动写入 SQLite。
- 让 Legacy snapshot 参与导航徽标、顶部命令栏计数、Dashboard 总数、全局 scope、project/source scope 或默认模块列表。
- 修改 scanner scope、确认门控、Tauri capabilities 或前端文件系统权限。

## Phase 4：自定义目录扫描 UI

状态：

Phase 2A 已实现最小指定目录扫描 UI，Phase 2B 已实现静态扫描模板与首次使用引导，Phase 2C 已实现当前运行时内的进度、取消和恢复状态。Phase 3B 已完成多目录扫描管理中心。Phase 4A 已实现显式用户启动的智能全机发现和高级全盘发现 MVP。Phase 4B 增加首次/空库引导、隐私与数据控制、扫描安全说明和删除本地 AIOS 数据路径。后续 Phase 4 仍保留 profile 持久化、扫描历史、diff view、删除授权和更完整 custom folder 管理。

目标：

- 用户可通过系统目录选择器创建 Custom Folder profile。
- UI 展示扫描进度、历史、排除规则、权限状态和错误解释。
- 扫描范围可撤销、可删除、可重新授权。

允许：

- 用户选择目录。
- profile 保存到 app-owned storage。
- 自定义 exclude 规则。
- 扫描历史和 diff view。

禁止：

- 默认扩大扫描范围。
- 静默后台扫描。
- 目录选择后自动全盘递归。
- 绕过 redaction 和 strong excludes。

验收：

- 用户授权路径可见。
- 每个扫描 job 可取消。
- 跳过原因可解释。
- 不读取或展示敏感原始值。

## Phase 4A：智能全机发现与高级发现 MVP

状态：

已实现。扫描管理中心新增三个模式卡片：Custom Directories、Intelligent Whole-Computer Discovery、Advanced Full-Disk Discovery。首次启动仍不扫描任何目录；模式切换不会触发扫描；资源模块不能启动扫描。

允许：

- `add_discovery_scan_sources` 在用户点击开始后创建发现来源。
- `start_scan_sources_batch` 对 advanced 来源要求 `advanced_confirmation_accepted`。
- 智能发现只解析常见用户工作区候选目录，跳过不存在、不可访问和系统边界候选。
- 高级发现必须勾选确认，使用独立高级 guard、强 exclude、bounded limits、metadata-only policy 和同一批次取消运行时。
- 发现来源以 `source_kind` 保存为 `intelligent-discovery` 或 `advanced-full-disk`，并保留 profile、display、enabled、last scan job 和用户确认 summary metadata。
- 发现结果进入同一个 SQLite 动态资源语料，保留 global/project/source/unclassified scope 行为。

禁止：

- 启动时自动扫描、模式切换自动扫描、后台静默扫描。
- 放宽 normal custom-directory broad root guard。
- 在扫描管理之外新增扫描启动按钮。
- 文件内容读取、脚本/MCP 执行、symlink 跟随、secret/env/auth/session/cookie/raw token 展示或保存。
- 新增 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或扩大 capabilities。

验收：

- Rust 测试覆盖 custom broad root 拒绝、高级确认、高级 exclude、智能候选安全、发现跳过摘要、no-content invariant 和动态语料持久化。
- 前端测试覆盖模式映射、高级确认 gating、模式切换不自动扫描、批次进度/取消状态和发现摘要映射。
- UI 可见扫描模式卡片、首次空库 onboarding、扫描限制、确认文案、进度/取消和发现统计。

## Phase 4B：首次引导、隐私控制与扫描安全说明

状态：

已实现。此阶段只改善首次使用理解、隐私状态可见性和错误恢复说明，不扩展 scanner scope。

允许：

- Dashboard 在动态资源语料没有持久资源或没有扫描来源时显示首次使用引导。
- 引导说明 AIOS 尚未扫描这台机器、不会自动扫描、可手动添加项目文件夹、可使用智能全机发现、高级全盘发现更慢且受权限影响并需要确认、扫描为本地 metadata-only。
- 引导按钮只导航到扫描管理，不启动扫描、不创建来源、不解析候选目录。
- `app_settings` 表保存最小 dismissed 状态；清空本地资源库会删除该设置。
- 扫描管理显示隐私与数据控制：本地库状态、来源数、资源数、最近扫描状态/时间、metadata-only/no-content/no-execution 边界。
- 删除 AIOS 本地数据调用既有 `clear_resource_library`，只删除 AIOS app SQLite 记录，不删除用户文件。
- 三个扫描模式卡片说明目标用户、扫描范围、跳过内容和确认要求。
- UI 提示 macOS/桌面受保护目录可能跳过，permission denied 属于预期结果，用户可改为手动添加具体文件夹，AIOS 不会自动修改系统设置。

禁止：

- 新增扫描模式或扫描命令。
- 放宽 Custom Directories、Intelligent Discovery 或 Advanced Full-Disk Discovery 的 Rust 侧范围/确认规则。
- 新增 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或扩大 capabilities。
- 在扫描管理之外新增扫描启动入口。
- 文件内容读取、脚本/MCP 执行、symlink 跟随、secret/env/auth/session/cookie/raw token 展示或保存。

验收：

- Rust 测试覆盖 `app_settings` get/set 和无效 JSON 拒绝。
- 前端测试覆盖 onboarding 可见性、隐私摘要映射、reset warning copy、扫描模式安全卡和模式切换不自动扫描。
- UI smoke 验证空库引导、隐私/数据控制、reset copy、三类安全卡、高级确认门控和无自动扫描。

## Phase 4C：本地 unsigned macOS packaging dry run

状态：

已完成。2026-07-05 已通过本地 unsigned macOS `.app` / `.dmg` dry run。此阶段只准备本机 installable-product 验证所需的 `.app` / `.dmg` metadata、命令和文档，不进入公开分发。

允许：

- `bundle.active = true`，仅启用 macOS `app` 与 `dmg` targets。
- `pnpm desktop:build` 继续构建 release executable，并通过 `--no-bundle` 不生成安装包。
- `pnpm desktop:bundle:mac` 执行 `pnpm tauri build --bundles app,dmg --no-sign`。
- 产品名、稳定 bundle id、版本、分类、图标和本地优先描述写入 Tauri/Cargo/package metadata。
- 产物只用于本机 unsigned dry run。

禁止：

- signing identity、Apple 凭据、公证、stapling、updater pubkey、updater endpoints 或公开发布渠道。
- `tauri-plugin-updater`、updater UI、`createUpdaterArtifacts` 或自动更新流程。
- 新增 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或扩大 capabilities。
- 改变 scanner scope、onboarding、privacy controls、dynamic corpus 或 full-disk confirmation gates。
- 真实扫描 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk。

验收：

- 静态检查、Rust check/test、前端 typecheck/unit/build 和 Tauri CLI/version/build 通过。
- `src-tauri/target/release/aios-desktop` 存在且可执行。
- `src-tauri/target/release/bundle/macos/AIOS Desktop.app` 存在。
- `src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_*.dmg` 存在。
- Bounded local app smoke 验证窗口可启动、扫描管理可见、不会自动扫描、高级全盘仍确认门控、动态模块仍可加载，并且不留下后台进程。

## Phase 4C.3：本机资源库与项目/来源视角产品化修正

状态：

已完成。本阶段是产品 UX 与信息架构修正，不是 scanner 功能扩展。AIOS Desktop 现在把 Dashboard 明确作为 Local Resource Library 入口，展示动态 SQLite 空/非空状态、动态资源数、扫描来源数、项目 scope 数、最近扫描状态/时间和当前查看 scope。每个主资源模块在标题附近展示当前 scope 语义：全局本地库、项目、来源、未归类或 Legacy 示例快照。

允许：

- 新增只读、typed、metadata-only 的 Rust read commands，用于 Project Resource Map 和 Scan Source Directory Map。
- Dashboard 展示项目卡片和来源目录卡片，卡片可切换到既有 scope。
- Scan Management 保持唯一手动扫描入口，并可从来源行切换到来源 scope。
- Resource Inspector 展示数据来源类型、项目/scope、扫描来源目录、相对路径、profile、最近扫描任务/状态和 metadata-only 边界。

禁止：

- 新增扫描模式、扩大 scanner scope、自动扫描或在资源模块启动扫描。
- 将 Legacy snapshot 写入 SQLite，或让 Legacy 参与 global/project/source/unclassified 动态计数。
- 新增 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或扩大 frontend filesystem 权限。

验收：

- 空库首次进入时 Dashboard、Skills、导航和顶部动态计数保持 0，并显示进入扫描管理的清晰路径。
- Project Resource Map 与 Source Directory Map 只使用动态 SQLite metadata，并支持 scope 切换过滤。
- Legacy 示例数据只在 Legacy context 出现，并明确标注不是当前电脑扫描输出。
- Rust read API 测试覆盖项目地图、来源地图和 metadata-only 输出。

## Phase 4C.4：产品 UX 验收门

状态：

已完成。本阶段是产品 UX acceptance gate，不是 scanner 功能扩展。验收重点是首次使用不显示误导性预载机器资源、动态本地资源库可解释、项目 / 来源 scope 过滤清晰、Legacy 示例隔离、扫描安全门控和隐私/reset 文案可见。

允许：

- 补充产品验收报告和小范围 README / release baseline 状态说明。
- 强化 frontend tests，覆盖 empty corpus、two-project / two-source dynamic corpus、Legacy 隔离和 top/nav count consistency。
- 修正动态资源分类中的 Legacy 误归类问题。

禁止：

- 新增扫描模式、扩大 scanner scope、执行真实 root/home/system/full-disk scan 或在扫描管理之外启动扫描。
- 新增 signing、notarization、updater automation 或 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件。
- 修改 global Codex hooks、MCP servers、plugins、skills、credentials、services、launchd items、browser extensions 或 repo 外文件。

验收：

- `docs/PRODUCT_UX_ACCEPTANCE_0.1.0.zh-CN.md` 记录空首次使用、动态项目/来源语料、Legacy 隔离、扫描安全、native/Web smoke 限制和剩余 UX 风险。
- 动态 prompt metadata 不再被归入 Legacy UI group 或 Legacy 导航计数。
- Legacy snapshot 不参与 global/project/source/unclassified 动态计数。

## Packaging / Signing / Updater

状态：

公开分发、签名、公证和 updater 仍是未来工作。Phase 4C 仅覆盖本地 unsigned `.app` / `.dmg` dry run。

未来进入 signed distribution 前必须单独评审：

- macOS/Windows/Linux packaging 配置。
- 代码签名、公证、entitlements、hardened runtime 和证书管理。
- updater 权限、发布源、回滚和完整性校验。
- 是否需要额外 Tauri capability；默认仍不得引入 shell/process/filesystem/SQL 等宽权限。

## Phase 5：高级全盘扫描增强

状态：

Phase 4A 仅实现显式确认的高级发现 MVP。Phase 5 若继续增强，必须单独评审 pause/resume、rate limiting、更细粒度权限和删除索引体验。

前置条件：

- 独立 RFC。
- 隐私和性能风险评审。
- UI 风险说明和二次确认。
- rate limiting、pause/resume/cancel。
- 强 exclude 默认开启。
- metadata-first 默认开启。
- redaction 测试通过。
- 用户可删除索引。

必须禁止：

- 默认启用。
- 首次启动自动提示。
- 静默后台运行。
- 读取 credential/auth/session/env value。
- 执行脚本、MCP、skill。

## 提交示例

```text
docs: 制定 AIOS Desktop Tauri 产品化架构与扫描安全策略

目的：
- 定义 AIOS Desktop 本地优先、默认只读的桌面产品边界。
- 明确 Tauri v2 架构、IPC trust boundary 和扫描隐私策略。

变更区域：
- docs/DESKTOP_PRODUCT_RFC.zh-CN.md
- docs/DESKTOP_ARCHITECTURE.zh-CN.md
- docs/SCANNER_POLICY.zh-CN.md
- docs/TAURI_MIGRATION_PLAN.zh-CN.md
- README.md

验证：
- git diff --check

残余风险：
- 本提交仅为 Phase 0 文档，不包含 Tauri 实现验证。
```
