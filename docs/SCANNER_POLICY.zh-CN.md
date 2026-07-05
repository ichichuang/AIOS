# AIOS Desktop 扫描与隐私策略

## 定位

AIOS Desktop 扫描器用于发现和解释本地 AI 能力资源。它默认只读、metadata-first、可取消、可限速、可解释。

扫描器不是默认全盘扫描器，不执行脚本，不连接 MCP，不修改全局配置，不同步 skill 入口。首次启动时 AIOS 不扫描任何目录；所有扫描都必须由用户在“扫描管理”中显式选择模式并点击开始。

## 扫描模板 / profiles

Phase 2B 已实现静态扫描模板。模板是用户选择目录前的说明和分类预设，不是自动扫描根目录。

所有模板都遵守同一条硬边界：

- 用户必须通过 Tauri 系统目录选择器显式选择一个目录。
- 模板选择不会自动选择、探测或扫描 `~/.codex`、`~/.claude`、`~/.ai`、home root、项目根、系统根或磁盘根。
- 模板不会绕过 broad/system/home root guard。
- 模板不会启用全盘扫描、文件内容读取、脚本执行、MCP 启动或扩大扫描范围；Phase 3A-3C 的 SQLite 资源库和动态资源视图只保存、读取和展示用户授权扫描产生的安全元数据。
- 模板只影响 UI 说明、分类重点、结果分组说明和有界 max depth / max entries 上限。

当前模板：

| ID | 显示名 | 推荐场景 | 分类重点 | 上限 |
| --- | --- | --- | --- | --- |
| `custom-folder` | 通用自选目录 | 不确定目录类型时先选择一个小而明确的工作文件夹 | 通用资源识别、敏感路径隐藏、未知资源保守归类 | 6 层 / 2,000 项 |
| `project-root` | 项目根目录 | 用户手动选择一个代码仓库或产品项目根目录 | manifest、repo-local skills/prompts、脚本、验证器、docs/reports | 6 层 / 2,000 项 |
| `ai-toolchain` | AI 工具链目录 | 用户手动选择小范围工具链工作目录、插件元数据目录或 prompts/skills 子目录 | MCP/config 元数据、技能入口、提示词入口、策略边界 | 5 层 / 1,500 项 |
| `skills-prompts-workspace` | 技能 / 提示词工作区 | 用户手动选择 skills、prompts 或二者混合目录 | 技能、提示词、验证器、策略说明 | 6 层 / 1,500 项 |
| `docs-reports-workspace` | 文档 / 报告工作区 | 用户手动选择 docs、reports 或交付物目录 | 报告与文档、策略治理、项目资源包 | 5 层 / 1,500 项 |
| `aios-workspace` | AIOS 工作区 | 用户手动选择 AIOS 相关工作区或本仓库内局部目录 | AIOS skills/prompts、报告、脚本、策略治理、验证器 | 6 层 / 2,000 项 |
| `intelligent-discovery` | 智能全机发现 | 用户点击开始后解析常见用户工作区候选目录 | 项目工作区、AI 资源入口、文档报告、脚本与验证器 | 5 层 / 每来源 1,500 项 |
| `advanced-full-disk` | 高级全盘发现 | 用户显式勾选确认后运行高级 broad discovery path | 保守资源发现、权限跳过统计、敏感路径隐藏 | 5 层 / 每来源 3,000 项 |

`get_scan_profiles` 只返回这些静态定义，不检查文件系统。`scan_custom_directory` 接受可选 `profileId`；缺省值保持 `custom-folder` 以兼容 Phase 2A 调用。

## Phase 4A 发现扫描模式

Phase 4A 在既有扫描管理中心上新增三个扫描模式卡片：

