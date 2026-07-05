# AIOS Desktop Tauri 迁移计划

## 迁移原则

AIOS Desktop 迁移采用阶段化主干开发。后续工作直接在 `main` 上推进，但必须通过清晰提交范围隔离产品阶段。

要求：

- 不创建长期迁移分支。
- 不把不相关 UI polish 混入 Tauri 架构提交。
- 不把 shell MVP、Rust scanner、SQLite、扫描 UI、全盘扫描混在同一提交。
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

Phase 3A 已实现本地资源库基础：Rust 后端拥有 SQLite 数据库、v1 schema migration、终态 scan job persistence、只读查询 commands、资源库摘要 UI 和清空本地库控制。静态 snapshot 模块动态迁移仍未开始。

目标：

- 引入本地 SQLite 索引，保存扫描 job、resources、source provenance、findings、redaction status、policy decisions。
- 保留 JSON snapshot export 兼容性。
- UI 查询通过预定义只读接口完成。
- Phase 2A 指定目录扫描结果不写入 SQLite，也不保留扫描历史。

Phase 3A 已允许并实现：

- `rusqlite` 后端依赖，不添加 Tauri SQL plugin。
- app local data 目录下的 app-owned SQLite 数据库。
- idempotent v1 schema migrations。
- typed Tauri commands：资源库状态、扫描来源、扫描任务、资源摘要、资源列表和清空本地库。
- 完成、取消、失败终态 job 的安全摘要持久化。
- 资源来源、redacted relative path、分类原因、聚合 skips/errors 和 project scope 元数据。
- 清空命令，但只删除 AIOS app 数据库记录，不删除用户文件。

禁止：

- 任意 SQL from frontend。
- 保存 raw secret。
- 取消 JSON snapshot 兼容。
- 外部数据库依赖。
- Tauri filesystem/shell/process/updater/autostart/global-shortcut/notification/SQL 插件。
- 将 Skills/MCP/Scripts/Reports/Policies/Validators/Legacy 静态模块迁移到 SQLite。
- 全盘扫描、后台静默扫描、profile 持久管理或 diff view。

验收：

- migrations 可重复执行且安全。
- Rust 测试覆盖 schema init、source upsert、resource persistence、cancelled/failed job persistence、clear library 和 no-content-storage invariant。
- 前端测试覆盖 store client fallback、summary mapping 和持久库状态 helpers。
- UI 在目录扫描模块展示保存来源、最新任务、持久资源计数、分类计数和本地库清空控制。
- redaction status 可追踪。

后续 Phase 3B/3C：

- snapshot export 兼容路径。
- 更完整的查询分页和资源详情。
- 逐步把静态模块接入动态 SQLite 查询，但必须保持同等安全边界。

## Phase 4：自定义目录扫描 UI

状态：

Phase 2A 已实现最小指定目录扫描 UI，Phase 2B 已实现静态扫描模板与首次使用引导，Phase 2C 已实现当前运行时内的进度、取消和恢复状态。Phase 4 保留为 profile 持久化、扫描历史、diff view、删除授权和更完整 custom folder 管理。

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

## Phase 5：高级全盘扫描

状态：

未获明确批准前不得实现。

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
