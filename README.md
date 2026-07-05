# AIOS Control Center

Local-only AIOS Desktop MVP for understanding local AIOS resources without expanding global Codex or Agents context.

## Scope

- Read-only TypeScript inventory scanner under `server/`.
- React + TypeScript + Vite dashboard under `frontend/`.
- Generated snapshot at `frontend/public/aios-inventory.snapshot.json`.
- Tauri v2 desktop shell under `src-tauri/`.
- Controlled custom directory scan MVP: choose a static scan profile template, then one user-selected directory, Rust-side metadata-only traversal, in-memory job progress/cancel state, in-memory results.
- No Electron, no MCP execution, no global skill writes, no SQLite history, and no full-disk scanning.

## Commands

```bash
pnpm install
pnpm inventory:generate
pnpm typecheck
pnpm build
pnpm --filter @aios-control/frontend dev
pnpm desktop:dev
pnpm desktop:build
```

## Safety model

`/Users/cc/.ai` is the canonical AIOS data source and is treated as read-only. This repository, `/Users/cc/.ai/AIOS`, is the only writable path for the app source.

The static inventory scanner reads safe metadata from AIOS paths, Codex/Agents/Claude skill entrypoints, recent reports, local scripts, bounded project-pack roots, and Codex MCP configuration. It never executes MCP servers and stores only MCP env var names, not values.

AIOS Desktop also provides a Phase 2A/2B/2C custom directory scan surface. The desktop app asks the user to choose a scan profile template, then choose one directory through the system picker. Rust scans only metadata with bounded depth, bounded entry count, strong excludes, no symlink following, no file-content reads, no script/MCP execution, and no persistent index. Scan jobs expose aggregate progress and cancellation for the current runtime only. Profiles are guidance templates only; they do not auto-scan global tool directories, home, system, disk roots, or project roots.

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

当前桌面壳承载现有 Material Console 前端，并包含指定目录只读扫描 MVP、静态扫描模板、当前运行时内的进度与取消能力。SQLite、扫描历史、文件系统插件、Shell 插件、MCP 执行和全盘扫描仍未启用。
