# AIOS Desktop 产品 RFC

## 状态

Phase 0 文档草案。本文只定义 AIOS Desktop / Tauri 产品化方向，不代表已经引入 Tauri、Rust 后端或桌面运行时。

## 产品定位

AIOS Desktop 是本地优先、默认只读的本地 AI 能力与资源控制中心。它用于解释、索引和展示本机 AIOS 相关资源，包括技能、MCP 配置元数据、脚本入口、报告、项目包和策略状态。

AIOS Desktop 不是默认全盘扫描器，不是自动修复器，不是 MCP 执行器，也不是全局 skill 同步器。

## 核心原则

- 默认本地运行，不依赖远程服务完成核心资源查看。
- 默认只读；任何未来写入能力都必须单独设计、单独授权、单独验证。
- 扫描必须可解释、可取消、可限速，并能说明跳过原因。
- 不默认全盘扫描；MVP 不包含全盘扫描。
- 不从 UI 执行任意 shell、脚本、MCP server 或 MCP tool。
- 不读取、保存或展示 auth、session、token、credential、private key、cookie、env 原始值。
- 不把扫描到的技能、脚本或 MCP 自动同步到全局入口。
- JSON snapshot 导出兼容性必须保留，便于现有 Web/UI 阶段继续验证。

## 当前 UI 基线

当前 Material Console UI 是 AIOS Desktop 的 UI 基线。桌面产品化应复用现有 React、MUI、Vite、GSAP 约束和 Material Console 信息架构。

Tauri 架构、Rust 扫描引擎、权限模型和本地索引属于桌面产品化提交范围，不应与无关 UI polish、视觉重排或交互重构混入同一提交范围。必要 UI 变更必须与对应桌面阶段直接相关，并在提交说明中明确理由。

## 开发与提交策略

后续 AIOS Desktop 工作直接在 `main` 上推进，不创建长期产品分支。每个阶段使用清晰、可回滚的本地提交表达边界。

提交要求：

- 每次提交只覆盖一个明确阶段或一个明确子范围。
- commit message 使用详细中文，说明目的、变更区域、验证方式和残余风险。
- 不使用 `git add .`；仅暂存明确路径。
- 不把 Phase 1 Tauri shell、Phase 2 Rust scanner、Phase 3 SQLite、Phase 4 自定义扫描 UI、Phase 5 高级全盘扫描混在同一提交里。
- 不把桌面架构提交与无关 Material Console UI polish 混在一起。

## MVP 边界

Phase 1 Tauri shell MVP 只做桌面壳层和只读状态承载：

- 保留 Material Console UI。
- 嵌入现有前端构建产物。
- 读取现有 snapshot 或等价只读本地数据。
- 提供窗口、应用元信息、基础本地状态页。
- 不实现全盘扫描。
- 不执行 shell、脚本、MCP。
- 不修改全局 AIOS、Codex、Claude、Agents、MCP 或 credential 配置。

## 产品阶段

| 阶段 | 目标 | 明确非目标 |
| --- | --- | --- |
| Phase 0 | 架构、安全、迁移和产品 RFC 文档 | 不改运行时 |
| Phase 1 | Tauri shell MVP | 不实现扫描引擎 |
| Phase 2 | 受控 Rust 扫描引擎 | 不做全盘扫描 |
| Phase 3 | SQLite 本地索引与 snapshot 导出兼容 | 不取消 JSON 导出 |
| Phase 4 | 自定义目录扫描 UI | 不默认扩大扫描范围 |
| Phase 5 | 高级全盘扫描 | 未获明确批准前不启用 |

## 相关文档

- `docs/DESKTOP_ARCHITECTURE.zh-CN.md`
- `docs/SCANNER_POLICY.zh-CN.md`
- `docs/TAURI_MIGRATION_PLAN.zh-CN.md`
- `docs/ARCHITECTURE.zh-CN.md`
- `docs/SAFETY.zh-CN.md`
- `docs/DESIGN_SYSTEM.zh-CN.md`
