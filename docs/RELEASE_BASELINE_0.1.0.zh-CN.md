# AIOS Desktop 0.1.0 本地发行基线

## 基线摘要

本文件记录 AIOS Desktop Phase 4C.1 同步门的本地发行基线。当前产品状态是本机 unsigned AIOS Desktop 0.1.0：Tauri v2 桌面壳承载现有 React/Vite 前端，扫描只能由用户在扫描管理中显式启动，扫描结果以 metadata-only 形式写入 Rust-owned SQLite 本地资源库，主资源模块以 dynamic-corpus 为产品数据源；未扫描时默认显示空资源库和 0 计数，repo-local snapshot 只作为 Legacy 示例/兼容数据显式查看。

Phase 4C.2 修正说明：AIOS Desktop 不再把内置 snapshot 作为空动态语料的普通 fallback。Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、Inspector、导航计数、顶部计数、全局 scope 和 project/source scope 均只使用 Rust-owned SQLite 动态资源库。Legacy snapshot 必须明确标注为“示例 / Legacy snapshot / 不代表当前电脑扫描结果”，且不自动写入 SQLite、不参与默认统计。

本阶段是同步和发行基线文档步骤，不改变 scanner 行为、不扩大扫描范围、不新增 Tauri 插件、不配置签名、公证、stapling、updater 或公开发布。

## 应用元数据

| 项目 | 当前值 |
| --- | --- |
| Product name | `AIOS Desktop` |
| Rust binary | `aios-desktop` |
| App version | `0.1.0` |
| Bundle identifier | `com.ichichuang.aios.desktop` |
| Bundle targets | `app`, `dmg` |
| Tauri capabilities | `core:default`, `dialog:allow-open` |

