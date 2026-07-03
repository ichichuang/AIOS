# AIOS Desktop 扫描与隐私策略

## 定位

AIOS Desktop 扫描器用于发现和解释本地 AI 能力资源。它默认只读、metadata-first、可取消、可限速、可解释。

扫描器不是默认全盘扫描器，不执行脚本，不连接 MCP，不修改全局配置，不同步 skill 入口。

## 扫描 profile

### AIOS Root

默认推荐 profile。

范围：

- `/Users/cc/.ai`
- 当前仓库 `/Users/cc/.ai/AIOS`

目标：

- AIOS shared skills。
- reports。
- scripts metadata。
- generated views metadata。
- policy 和 governance metadata。

限制：

- 不修改 `/Users/cc/.ai`。
- 不读取 credential、auth、session、env 原始值。
- 不执行任何 `.mjs`、`.sh`、validator 或 automation。

### AI Toolchain

范围示例：

- `/Users/cc/.codex`
- `/Users/cc/.claude`
- `/Users/cc/.agents`
- `/Users/cc/.serena`
- 受限 `.config` AI 工具配置路径

目标：

- skill entrypoint metadata。
- MCP 配置中的 server 名称、command 名称、env var 名称。
- 本地工具链漂移提示。

限制：

- 不打印、保存或展示 auth/session/token/env value。
- 不修改 Codex、Claude、Agents、MCP 配置。
- 不启动 MCP server。

### Project Roots

范围：

- 用户明确配置的项目根目录。
- repo-local `.agents/skills` 或项目资源包。

目标：

- project-local skills。
- prompt/report metadata。
- package scripts 名称。
- validators 名称。
- AIOS 相关配置入口。

限制：

- 尊重 `.gitignore` / `.ignore`。
- 默认跳过 `node_modules`、`dist`、`build`、`coverage`、cache、logs、tmp。
- 不对外部项目执行 build/test/lint。
- 不把项目本地 skill 复制到全局入口。

### Custom Folder

范围：

- 用户通过系统目录选择器显式选择的目录。

目标：

- 建立用户授权目录下的本地 AI 资源索引。
- 提供扫描历史、跳过原因、风险汇总和资源质量报告。

限制：

- 每个 custom root 都必须记录授权来源和 policy decision。
- 默认继承强 exclude、metadata-first 和 redaction 规则。
- 用户可以删除 profile 和本地索引。

## 全盘扫描策略

全盘扫描不是 MVP，不属于 Phase 1、Phase 2、Phase 3 或 Phase 4 的默认能力。

只有在 Phase 5 且获得明确批准后，才能作为高级模式设计。必须满足：

- 明确授权：用户看到风险说明后单独确认。
- 可取消：扫描 job 可随时取消，取消后不继续后台遍历。
- 可暂停/恢复：长任务必须可控。
- 可限速：控制 IO、CPU 和并发。
- metadata-first：默认只读路径、大小、mtime、扩展名、manifest 小字段。
- 隐私门控：敏感目录、敏感扩展和敏感字段默认拒绝。
- 强 exclude：默认排除系统目录、缓存、浏览器 profile、聊天数据库、照片库、凭据目录、`node_modules`、`dist`、`build`、日志、临时目录、大二进制文件。
- 失败可解释：权限失败、跳过、拒绝读取必须汇总给用户。

推荐按钮文案：

```text
高级扫描：全盘资源发现
此操作仅建立本地只读索引，不读取凭据值，不执行脚本，不连接服务。
```

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
- profile-specific `max_depth`。
- 小文件 metadata parser 限制大小。
- project profile 尊重 ignore 文件。
- explicit AIOS roots 可以读取隐藏目录 metadata。
- custom profile 只扫用户授权 root。

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
