# AIOS Control Center

Local-only Phase 1 MVP for understanding the local AIOS surface without expanding global Codex or Agents context.

## Scope

- Read-only TypeScript inventory scanner under `server/`.
- React + TypeScript + Vite dashboard under `frontend/`.
- Generated snapshot at `frontend/public/aios-inventory.snapshot.json`.
- No Tauri, no Electron, no MCP execution, no global skill writes in Phase 1.

## Commands

```bash
pnpm install
pnpm inventory:generate
pnpm typecheck
pnpm build
pnpm --filter @aios-control/frontend dev
```

## Safety model

`/Users/cc/.ai` is the canonical AIOS data source and is treated as read-only. This repository, `/Users/cc/.ai/AIOS`, is the only writable path for the app source.

The scanner reads safe metadata from AIOS paths, Codex/Agents/Claude skill entrypoints, recent reports, local scripts, bounded project-pack roots, and Codex MCP configuration. It never executes MCP servers and stores only MCP env var names, not values.

See:

- `docs/ARCHITECTURE.zh-CN.md`
- `docs/SAFETY.zh-CN.md`
- `docs/ROADMAP.zh-CN.md`

## Desktop / Tauri Phase 0

AIOS Desktop 的产品化方向记录在以下 Phase 0 文档中。它们只定义架构、扫描安全策略和迁移计划，不表示当前仓库已经引入 Tauri 运行时：

- `docs/DESKTOP_PRODUCT_RFC.zh-CN.md`
- `docs/DESKTOP_ARCHITECTURE.zh-CN.md`
- `docs/SCANNER_POLICY.zh-CN.md`
- `docs/TAURI_MIGRATION_PLAN.zh-CN.md`