- `Custom Directories`：既有多目录流程。用户通过系统目录选择器添加一个或多个目录，再手动扫描所选来源。普通 custom scan 的 root/home/system/disk/broad path guard 不放宽。
- `Intelligent Whole-Computer Discovery`：面向非技术用户的引导式发现。只有用户点击开始后，Rust 后端才解析常见候选目录，例如 Desktop、Documents、Downloads、Developer、Work、Projects、Code、Workspace 和 AIOS 工作区候选。不存在、不可访问或命中系统边界的候选会跳过；不会默认扫描系统根、home 根、`/Users`、`/Volumes` 或磁盘根。
- `Advanced Full-Disk Discovery`：高风险高级模式。开始按钮必须等用户勾选确认文案后才可用；后端同样要求 `advanced_confirmation_accepted`。该模式使用独立高级 guard，可接受 broad discovery 来源，但仍 metadata-only、强 exclude、有上限、可取消，并预期跳过受保护目录。

高级确认文案：

```text
I understand this scan may take time, may skip protected folders, and stores metadata-only results locally.
```

所有发现模式共同边界：

- 不自动运行，不在启动时扫描。
- 只在扫描管理模块中启动；Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、Legacy 和 Inspector 只读取 SQLite 动态资源语料，不能启动扫描。
- 不读取文件内容，不执行脚本，不启动 MCP，不连接服务，不写全局配置，不跟随符号链接。
- 进度事件只包含聚合计数，不包含绝对路径、文件内容、raw secret、auth/session、provider key、token、cookie 或 env value。
- 扫描来源以 `source_kind` 区分：`custom-directory`、`intelligent-discovery`、`advanced-full-disk`。来源保留 display name、root display path、profile id、enabled、last scan job 和用户确认后的 summary metadata。
- 结果写入同一个 Rust-owned SQLite 资源库，并进入全局、project/source/unclassified scope；不会覆盖手动添加的项目来源。
- 清空本地资源库只删除 AIOS app SQLite 记录，不删除用户文件。

### Custom Folder / Profile Templates

Phase 2A / 2B 状态：

- 已实现最小 MVP：用户通过 Tauri 系统目录选择器选择一个目录。
- 已实现静态扫描模板：用户先选择模板，再选择目录，再手动运行扫描。
- Phase 2C 增加 bounded scan job state、低频进度事件、取消命令、任务快照和恢复状态。
- Rust 侧只执行 metadata-only traversal，不读取文件内容。
- 完成、取消或失败的扫描任务会写入 Rust-owned SQLite 本地资源库，只保存安全元数据、聚合计数、redacted 路径和错误/跳过摘要。
- Phase 3B 在此基础上支持保存多个用户授权扫描来源；用户必须手动选择要扫描的已启用来源，批次默认顺序执行，不并行扩大 IO。

范围：

- 用户通过系统目录选择器显式选择的目录。

目标：

- 建立用户授权目录下的临时本地 AI 资源视图。
- 提供跳过原因、风险汇总和资源分类结果。

限制：

- 每个 custom root 都必须记录授权来源和 policy decision。
- 默认继承强 exclude、metadata-first 和 redaction 规则。
- Phase 2C job registry 只保留少量内存任务快照，用于当前运行时恢复；Phase 3A 另行保存终态任务和资源元数据，不替代当前运行时 job registry。
- diff view 和全盘扫描仍是未来阶段；Phase 3C 已把主要资源模块接入 SQLite 动态资源库读模型。

## Phase 2C 扫描任务运行时

Phase 2C 的扫描任务模型只服务当前桌面进程内的交互反馈，不是持久 job history。

新增命令：

- `start_custom_scan_job`：基于已选择的 `selectionId` 和可选 `profileId` 启动一个 bounded scan job。
- `cancel_scan_job`：设置该 job 的 Rust-side cancellation flag。
- `get_scan_job_snapshot`：读取当前内存 job snapshot。

兼容命令：

- `scan_custom_directory` 保留，用于 Phase 2A/2B 同步式调用兼容。

任务状态：

- `queued`
- `running`
- `cancelling`
- `completed`
- `cancelled`
- `failed`

进度事件：

