# AIOS Desktop 指定目录扫描原生验收

文档类型：内部验收文档。

当前用户-facing 产品定义见 `docs/product/`。本文保留指定目录扫描验收历史，样例分类和工程术语不代表当前普通用户主导航。

## 范围

本报告记录 Phase 2A.1 对已实现的指定目录扫描 MVP 的原生 Tauri 运行时验收和安全加固。验证范围仅覆盖用户显式选择一个目录后的 Rust 侧 metadata-only 扫描、路径守卫、分类映射、跳过/排除行为和桌面 UI 可见结果。

本阶段仍不启用全盘扫描、SQLite、扫描历史、文件内容读取、脚本执行、MCP 执行、Tauri filesystem/shell/process/updater/autostart/global-shortcut/notification/SQL 插件或持久索引。

## Fixture

本次验收使用 repo-local 小型 fixture：

```text
test-fixtures/custom-scan-basic/
```

内容均为空或极小文本文件，总计 391 bytes，不包含真实凭据、token、cookie、auth/session/provider 配置或大文件。

| 路径 | 用途 |
| --- | --- |
| `.mcp/servers.json` | MCP/config metadata 分类 |
| `skills/writer/SKILL.md` | skill 分类 |
| `prompts/draft.prompt.md` | prompt 分类 |
| `scripts/scan-helper.mjs` | script 分类；仅作为路径元数据，不执行 |
| `reports/phase-2a.md` | report/doc 分类 |
| `project-packs/basic/pack.json` | project-pack 分类 |
| `policies/local-policy.md` | policy/governance 分类 |
| `validators/validate-basic.mjs` | validator 分类；仅作为路径元数据，不执行 |
| `package.json` | package manifest 分类 |
| `misc/local-note.txt` | unknown local resource 分类 |
| `venv/ignored.py` | scanner-local exclude 验证；预期不返回资源 |

## 自动化策略验证

| 验证面 | 覆盖方式 | 结果 |
| --- | --- | --- |
| 分类行为 | Rust 单元测试扫描 fixture，并断言 10 类资源均出现 | 通过 |
| broad root 拒绝 | Rust 单元测试拒绝 `/`、`/Users`、`/System`、`/Library`、`/Applications`、`/Volumes`、`/private`、`/tmp`、`C:\\`、`C:\\Users`、`C:\\Windows`、`C:\\Program Files`、`D:/` | 通过 |
| 系统根后代拒绝 | Rust 单元测试拒绝 `/System/Library`、`/Library/Application Support`、`/Applications/Utilities`、`/private/var`、`/tmp/aios-custom-scan` | 通过 |
| exclude 行为 | Rust 单元测试确认 `venv` 条目被跳过且不返回 | 通过 |
| 符号链接 | Rust 单元测试创建 repo-local target fixture，确认 symlink 计入 skipped 且不跟随目标 | 通过 |
| 敏感路径 redaction | Rust 单元测试确认 `configs/prod.env` 显示为 `configs/[sensitive]` | 通过 |
| 前端映射 | TypeScript 单元测试覆盖 skill、validator、unknown sensitive、MCP/config、policy 映射 | 通过 |

## 原生 Tauri 冒烟

### Build executable

命令：

```bash
pnpm desktop:build
```

观察：

- Release executable 可构建到 `src-tauri/target/release/aios-desktop`。
- `bundle.active = false`，因此本次不执行分发打包、签名、公证或 updater 流程。

### Native runtime

命令：

```bash
src-tauri/target/release/aios-desktop
```

说明：

- 使用 `pnpm desktop:build` 产出的 release executable 执行 native smoke，不依赖 Vite dev server。
- macOS `System Events` 可见一个标题为 `AIOS Desktop` 的原生窗口。
- Computer Use 无法稳定附着到非 bundle 的 `aios-desktop` 可执行进程；本次使用 macOS Accessibility / System Events 完成 bounded native smoke。
- 目录选择器作为原生 sheet 打开，标题为 `选择要扫描的目录`。macOS 输入法会改写键盘输入的隐藏路径，因此通过 Accessibility 直接设置 Go-to-Folder 文本字段到 fixture 路径，再点击原生 `Open`。

观察结果：

- `目录扫描` 模块可从原生窗口导航到达。
- 选择目录后 UI 显示 `~/.ai/AIOS/test-fixtures/custom-scan-basic`。
- 点击 `运行扫描` 后 UI 显示 `21 项可见`，并展示扫描结果、跳过/提示摘要和资源类别说明。
- 原生 UI 中仅有 `选择目录` 和 `运行扫描` 两个扫描动作按钮；未发现全盘扫描按钮或 override。
- 可见文案明确显示 `全盘扫描禁用` 和 `全盘扫描非 MVP`。
- 对 fixture 内容字符串的可见文本检查未发现正文泄露，例如未出现 `Fixture skill metadata file`、`Fixture prompt placeholder` 或 `Fixture unknown local resource`。
- 扫描完成后 release 进程已停止，未留下 `aios-desktop` 后台进程。
- shutdown 时出现 macOS IMK wakeup warning，不影响本次只读扫描验收。

## 安全确认

- 扫描结果只展示根目录 display/summary、相对路径、文件/目录类型、扩展名、大小、修改时间、分类、risk/boundary 标签和分类理由。
- Rust scanner 使用 `symlink_metadata` 和 `ignore::WalkBuilder`，`follow_links(false)`，不跟随符号链接。
- 扫描代码不读取文件内容，不执行脚本，不启动 MCP，不写入配置，不创建 SQLite，不持久化扫描历史。
- Tauri capability 仍为 `core:default` 和 `dialog:allow-open`；未新增 filesystem、shell、process、updater、autostart、global-shortcut、notification 或 SQL permission。
- broad/system root 行为仅通过自动化测试验证，没有人工或原生 smoke 去扫描系统根目录。

## 仍未覆盖

- 未验证签名、公证、安装包或 updater，因为当前 `bundle.active = false`。
- 未做全盘扫描，也没有 full-disk override；未来如需此能力必须重新设计权限、产品文案和验收标准。
- 未添加 SQLite、扫描历史或跨会话索引；扫描结果仍只存在于当前界面内存。
- 原生 picker 自动化依赖 macOS Accessibility，后续如果进入稳定 E2E，可改用专门的 Tauri/Electron 桌面测试 harness。
