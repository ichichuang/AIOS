# AIOS Desktop Tauri 架构

## 目标

AIOS Desktop 将现有 AIOS Control Center 产品化为本地桌面应用。目标是把 Material Console UI 固化为桌面控制台，并逐步引入受控 Rust 本地能力层。

本文件是 Phase 0 架构文档，不创建 `src-tauri`，不实现 Tauri，不改变当前 Web 运行时行为。

## 为什么选择 Tauri v2

Tauri v2 适合 AIOS Desktop 的原因：

- 前端可继续使用现有 React、MUI、Vite 和 Material Console UI，不需要重写为原生 UI。
- 桌面壳层由系统 WebView 渲染，Rust 侧负责受控本机能力，符合“UI 展示”和“本地能力边界”分离。
- 前端通过 IPC 调用 Rust command，适合把扫描、索引、权限判断和文件读取收敛到受控后端。
- Tauri v2 的 permission、scope、capability 模型可把窗口能调用的命令和路径范围显式声明。
- 后续可按阶段引入 window、tray、single-instance、SQLite、updater 等桌面能力，而不是一次性重构产品。

参考：

- <https://v2.tauri.app/concept/architecture/>
- <https://v2.tauri.app/security/permissions/>
- <https://v2.tauri.app/plugin/file-system/>
- <https://v2.tauri.app/plugin/sql/>
- <https://v2.tauri.app/plugin/shell/>

## 目标架构

```text
AIOS Desktop
├─ frontend/
│  ├─ React + MUI + Vite + GSAP
│  ├─ Material Console UI baseline
│  └─ 只负责展示、筛选、发起受控请求
│
├─ src-tauri/                       # Phase 1 之后才引入
│  ├─ Rust desktop shell
│  ├─ commands/
│  │  ├─ app_status
│  │  ├─ inventory_read
│  │  ├─ scan_profile_list
│  │  ├─ scan_start
│  │  ├─ scan_cancel
│  │  └─ snapshot_export
│  ├─ scanner/
│  │  ├─ profiles
│  │  ├─ walker
│  │  ├─ parser
│  │  ├─ redaction
│  │  └─ policy
│  ├─ storage/
│  │  ├─ sqlite
│  │  └─ snapshot_export
│  └─ safety/
│     ├─ scopes
│     ├─ denylist
│     └─ permission_decisions
│
└─ server/
   └─ 当前 TypeScript 只读 inventory engine，迁移期保留
```

## 信任边界

### Frontend

Frontend 是非特权 UI 层。它可以：

- 展示 snapshot、SQLite 查询结果和扫描进度。
- 发送结构化扫描请求。
- 渲染 redacted metadata。
- 触发取消、暂停、导出等明确用户动作。

Frontend 不可以：

- 直接读取任意文件系统路径。
- 拼接 shell 命令。
- 执行脚本、MCP server、MCP tool。
- 展示 raw secret、auth、session、env value。
- 修改全局 AIOS、Codex、Claude、Agents 或 MCP 配置。

### Rust 后端

Rust 后端是受控本地能力层。它负责：

- 校验 scan profile、root path、denylist 和权限策略。
- 执行 bounded traversal。
- 执行 metadata-first parser。
- 做 secret redaction 和 policy decision。
- 写入未来 SQLite 索引。
- 导出兼容 JSON snapshot。
- 通过事件向 UI 发布进度和可解释错误。

Rust 后端仍默认只读。任何未来写入能力都必须有独立 RFC、dry-run、diff、明确授权和验证。

### IPC

IPC 是唯一允许 frontend 访问本机能力的通道。IPC 合约必须：

- 使用固定 command 名称和 typed payload。
- 拒绝自由路径和自由命令字符串。
- 对每个 command 做 profile、scope、rate limit、redaction 校验。
- 返回安全 metadata，不返回原始敏感文本。
- 记录 policy decision，便于 UI 展示为什么允许、拒绝或跳过。

## 严格 Tauri command 权限模型

AIOS Desktop 不给前端开放宽泛 FS 权限。命令按能力拆分：

| command | 默认阶段 | 权限策略 |
| --- | --- | --- |
| `app_status` | Phase 1 | 只返回版本、平台、构建信息 |
| `inventory_read_snapshot` | Phase 1 | 只读 repo-local snapshot |
| `scan_profile_list` | Phase 2 | 返回内置 profile，不扫描 |
| `scan_start` | Phase 2 | 只接受 profile id 和受控参数 |
| `scan_cancel` | Phase 2 | 只能取消当前 app 创建的 job |
| `scan_progress` event | Phase 2 | 只发送计数、状态、redacted path |
| `sqlite_query_resources` | Phase 3 | 只读预定义查询，不接受任意 SQL |
| `snapshot_export` | Phase 3 | 导出 redacted JSON snapshot |
| `custom_folder_request` | Phase 4 | 用户选择目录后生成 scoped profile |

禁止命令：

- 任意 `shell_execute`。
- 任意 `script_run`。
- 任意 `mcp_start`、`mcp_call`、`mcp_install`。
- 任意 `global_skill_sync`。
- 任意接受原始 shell 字符串、SQL 字符串或无限制路径的 command。

## Shell 与脚本策略

Tauri shell plugin 可生成子进程，因此 AIOS Desktop 默认不启用任意 shell/script 执行能力。

规则：

- 扫描能力优先由 Rust 实现。
- UI 不允许执行任意 shell、Node、Python、Bash、MCP 或 skill。
- 如果未来需要运行验证器，只能作为单独的显式验证动作设计。
- 每个验证动作必须有固定白名单、参数 schema、dry-run 展示、取消能力和结果 redaction。
- 禁止 frontend 拼接命令字符串。

## 未来 SQLite 索引模型

SQLite 是未来桌面索引的默认本地数据库。它只保存 redacted metadata 和 policy decision，不保存 secret value。

高层 schema：

```text
scan_jobs
- id
- profile_id
- profile_label
- root_paths_json
- status
- started_at
- finished_at
- cancellation_requested
- scanned_files
- skipped_files
- error_count
- policy_summary_json

resources
- id
- kind
- name
- display_name
- description
- primary_path
- status
- risk
- hash
- first_seen_at
- updated_at
- redaction_status

resource_sources
- id
- resource_id
- source_kind
- path
- manifest_path
- registry_path
- active_entrypoint
- provenance_hash

findings
- id
- resource_id
- job_id
- finding_type
- severity
- message
- safe_metadata_json
- created_at

redaction_events
- id
- job_id
- resource_id
- path
- redaction_type
- field_name
- action
- reason
- created_at

policy_decisions
- id
- job_id
- path
- decision
- policy
- reason
- created_at
```

JSON snapshot export must remain compatible with `frontend/public/aios-inventory.snapshot.json` or a documented successor format. SQLite 是运行期索引，snapshot 是兼容、导出和测试产物。

## 架构提交边界

所有 AIOS Desktop 工作在 `main` 上用清晰分阶段提交推进。Tauri 架构、权限模型、Rust scan engine、SQLite schema 和扫描 UI 必须按阶段拆分提交。

不允许把 Tauri 架构工作和无关 Material Console UI polish 混入同一提交范围。