- 事件名：`aios://scan-job-progress`。
- 只发送低频聚合 payload，不逐文件发送。
- payload 只包含安全计数与状态：`jobId`、`status`、`visitedEntries`、`matchedResources`、`skippedEntries`、`elapsedMs`、`currentPhase`、`profileId`、`maxDepth`、`maxEntries`、`truncated`、`cancellationRequested` 和安全错误摘要。
- 进度事件不包含绝对路径、文件内容、raw secret、auth/session、provider key、token、cookie 或 env value。

取消语义：

- `cancel_scan_job` 只设置取消标志，不杀进程、不中断系统 API。
- Rust 遍历循环会在检查点观察取消标志并停止。
- 取消后 UI 可重新运行当前目录，也可重新选择目录。
- 已取消任务会写入安全终态摘要，用于用户理解本地库状态；不会保存文件内容、绝对资源路径或敏感值。

内存边界：

- 同一时间只允许一个 active scan job。
- registry 只保留少量 terminal snapshots，旧 terminal job 会被修剪。
- terminal snapshot 只用于当前界面恢复；跨进程持久化由 Phase 3A SQLite 资源库保存安全摘要和资源元数据。

跳过摘要：

- `excluded_directory`：强 exclude 和 ignore 命中。
- `protected_system_path`：根目录、系统目录或高级发现保护目录跳过。
- `permission_denied`：无法读取元数据或遍历权限失败。
- `metadata_error`：非权限类元数据错误。
- `entry_limit`：达到 profile max entries 后停止。
- `cancelled`：用户取消后在遍历检查点停止。
- `metadata_policy_skip`：大小阈值和符号链接等 metadata policy 跳过。

## 高级全盘发现策略

高级全盘发现已作为 Phase 4A MVP 的显式高级模式接入，但不是默认能力，也不会自动运行。必须满足：

- 明确授权：用户看到风险说明后单独确认。
- 可取消：扫描 job 可随时取消，取消后不继续后台遍历。
- metadata-first：默认只读路径、大小、mtime、扩展名和文件名分类信号。
- 隐私门控：敏感目录、敏感扩展和敏感字段默认拒绝。
- 强 exclude：默认排除系统目录、缓存、浏览器 profile、凭据目录、`node_modules`、`dist`、`build`、日志、临时目录、大二进制文件、SSH/GPG/Kube、Keychains、Cookies 等。
- 失败可解释：权限失败、跳过、拒绝读取必须汇总给用户。

## Phase 3A 本地资源库

Phase 3A 增加 Rust-owned SQLite 本地资源库基础，用于让用户授权目录和完成后的扫描结果在 app 重启后仍可查询。数据库由 Rust 后端创建在 Tauri app local data 目录中；测试可使用临时数据库路径。

允许保存：

- 用户通过系统目录选择器授权并参与扫描的 root path。
- root display path、profile id、source kind、scan job 状态、开始/结束时间、聚合计数、取消状态和安全 summary JSON。
- resource stable key、名称、类别、entry type、扩展名、大小、mtime、分类原因、风险等级、boundary labels。
- resource location 的 source/job 关联、redacted relative path、display path 和 `sensitive_path_redacted` 标记。
- 聚合 skip reason、error kind、message 和 redacted sample path。

禁止保存：

- 文件内容。
- secret、token、password、credential、auth/session/cookie/provider key 或 env value。
- 未经用户授权的扫描根。
- 前端传入的任意 SQL。

清空行为：

- “清空本地资源库”只删除 AIOS app SQLite 中的 scan sources、scan jobs、resources、locations、findings、skips、errors、project scopes 和 app settings 记录。
- 清空不会删除用户文件，不会修改全局 Codex/Claude/Agents/MCP 配置，不会执行脚本。
- schema migration 记录可保留，以便数据库继续可用。

Phase 3A 非目标：