版本号在根 `package.json`、`frontend/package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中保持 `0.1.0`。

## 已完成产品阶段

- Phase 2A：指定目录 metadata-only 扫描 MVP。
- Phase 2A.1：指定目录扫描原生验收。
- Phase 2B：扫描模板与首次使用引导。
- Phase 2C：扫描进度、取消与当前运行时恢复状态。
- Phase 3A：Rust-owned SQLite 本地资源库。
- Phase 3B：多目录扫描管理中心。
- Phase 3C：动态资源语料、项目 scope 与来源 scope。
- Phase 4A：智能全机发现与高级全盘发现 MVP。
- Phase 4A.1：发现扫描安全验收。
- Phase 4B：首次引导、隐私与数据控制。
- Phase 4C：本地 unsigned `.app` / `.dmg` packaging readiness。

## 当前能力

- Custom Directories：用户通过系统目录选择器添加一个或多个目录来源，再手动扫描所选启用来源。
- Scan profiles：普通自选目录模板用于分类重点和安全说明，不自动选择、探测或扫描任何目录。
- Progress and cancellation：扫描批次有当前运行时进度、终态快照和取消路径。
- SQLite local resource store：扫描来源、任务摘要、资源元数据、scope 和 app setting 写入 Rust-owned SQLite。
- Multi-directory scan management：可管理多个来源、启用状态、项目标签、来源删除、顺序批次扫描和本地库清空。
- Dynamic resource corpus and project/source scopes：Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators 和 Inspector 读取动态语料，支持 global/project/source/unclassified scope；Legacy snapshot 与动态语料隔离。
- Intelligent discovery：用户点击开始后，从安全的常见工作区候选创建来源；默认不扫描系统根、home 根、`/Users`、`/Volumes` 或磁盘根。
- Advanced discovery：高级全盘发现必须显式确认，前端和 Rust command path 都保留确认门控。
- Onboarding, privacy controls, reset behavior：首次/空库引导说明尚未扫描；隐私与数据控制展示本地库状态、metadata-only 边界和清空说明；reset 只删除 AIOS 数据库记录。
- Local unsigned app and DMG bundle：本地 release executable、unsigned `.app` 和 unsigned `.dmg` 已作为 Phase 4C 产物路径验证目标。

## 当前安全边界

- First launch scans nothing：首次启动不扫描任何目录。
- User must explicitly start scans：扫描只能由用户在扫描管理中显式启动。
- Metadata-only scanning：扫描只保存路径、大小、修改时间、分类、来源、profile、scope 和聚合统计等安全元数据。
- No file content reads：不读取、hash、展示或持久化文件内容。
- No script execution：不执行 shell、脚本、package scripts、验证器或用户文件。
- No MCP startup：不启动、连接或执行 MCP server。
- No raw secret/env/auth/session/provider token storage：不保存 raw secrets、env values、auth/session values、provider keys、cookies 或 token values。
- Reset deletes only AIOS database records, not user files：清空本地库只删除 AIOS app SQLite 中的 scan sources、scan jobs、resources、locations、findings、skips、errors、project scopes 和 app settings 记录，不删除、移动或修改用户文件。

## 当前分发状态

- 仅本地 unsigned build。
- 未配置 Developer ID signing。
- 未配置 notarization。
- 未配置 stapling。
- 未配置 updater、updater key、updater endpoint 或 release upload。
- `pnpm desktop:bundle:mac` 使用 `pnpm tauri build --bundles app,dmg --no-sign`。

## Phase 4C 已验证产物路径

```text
src-tauri/target/release/aios-desktop
src-tauri/target/release/bundle/macos/AIOS Desktop.app
src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_aarch64.dmg
```

## 已知剩余风险

- 既有 Vite large chunk warning 仍存在；该 warning 不代表 build 或 bundle 失败。
- macOS Accessibility 权限会限制部分 native UI 自动化点击能力。
- 本同步门不执行真实 root、home root、system root、`/Users`、`/Volumes` 或 full-disk validation scan。
- Signing、notarization、stapling、updater 和公开分发流程仍是 future work。

## 本同步门验证命令

本次 sync gate 已重新运行以下命令；退出码均为 0。`cargo fmt --check` 未运行，因为本阶段只新增/更新本文档，未修改 Rust 文件。

```bash
git diff --check
cd src-tauri && cargo check
cd src-tauri && cargo test
pnpm --filter @aios-control/frontend typecheck
pnpm --filter @aios-control/frontend test:unit
pnpm --filter @aios-control/frontend build
pnpm tauri --version
pnpm desktop:build
pnpm desktop:bundle:mac
```

补充检查：

```bash
git diff --name-only -- '*.rs'
```

该命令无输出，确认本阶段无 Rust 文件变更。

验证摘要：

- `cargo test`：39 个 Rust unit tests 通过；`src/main.rs` 和 doc-tests 无测试目标。
- `pnpm --filter @aios-control/frontend test:unit`：frontend unit tests 通过。
- `pnpm --filter @aios-control/frontend build`、`pnpm desktop:build` 和 `pnpm desktop:bundle:mac` 通过；仍出现既有 Vite large chunk warning。
- `pnpm tauri --version` 输出 `tauri-cli 2.11.4`。
- `pnpm desktop:bundle:mac` 明确输出 `--no-sign flag detected` 和 `Skipping signing due to --no-sign flag`，未执行 signing/notarization/updater。

Bounded app smoke 结果：

- 使用 `open -n 'src-tauri/target/release/bundle/macos/AIOS Desktop.app'` 启动 unsigned 本地 app bundle；进程路径为 `src-tauri/target/release/bundle/macos/AIOS Desktop.app/Contents/MacOS/aios-desktop`。
- 本环境无法通过 `screencapture` 生成显示截图，返回 `could not create image from display`；因此 native smoke 仅用于启动和进程清理确认。
- 使用 production preview `pnpm --filter @aios-control/frontend preview -- --port 4173` 和 Playwright wrapper 做补充 UI smoke。
- 初始页面 title 为 `AIOS Desktop`，显示“无自动扫描”“尚未扫描任何目录”和 scan management count `0`。
- 扫描管理可打开，显示 `0 项可见`、无扫描来源、无持久资源、`添加目录` / `扫描所选` 禁用、metadata-only/no-content/no-execution 文案可见。
- Advanced Full-Disk Discovery 模式显示显式 checkbox；未勾选时 `开始发现` 禁用，发现统计保持 0。
- Skills 模块可加载，空动态语料时保持 0 计数；Legacy 示例数据不参与默认技能库展示。
- 隐私与数据控制显示“仅保存元数据”“不保存文件内容”“不执行脚本或 MCP”“清空只删除 AIOS 应用记录，不会删除用户文件”。
- Playwright snapshots 未出现文件内容、raw secrets、env/auth/session/provider token values。
- 验证结束后 `pgrep -fl aios-desktop` 无输出，端口 `4173` 无监听，Playwright browser PID 已退出。
- 未运行真实 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk 扫描。

## 推送门状态

- 初始同步门：`main`，working tree clean，`git fetch origin main` 后 `main...origin/main [ahead 10]`，未发现 behind 或 divergence。
- 推送条件：验证通过后，如本文件产生变更，先用显式路径提交一个本地文档 commit；随后再次确认本地 `main` 仅 ahead `origin/main` 且无 divergence，再执行 `git push origin main`。
- 推送限制：不 force push，不创建 tag，不创建 PR，不修改签名、公证、updater、凭据、provider、auth/session 或任何 repo 外文件。
- 推送后核验：推送完成后运行 `git status -sb`、`git log --oneline --decorate -5` 和 `git ls-remote --heads origin main`；最终 local HEAD、remote main SHA、match 结果和 pushed commit count 记录在本任务最终报告中。
