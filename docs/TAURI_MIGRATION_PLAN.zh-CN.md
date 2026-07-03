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

已开始。当前实现范围仅限最小 Tauri v2 桌面壳，复用现有 Material Console 前端，不包含扫描引擎、SQLite 或额外系统插件。

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

已拆出 Phase 2A 指定目录扫描 MVP。当前实现只覆盖用户显式选择单个目录后的 metadata-only 扫描，不包含内置 profile、后台 job、取消、扫描历史或持久索引。

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

## Phase 3：SQLite 本地索引

目标：

- 引入本地 SQLite 索引，保存扫描 job、resources、source provenance、findings、redaction status、policy decisions。
- 保留 JSON snapshot export 兼容性。
- UI 查询通过预定义只读接口完成。
- Phase 2A 指定目录扫描结果不写入 SQLite，也不保留扫描历史。

允许：

- schema migrations。
- 只读资源查询 command。
- snapshot export command。
- 索引清理和重建命令，但必须局限 app-owned 数据。

禁止：

- 任意 SQL from frontend。
- 保存 raw secret。
- 取消 JSON snapshot 兼容。
- 外部数据库依赖。

验收：

- migrations 可重复执行且安全。
- snapshot export 与现有 UI 数据契约兼容或有明确迁移文档。
- redaction status 可追踪。

## Phase 4：自定义目录扫描 UI

状态：

Phase 2A 已实现最小指定目录扫描 UI。Phase 4 保留为 profile 持久化、扫描历史、diff view、删除授权和更完整 custom folder 管理。

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
