# AIOS Control Center

Local-only AIOS Desktop MVP for understanding local AIOS resources without expanding global Codex or Agents context.

## Scope

- Read-only TypeScript inventory scanner under `server/`.
- React + TypeScript + Vite dashboard under `frontend/`.
- Generated snapshot at `frontend/public/aios-inventory.snapshot.json`.
- Tauri v2 desktop shell under `src-tauri/`.
- Controlled scan management center: save user-approved directories as scan sources, choose Custom Directories, Intelligent Whole-Computer Discovery, or Advanced Full-Disk Discovery, run manual sequential metadata-only batches, cancel active batches, and persist safe scan metadata in Rust-owned SQLite.
- Dynamic resource corpus: Dashboard, Skills, MCP, Scripts, Reports, Project Packs, Policies, Validators, and Inspector use scanned SQLite metadata only. When the dynamic corpus is empty, product modules show 0 resources and first-run guidance.
- Legacy snapshot isolation: the generated snapshot is explicit demo/compatibility data available only from the Legacy surface; it is not current-machine scan output and does not contribute to normal counts.
- First-run and empty-corpus guidance: AIOS explains that nothing has been scanned yet, scanning never starts automatically, and local data controls can delete only AIOS app records without deleting user files.
- No Electron, no MCP execution, no global skill writes, no Tauri SQL/filesystem/shell plugins, no startup scan, and no ungated full-disk scanning.

## Commands

```bash
pnpm install
pnpm inventory:generate
pnpm typecheck
pnpm build
pnpm --filter @aios-control/frontend dev
pnpm desktop:dev
pnpm desktop:build
pnpm desktop:bundle:mac
```

## Safety model

`/Users/cc/.ai` is the canonical AIOS data source and is treated as read-only. This repository, `/Users/cc/.ai/AIOS`, is the only writable path for the app source.

The static inventory scanner reads safe metadata from AIOS paths, Codex/Agents/Claude skill entrypoints, recent reports, local scripts, bounded project-pack roots, and Codex MCP configuration. It never executes MCP servers and stores only MCP env var names, not values.

AIOS Desktop also provides a scan management surface built on the Phase 2 scanner and Phase 3 SQLite resource store. On first launch it scans nothing. The user must pick a mode, read the warning, configure scope, and click start:

- Custom Directories: add one or more folders through the system picker, assign profiles/project labels, then manually scan selected enabled sources.
- Intelligent Whole-Computer Discovery: after the user clicks start, AIOS creates sources from safe common workspace candidates such as Desktop, Documents, Downloads, Developer, Work, Projects, and AIOS workspace candidates. It does not scan system roots by default.
- Advanced Full-Disk Discovery: high-risk mode, disabled until the user checks the explicit confirmation. It may skip protected folders and stores metadata-only results locally.

Rust scans only metadata with bounded depth, bounded entry count, strong excludes, no symlink following, no file-content reads, and no script/MCP execution. Completed, cancelled, and failed scan jobs write safe metadata summaries to a Rust-owned SQLite database in the app data directory. The main resource modules read that dynamic corpus first, with global/project/source scope filters; normal custom-directory profiles are guidance templates only and do not auto-scan global tool directories, home, system, disk roots, or project roots.

The Dashboard shows first-run guidance when the local corpus has no persisted resources or scan sources. Scan Management shows Privacy & Data Controls with database status, scan source count, resource count, last scan status/time, what AIOS stores, what it never stores, and a reset action that deletes only AIOS local records.

See:

- `docs/ARCHITECTURE.zh-CN.md`
- `docs/SAFETY.zh-CN.md`
- `docs/ROADMAP.zh-CN.md`

## Desktop / Tauri

AIOS Desktop 的产品化方向记录在以下 Phase 0 文档中。当前仓库已进入 Phase 1：仅添加最小 Tauri v2 桌面壳，继续复用现有 Material Console 前端。

- `docs/DESKTOP_PRODUCT_RFC.zh-CN.md`
- `docs/DESKTOP_ARCHITECTURE.zh-CN.md`
- `docs/SCANNER_POLICY.zh-CN.md`
- `docs/TAURI_MIGRATION_PLAN.zh-CN.md`
- `docs/DESKTOP_CUSTOM_SCAN_SMOKE.zh-CN.md`
- `docs/DESKTOP_RELEASE_READINESS.zh-CN.md`

当前桌面壳承载现有 Material Console 前端，并包含多目录扫描管理、静态扫描模板、智能全机发现、高级全盘发现显式确认门控、首次/空库引导、隐私与本地数据控制、当前运行时内的批次进度与取消能力、Rust-owned SQLite 本地资源库，以及动态资源语料优先展示。未扫描任何目录时，Skills/MCP/Scripts/Reports/Policies/Validators 等默认模块保持空资源库和 0 计数；内置 snapshot 只在 Legacy 示例/兼容入口查看，不代表当前电脑扫描结果。Tauri SQL、文件系统、Shell 插件、MCP 执行、启动自动扫描和未确认全盘扫描仍未启用。

`pnpm desktop:build` 构建 release executable，不生成安装包；`pnpm desktop:bundle:mac` 执行本地 unsigned macOS `.app` / `.dmg` dry run。当前未配置签名、公证、updater 或公开分发渠道。
