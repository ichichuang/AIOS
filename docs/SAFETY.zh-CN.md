# 安全边界

文档类型：开发者内部安全文档。

当前用户-facing 产品定义见 `docs/product/`。本文记录工程边界和禁止事项，不定义普通用户主功能。

## 只读数据源

`/Users/cc/.ai` 是 canonical AIOS root。Phase 1 只读取安全元数据，唯一写入路径是 `/Users/cc/.ai/AIOS`。

## 明确禁止

- 不修改 `/Users/cc/.ai/config/active-global-skills-policy.json`。
- 不修改 `/Users/cc/.ai/skills`、`skill-modules`、`views`、`state`、`scripts`、`reports`。
- 不修改 `/Users/cc/.codex/skills`、`/Users/cc/.agents/skills`、`/Users/cc/.claude/skills`。
- 不创建、恢复、调度或启用 Codex automations。
- 不读取或输出 auth、token、cookie、credential、private key、session、env 原始值。
- 不执行 MCP server 或 MCP tool。
- 不对外部项目仓库执行 build/test/lint 或写入。

## MCP 元数据策略

`server` 解析 `/Users/cc/.codex/config.toml` 时只保留：

- MCP 名称。
- command 名称。
- redacted args。
- env var names。
- `npx` / `@latest` 漂移标记。
- local/remote 风险标记。

不会保存 env 值。

## 已知 WARN

如果 `validate-skills.mjs` 仅因已删除 Codex automation TOML scan targets 缺失而退出 1，应归类为已知 WARN，不在本项目中 remediation。
