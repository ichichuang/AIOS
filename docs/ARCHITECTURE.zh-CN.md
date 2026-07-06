# AIOS Control Center 架构

文档类型：开发者内部历史文档。

当前用户-facing 产品定义见 `docs/product/`。本文中的旧模块名、资源分类和工程术语只用于解释早期实现，不代表 AIOS Desktop 的主导航或普通用户功能。目标主导航是：首页、技能、MCP、高级。

## Phase 1 定位

Phase 1 是本地-only、默认只读的库存与解释工具。它不是 AIOS baseline remediation 工具，也不是 skill 同步器。

## 数据流

1. `server` 读取 `/Users/cc/.ai`、Codex/Agents/Claude 安全元数据和 bounded project-local pack 入口。
2. `server` 生成 `frontend/public/aios-inventory.snapshot.json`。
3. `frontend` 只从本地静态 snapshot 读取数据并渲染 UI。

## 分层

- `server/src/domain`：类型、路径边界、安全策略、资源分类、token 压力估算、prompt 模板。
- `server/src/scanners`：只读扫描器。
- `server/src/utils`：受限文件读取和哈希工具。
- `frontend/src`：React/Vite UI、筛选、资源详情和 prompt 复制。

## Phase 1 非目标

- 不实现 Tauri。
- 不启动 MCP server。
- 不写入 Codex/Claude/Agents/MCP 配置。
- 不启用、禁用、同步或恢复任何 global skill entrypoint。
- 不恢复旧 68/69 global baseline。

## Phase 2 方向

Tauri 2 可以作为桌面壳与受限文件系统桥接层。治理逻辑仍应留在 TypeScript domain/scanner 层；Rust/Tauri 层只暴露 allowlist read commands，并在任何写入能力出现前提供 dry-run、diff 和明确授权。