- Phase 3A 本身不把 Skills、MCP、Scripts、Reports、Policies、Validators、Legacy 等静态 snapshot 模块迁移到动态 SQLite 查询；该迁移在 Phase 3C 通过只读语料 read model 执行。
- 不引入 Tauri SQL、filesystem、shell、process、updater、autostart、global-shortcut 或 notification 插件。
- 不实现全盘扫描、后台静默扫描、profile 持久管理或 diff view。

## Phase 3B 多目录扫描管理

Phase 3B 将目录扫描界面扩展为扫描管理中心。用户可以通过同一个 Tauri 系统目录选择器添加一个或多个扫描来源，为每个来源设置扫描模板、项目 / scope 标签和启用状态，然后手动启动批次扫描。

允许：

- 多个用户明确授权的 `scan_sources` 保存到 Rust-owned SQLite。
- 每个来源保存 display name、root display path、profile id、source kind、enabled、project label、创建/更新时间和最近任务引用。
- 批次扫描仅扫描用户勾选且已启用的来源。
- 批次默认顺序执行，避免并行扩大资源占用。
- 批次可取消；当前来源在遍历检查点停止，尚未开始的来源标记为取消。
- 来源列表展示资源数、跳过数、错误数、最近状态、模板和项目标签。

来源删除语义：

- “移除来源”只删除 AIOS app SQLite 中该来源对应的 scan source、scan job、resource location、finding、skip、error 和不再被引用的 resource 记录。
- 移除来源不会删除、移动、修改用户文件，也不会写入全局 Codex/Claude/Agents/MCP 配置。
- 若用户之后重新添加同一目录，需要再次通过系统目录选择器授权。

重置语义：

- “清空本地资源库”仍只清空 AIOS app SQLite 中的本地库记录，不删除用户文件。
- 清空后 schema migration 记录可保留，数据库继续可用。

Phase 3B 仍禁止：

- 全盘扫描、home/root/system/disk root 扫描、隐藏 override 或 broad-root bypass。
- UI 传入任意 SQL 或任意路径。
- Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或 capabilities 扩大。
- 文件内容读取、脚本执行、MCP 启动、配置写入、symlink 跟随或 secret/env/auth/session/cookie/raw token 保存。
- 在扫描管理之外新增扫描执行入口，或让资源模块直接触发扫描。

## Phase 3C 动态资源语料

Phase 3C 将 Phase 3A/3B 写入的 SQLite 本地资源库作为主要产品数据源。Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、Legacy 和资源检查器优先读取动态资源语料；当本地库为空时，继续显示内置 JSON snapshot 作为示例 / Legacy fallback。

允许：

- Rust 后端暴露固定的 typed read commands，例如资源 scope、语料摘要、按 scope/kind 分页资源列表、资源详情和 scope 计数。
- UI 显示全局、project/scope、scan source 和未归类 scope tabs。
- 资源卡片和检查器展示 project/scope、扫描来源、授权 root display path、相对路径、profile、last scan job、resource kind、risk/boundary labels、classification reason 和 metadata-only 边界。
- 资源详情只由 SQLite 中已持久化的 metadata 重建，不重新读取文件系统。
- 动态资源被移除、来源被删除或本地库被清空后，模块回退到空动态视图或示例 snapshot，不保留断裂选择。

仍禁止：

- 任意 SQL from frontend、raw database path 暴露或通用文件浏览。
- 在资源模块中新增扫描动作；扫描仍只在“扫描管理”中由用户手动启动。
- full-disk scan、隐藏 broad-root override、后台静默扫描或自动探测全局工具目录。
- 文件内容读取、脚本执行、MCP 启动、配置写入、symlink 跟随或 secret/env/auth/session/cookie/raw token 展示。
- 将动态资源写回全局 Codex/Claude/Agents/MCP 配置或技能入口。

## 内容读取等级

| 等级 | 行为 | 示例 |
| --- | --- | --- |
| L0 | 路径 metadata | path、basename、extension、size、mtime |
| L1 | 小 manifest 字段 | `SKILL.md` frontmatter、`package.json` scripts 名称 |
| L2 | 安全文本摘要 | docs、reports 的标题、时间、摘要 |
| L3 | 用户手动打开 | 明确点击查看的文件片段 |
| L4 | 禁止读取 | auth、session、token、cookie、private key、env value |

