# AIOS Desktop 扫描与隐私策略

## 定位

AIOS Desktop 扫描器用于发现和解释本地 AI 能力资源。它默认只读、metadata-first、可取消、可限速、可解释。

扫描器不是默认全盘扫描器，不执行脚本，不连接 MCP，不修改全局配置，不同步 skill 入口。

## 扫描模板 / profiles

Phase 2B 已实现静态扫描模板。模板是用户选择目录前的说明和分类预设，不是自动扫描根目录。

所有模板都遵守同一条硬边界：

- 用户必须通过 Tauri 系统目录选择器显式选择一个目录。
- 模板选择不会自动选择、探测或扫描 `~/.codex`、`~/.claude`、`~/.ai`、home root、项目根、系统根或磁盘根。
- 模板不会绕过 broad/system/home root guard。
- 模板不会启用全盘扫描、文件内容读取、脚本执行、MCP 启动、SQLite、扫描历史或持久索引。
- 模板只影响 UI 说明、分类重点、结果分组说明和有界 max depth / max entries 上限。

当前模板：

| ID | 显示名 | 推荐场景 | 分类重点 | 上限 |
| --- | --- | --- | --- | --- |
| `custom-folder` | 通用自选目录 | 不确定目录类型时先选择一个小而明确的工作文件夹 | 通用资源识别、敏感路径隐藏、未知资源保守归类 | 6 层 / 2,000 项 |
| `project-root` | 项目根目录 | 用户手动选择一个代码仓库或产品项目根目录 | manifest、repo-local skills/prompts、脚本、验证器、docs/reports | 6 层 / 2,000 项 |
| `ai-toolchain` | AI 工具链目录 | 用户手动选择小范围工具链工作目录、插件元数据目录或 prompts/skills 子目录 | MCP/config 元数据、技能入口、提示词入口、策略边界 | 5 层 / 1,500 项 |
| `skills-prompts-workspace` | 技能 / 提示词工作区 | 用户手动选择 skills、prompts 或二者混合目录 | 技能、提示词、验证器、策略说明 | 6 层 / 1,500 项 |
| `docs-reports-workspace` | 文档 / 报告工作区 | 用户手动选择 docs、reports 或交付物目录 | 报告与文档、策略治理、项目资源包 | 5 层 / 1,500 项 |
| `aios-workspace` | AIOS 工作区 | 用户手动选择 AIOS 相关工作区或本仓库内局部目录 | AIOS skills/prompts、报告、脚本、策略治理、验证器 | 6 层 / 2,000 项 |

`get_scan_profiles` 只返回这些静态定义，不检查文件系统。`scan_custom_directory` 接受可选 `profileId`；缺省值保持 `custom-folder` 以兼容 Phase 2A 调用。

### Custom Folder / Profile Templates

Phase 2A / 2B 状态：

- 已实现最小 MVP：用户通过 Tauri 系统目录选择器选择一个目录。
- 已实现静态扫描模板：用户先选择模板，再选择目录，再手动运行扫描。
- Rust 侧只执行 metadata-only traversal，不读取文件内容。
- 扫描结果只保存在当前前端内存中，不写入 SQLite，不保留扫描历史。
- 每次扫描只使用一个用户选择目录，不支持多根目录批量扫描。

范围：

- 用户通过系统目录选择器显式选择的目录。

目标：

- 建立用户授权目录下的临时本地 AI 资源视图。
- 提供跳过原因、风险汇总和资源分类结果。

限制：

- 每个 custom root 都必须记录授权来源和 policy decision。
- 默认继承强 exclude、metadata-first 和 redaction 规则。
- Phase 2B 模板不持久化授权路径，不保存本地索引，不提供扫描历史。
- SQLite、scan history、持久 profile 管理和 diff view 仍是未来阶段。

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
- profile-specific `max_depth` / `max_entries`，但不得超过当前 MVP 的安全边界。
- 小文件 metadata parser 限制大小。
- project profile 尊重 ignore 文件。
- explicit AIOS roots 可以读取隐藏目录 metadata。
- custom/profile template 只扫用户授权 root。
- Phase 2A custom profile 默认只使用 L0 路径 metadata，不解析 manifest 字段。

Phase 2A custom profile 边界：

- `max_depth = 6`。
- `max_entries = 2000`。
- `max_file_size_bytes = 10 MiB`，仅用于元数据大小阈值判断。
- 尊重 `.ignore`、`.gitignore` 和标准 ignore 规则。
- 不跟随 symlink。
- 不读取文件内容，不执行脚本，不启动 MCP，不连接远程服务。
- 拒绝 `/`、用户 home root、`/Users`、`/Volumes`、`/System`、`/Library`、`/Applications`、`/private`、`/tmp`、Windows drive root 等整机或系统边界目录。

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

Phase 2A custom profile 额外强 exclude：

- `.git`
- `.next`
- `.nuxt`
- `.turbo`
- `.venv`
- `venv`
- `__pycache__`
- package manager cache paths such as `.pnpm-store`、`.pnpm`、`.yarn`、`.npm`
- Rust/tool cache paths such as `.cargo`、`.rustup`

若路径或文件名包含 `secret`、`token`、`credential`、`auth`、`session`、`cookie`、`.env`、private key 等敏感特征，Phase 2A 只返回 redacted path segment，并标记 `sensitive-path-redacted`。

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
