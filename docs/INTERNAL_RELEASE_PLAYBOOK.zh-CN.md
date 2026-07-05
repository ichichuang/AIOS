# AIOS Desktop 内部发行 Playbook

## 范围

本 playbook 面向 AIOS Desktop 内部 unsigned packaging 验收。

当前 CI 打包入口为 `.github/workflows/desktop-internal-release.yml`。该 workflow 只通过匹配 `v*-internal.*` 的 tag push 触发，自动创建 GitHub prerelease 并上传内部测试安装包；手动 `workflow_dispatch` 流程已停止使用。

## 当前发行状态

- 产品名：`AIOS Desktop`。
- 版本：`0.1.0`。
- Bundle identifier：`com.ichichuang.aios.desktop`。
- Rust binary：`aios-desktop`。
- 当前 bundle targets：`app`, `dmg`。
- 当前 updater artifacts：关闭，`createUpdaterArtifacts: false`。
- 当前签名状态：unsigned。
- 当前公开分发状态：无。
- 当前 CI 打包入口：tag-triggered internal prerelease workflow。

当前本地命令：

```bash
pnpm desktop:build
pnpm desktop:bundle:mac
```

`pnpm desktop:build` 构建 release executable，不生成安装包。`pnpm desktop:bundle:mac` 执行 unsigned macOS `.app` / `.dmg` dry run。

## 内部发行红线

任何内部发行步骤都不得：

- 修改 scanner、data、privacy、onboarding 或 runtime 行为。
- 启动自动扫描、后台扫描、root/home/system/full-disk 扫描。
- 读取、打印或保存 raw secrets、env values、auth/session values、provider keys、cookies、tokens 或 credential material。
- 执行脚本、package scripts 以外的用户文件、MCP server 或 MCP tool。
- 新增 Tauri filesystem、shell、process、SQL、autostart、global-shortcut、notification 或 updater plugin。
- 添加 signing/notarization/updater secrets。
- 配置 signing、notarization、stapling、code-signing、updater endpoint 或 updater artifacts。
- 创建 GitHub tag、release、PR 或 push，除非后续任务明确批准。
- 修改 repo 外文件、全局 Codex hooks、MCP servers、plugins、skills、services、provider/model configs、credentials 或 automations。

## Tag-triggered 内部 prerelease 流程

内部 prerelease 的唯一 CI 入口是推送符合 `v*-internal.*` 的 tag。

1. 取得明确人工批准，确认将创建的内部 tag 名称，例如 `v0.1.0-internal.1`。
2. 在批准范围内创建并推送该 tag。
3. GitHub Actions 自动运行 `.github/workflows/desktop-internal-release.yml`。
4. workflow 依次构建 macOS Apple Silicon、macOS Intel 和 Windows x64 matrix job。
5. 每个 job 先运行 `pnpm install --frozen-lockfile`、`pnpm typecheck` 和 target-specific `cargo check`。
6. Tauri action 自动创建或更新同名 GitHub prerelease，并上传对应安装包 assets。
7. 下载 prerelease assets 后，在隔离测试机上安装或运行。
8. 记录 smoke 结果到仓库内 release readiness 文档或后续验收文档。

旧的 `workflow_dispatch` 手动 artifact 流程不再使用。内部 tag 仍然必须只在明确人工批准后创建；没有批准时不得创建 tag，也不得通过手动 workflow 绕过该 gate。

## 内部产物目标

### macOS Apple Silicon

- Runner：`macos-latest`。
- Target：`aarch64-apple-darwin`。
- 产物：unsigned `.app` 与 `.dmg`。
- Tauri args：`--target aarch64-apple-darwin --bundles app,dmg --no-sign`。
- 限制：无 Developer ID、无公证、无 stapling，Gatekeeper 可能提示或阻止。

### macOS Intel

- Runner：`macos-15-intel`。
- Target：`x86_64-apple-darwin`。
- 产物：unsigned `.app` 与 `.dmg`。
- Tauri args：`--target x86_64-apple-darwin --bundles app,dmg --no-sign`。
- 限制：必须由 Intel runner/host 构建并验证，不把 arm64 产物当作 Intel 产物。

