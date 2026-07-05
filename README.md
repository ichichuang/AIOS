# AIOS Desktop

AIOS Desktop 是面向内部用户与公司测试人员的本地优先 AI 能力、资源发现与控制中心。

它用于在本机查看和管理 AIOS 相关资源的安全元数据，例如 Skills、MCP、Scripts、Reports、Project Packs、Policies 和 Validators。AIOS Desktop 不把本机资源上传到云端，也不把 Legacy 示例数据当作当前电脑的扫描结果。

## 重要安全边界

- 首次启动时，AIOS Desktop 不扫描任何目录。
- 扫描只会在用户进入 Scan Management 并明确点击开始后执行。
- 扫描是 metadata-only：只保存路径展示名、类型、计数、状态、时间等安全元数据。
- AIOS Desktop 不读取文件内容，不执行脚本，不启动或执行 MCP server，不读取或保存 secrets、token values、cookies、provider keys、auth/session values 或 raw environment values。
- Reset / 清空本地库只删除 AIOS Desktop 本地数据库记录，不删除用户文件、目录、脚本或项目。
- Advanced Full-Disk Discovery 保持显式确认门控；没有确认时不能启动。

本地资源库由 AIOS Desktop 自己管理，存储在应用本地数据目录的 SQLite 数据库中。Legacy / demo snapshot 只用于兼容或演示入口，不参与 Dashboard、Skills、MCP、Scripts 等默认动态计数。

## 内部测试版下载与安装

内部测试版通过本仓库的 [GitHub Releases](../../releases) 分发。请选择最新的内部 prerelease，并按平台下载对应 asset，不要下载 source code 压缩包来安装桌面应用。

| 平台 | 选择的 asset |
| --- | --- |
| Apple Silicon Mac | `AIOS.Desktop_0.1.0_aarch64.dmg` |
| Intel Mac | `AIOS.Desktop_0.1.0_x64.dmg` |
| Windows x64 常规安装 | `AIOS.Desktop_0.1.0_x64-setup.exe` |
| Windows x64 MSI 用户 | `AIOS.Desktop_0.1.0_x64_en-US.msi` |

当前构建是 unsigned internal testing build，不是公开签名发行版。macOS Gatekeeper、Windows SmartScreen、浏览器下载保护或企业安全策略可能提示风险，甚至阻止安装。遇到企业策略拦截时，请按公司内部测试流程处理，不要绕过组织安全要求。

Tauri updater 当前未启用，应用不会自动更新。需要测试新版本时，请重新进入 GitHub Releases 下载新的内部测试版。

## 首次使用检查

1. 启动后先确认 Dashboard 处于首次/空库状态，没有自动扫描或运行中的批次。
2. Skills、MCP、Scripts、Reports、Policies、Validators 等动态资源计数为空时，应显示 0 或空库引导。
3. Legacy / demo 数据只应在 Legacy 入口出现，不应进入默认动态资源计数。
4. 在 Scan Management 中添加一个明确的项目文件夹，确认扫描范围是你主动选择的目录。
5. 使用 Custom Directories 时，只选择当前测试需要的目录；避免选择 home root、系统盘、`/Users`、`/Volumes` 或无关大目录。
6. 使用 Intelligent Whole-Computer Discovery 时，先阅读提示，再确认它会从常见工作目录候选中发现资源；不要把它当作全盘扫描。
7. Advanced Full-Disk Discovery 必须保持确认门控。没有明确测试授权时，不要运行 full-disk 级别扫描。
8. 如需清空测试数据，使用 Privacy & Data Controls 中的 reset。该操作只删除 AIOS Desktop 本地数据库记录，不删除用户文件。

## 问题反馈

反馈问题时，请尽量提供：

- 操作系统和 CPU 架构。
- 下载的 Release / tag 和 asset 文件名。
- 问题发生的页面或操作路径。
- 预期结果、实际结果和可复现步骤。
- 关键错误摘要；如需日志，请先脱敏。

不要在 issue、聊天、截图、日志或文档中粘贴以下内容：

- secrets、token values、provider keys、cookies、OpenIDs、auth/session values。
- raw environment values 或 credential logs。
- 包含密钥、账号、私有 URL、内部 asset 链接或凭据的截图。
- 未脱敏的私有路径、用户名、公司项目名、客户名或个人文件名。
- Apple、Windows、GitHub、OpenAI 或其他服务的账号值、证书、签名 key、session 文件或授权材料。

## 开发者入口

本仓库是 AIOS Desktop 的 Tauri v2 桌面应用工程：

- 前端：React + TypeScript + Vite，位于 `frontend/`。
- 静态 inventory scanner：TypeScript，位于 `server/`。
- 桌面壳：Tauri v2 / Rust，位于 `src-tauri/`。
- 包管理器：`pnpm@10.28.2`。
- Node.js：`>=22`。
- 当前版本：`0.1.0`。
- Bundle identifier：`com.ichichuang.aios.desktop`。
- Rust binary：`aios-desktop`。

常用本地命令：

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

说明：

- `pnpm desktop:build` 构建 release executable，不生成安装包。
- `pnpm desktop:bundle:mac` 执行 unsigned macOS `.app` / `.dmg` dry run。
- 当前未配置 signing、notarization、stapling、Windows code signing、Tauri updater 或公开分发渠道。
- 当前未启用 Tauri SQL、filesystem、shell、process、autostart、global-shortcut、notification 或 updater plugin。

更深入的设计、发行和安全文档：

- [Desktop 发行准备](docs/DESKTOP_RELEASE_READINESS.zh-CN.md)
- [内部发行 Playbook](docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md)
- [GitHub Actions 打包计划](docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md)
- [Windows / macOS 打包兼容性审计](docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md)
- [Desktop 架构](docs/DESKTOP_ARCHITECTURE.zh-CN.md)
- [Scanner Policy](docs/SCANNER_POLICY.zh-CN.md)
- [Safety](docs/SAFETY.zh-CN.md)
- [Architecture](docs/ARCHITECTURE.zh-CN.md)
- [Roadmap](docs/ROADMAP.zh-CN.md)