默认扫描只使用 L0-L2。L3 必须由用户显式触发。L4 永远不展示原始值。

## 隐私与 redaction

永不展示或保存原始值：

- `OPENAI_API_KEY`、API key、token、password、secret、credential。
- auth/session/cookie 数据。
- private key、SSH key、证书私钥。
- `.env` value、shell profile 中的 secret value。
- 浏览器 profile、聊天数据库、系统钥匙串内容。

允许保存的安全 metadata：

- env var 名称。
- MCP server 名称。
- command basename。
- redacted args。
- 文件路径、大小、mtime、hash。
- manifest 中的非敏感字段。
- redaction 状态和原因。

Redaction 输出必须显示：

- 字段被隐藏。
- 隐藏原因。
- 所属 policy。
- 是否影响资源风险等级。

不得显示：

- secret 前缀或后缀。
- token 长度推断信息。
- 原始 env value。
- auth/session 文件内容。

## 路径与遍历策略

默认策略：

- `follow_links = false`。
- profile-specific `max_depth` / `max_entries`，但不得超过当前 MVP 的安全边界。
- 小文件 metadata parser 限制大小。
- project profile 尊重 ignore 文件。
- explicit AIOS roots 可以读取隐藏目录 metadata。
- custom/profile template 只扫用户授权 root。
- Phase 2A custom profile 默认只使用 L0 路径 metadata，不解析 manifest 字段。

Phase 2A custom profile 边界：

- `max_depth = 6`。
- `max_entries = 2000`。
- `max_file_size_bytes = 10 MiB`，仅用于元数据大小阈值判断。
- 尊重 `.ignore`、`.gitignore` 和标准 ignore 规则。
- 不跟随 symlink。
- 不读取文件内容，不执行脚本，不启动 MCP，不连接远程服务。
- Phase 2C 进度事件和 job snapshot 同样不读取或暴露文件内容。
- 拒绝 `/`、用户 home root、`/Users`、`/Volumes`、`/System`、`/Library`、`/Applications`、`/private`、`/tmp`、Windows drive root 等整机或系统边界目录。

默认跳过：

- `node_modules`
- `dist`
- `build`
- `.next`
- `.turbo`
- `.cache`
- `coverage`
- `logs`
- `tmp`
- 大二进制文件
- 浏览器 profile
- 聊天数据库
- 照片库
- credential、auth、session、keychain 相关路径

Phase 2A custom profile 额外强 exclude：

- `.git`
- `.next`
- `.nuxt`
- `.turbo`
- `.venv`
- `venv`
- `__pycache__`
- package manager cache paths such as `.pnpm-store`、`.pnpm`、`.yarn`、`.npm`
- Rust/tool cache paths such as `.cargo`、`.rustup`

若路径或文件名包含 `secret`、`token`、`credential`、`auth`、`session`、`cookie`、`.env`、private key 等敏感特征，Phase 2A 只返回 redacted path segment，并标记 `sensitive-path-redacted`。

## 扫描结果安全模型

每个结果必须包含 provenance：

- 来源 profile。
- 来源 path。
- manifest path。
- active entrypoint。
- parser 版本。
- redaction status。
- policy decision。

每个跳过或拒绝必须可解释：

- `allowed`
- `skipped_by_exclude`
- `skipped_by_size`
- `skipped_by_policy`
- `denied_sensitive_path`
- `denied_permission`
- `cancelled`

## 禁止行为

- UI 直接读取任意路径。
- UI 执行 shell、脚本、MCP、skill。
- 扫描时运行 package scripts。
- 扫描时连接远程服务。
- 自动修改全局 skill/MCP/Codex/Claude/Agents 配置。
- 将扫描结果自动同步到全局入口。
- 输出 raw secret、auth、session、env value。