### Windows x64

- Runner：`windows-latest`。
- Target：`x86_64-pc-windows-msvc`。
- 产物：unsigned NSIS 与 MSI installer。
- Tauri args：`--target x86_64-pc-windows-msvc --bundles nsis,msi`。
- 限制：未配置 Windows code signing，可能触发 SmartScreen 或企业安全策略。

## macOS 内部 smoke

最低 smoke：

- App 能启动，窗口标题为 `AIOS Desktop`。
- Dashboard 显示首次/空库状态时不自动扫描。
- Scan Management 可进入。
- Advanced Full-Disk Discovery 未确认时不能启动。
- Skills/MCP/Scripts/Reports/Policies/Validators 等默认资源模块在空动态语料下保持 0 计数。
- Legacy 示例仍只在 Legacy 入口出现，不参与默认动态计数。
- 隐私与数据控制显示 metadata-only、no-content、no-execution 和 reset 只删除 AIOS 记录的边界。
- 退出后不留下 `aios-desktop` 后台进程。

不得在 smoke 中运行真实 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk 扫描。

## Windows 内部 smoke

最低 smoke：

- Installer 可在 Windows x64 测试机运行。
- WebView2 Runtime 缺失/已存在两种路径的行为符合当前 Tauri 默认策略或后续批准的 packaging-only 配置。
- App 能启动，窗口标题为 `AIOS Desktop`。
- 首次启动不自动扫描。
- Scan Management 可见，Advanced Full-Disk Discovery 保留显式确认。
- 空动态语料默认模块保持 0 计数。
- 不出现文件内容、raw secrets、env/auth/session/provider token values。
- 卸载或删除测试产物不删除用户文件。

## unsigned 分发说明

内部 prerelease 说明必须包含：

- 这是 unsigned internal build。
- 这不是 public signed release。
- macOS 可能触发 Gatekeeper 警告；Windows 可能触发 SmartScreen 或企业策略。
- 没有自动更新能力。
- Tauri updater artifacts 保持关闭，`includeUpdaterJson`、`uploadUpdaterJson` 和 `uploadUpdaterSignatures` 均为 false。
- signing、notarization、stapling、Windows code signing 和 updater distribution 仍然延后。
- 安装包不包含用户扫描数据、真实 SQLite app data 或任何凭据。
- 测试人员不得上传、转发或贴出包含本机路径、日志、截图或内部 asset 链接的敏感内容。

## 回滚与清理

内部验收失败时：

- 删除本次下载的 unsigned artifacts。
- 记录失败平台、runner label、命令、关键错误和产物路径。
- 不通过修改安全边界来让打包通过。
- 不新增 signing/updater/workflow secret 来绕过 unsigned 限制。
- 不删除真实用户 app data。
- 不运行 `git reset --hard`、`git clean` 或 repo 外清理命令，除非后续任务明确批准。

如失败已经创建 GitHub prerelease 或 tag，清理方式必须另行批准；不要在常规排障中自动删除 tag、release 或 assets。

## 延后到 signed distribution 的工作

以下内容不属于当前内部 playbook：

- macOS Developer ID 签名。
- Hardened Runtime、entitlements、公证、stapling。
- Windows code signing、timestamp 和 SmartScreen reputation。
- Tauri updater plugin、updater keys、release endpoint、manifest 和自动更新 UI。
- 公开 release notes、checksums 发布、SBOM、artifact attestation 和公开下载页。

## 参考

- AIOS Desktop 本地发行准备：`docs/DESKTOP_RELEASE_READINESS.zh-CN.md`
- AIOS Desktop 本地发行基线：`docs/RELEASE_BASELINE_0.1.0.zh-CN.md`
- AIOS Desktop GitHub Actions 打包计划：`docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md`
- GitHub Releases: <https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases>
- Tauri GitHub Action: <https://github.com/tauri-apps/tauri-action>
- Tauri Windows installer: <https://v2.tauri.app/distribute/windows-installer/>
