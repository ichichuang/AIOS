# AIOS Desktop 内部发行 Playbook

## 范围

本 playbook 面向 AIOS Desktop 0.1.0 的内部 unsigned packaging 验收。

当前仓库已新增内部手动 artifact workflow：`.github/workflows/desktop-build-artifacts.yml`。该 workflow 只通过 `workflow_dispatch` 触发，不创建 tag 或 release，不推送、不写入 secrets，不改变产品行为。

## 当前发行状态

当前状态：

- 产品名：`AIOS Desktop`。
- 版本：`0.1.0`。
- Bundle identifier：`com.ichichuang.aios.desktop`。
- Rust binary：`aios-desktop`。
- 当前 bundle targets：`app`, `dmg`。
- 当前 updater artifacts：关闭，`createUpdaterArtifacts: false`。
- 当前签名状态：unsigned。
- 当前公开分发状态：无。
- 当前 CI 打包入口：`.github/workflows/desktop-build-artifacts.yml`，仅手动触发并上传 workflow artifacts。

当前可用命令：

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
- 创建 GitHub tag、release、PR 或 push，除非后续任务明确批准。
- 修改 repo 外文件、全局 Codex hooks、MCP servers、plugins、skills、services、provider/model configs、credentials 或 automations。

## 内部产物目标

### macOS Apple Silicon

- 平台：macOS arm64。
- 产物：unsigned `.app` 与 `.dmg`。
- 用途：Apple Silicon 开发者机器或 GitHub-hosted macOS arm64 runner 内部 smoke。
- 限制：无 Developer ID、无公证、无 stapling，Gatekeeper 可能提示或阻止。

### macOS Intel

- 平台：macOS Intel x64。
- 产物：unsigned `.app` 与 `.dmg`。
- 用途：Intel Mac 或 GitHub-hosted macOS Intel runner 内部 smoke。
- 限制：必须由 Intel runner/host 构建并验证，不把 arm64 产物当作 Intel 产物。

### Windows x64

- 平台：Windows x64。
- 产物：后续阶段选择 NSIS 或 MSI 后生成 unsigned installer。
- 用途：Windows x64 内部 smoke。
- 限制：当前仓库尚未配置 Windows target、Windows bundle script 或 WebView2 runtime 策略；unsigned installer 可能触发 SmartScreen 或企业安全策略。

## 本地 macOS dry run 流程

1. 确认工作树状态。

```bash
git status --short
```

2. 安装依赖或确认依赖已安装。

```bash
pnpm install
```

3. 运行窄验证。

```bash
git diff --check
pnpm --filter @aios-control/frontend typecheck
cd src-tauri && cargo check
```

4. 构建 release executable。

```bash
pnpm desktop:build
```

5. 构建 unsigned macOS bundle。

```bash
pnpm desktop:bundle:mac
```

6. 确认产物路径。

```text
src-tauri/target/release/aios-desktop
src-tauri/target/release/bundle/macos/AIOS Desktop.app
src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_*.dmg
```

7. 记录 SHA-256 checksum、文件大小、平台架构和构建日期。不得记录 secrets、环境变量值或用户 app data。

## workflow_dispatch artifact 流程

使用当前 GitHub Actions packaging workflow 时，内部发行顺序应为：

1. 手动运行 `workflow_dispatch`。
2. 选择明确 branch，不使用 tag trigger。
3. 下载 workflow artifacts。
4. 验证 artifact 名称、平台、架构、版本、签名状态和 checksum。
5. 在隔离测试机上安装或运行。
6. 记录 smoke 结果到仓库内 release readiness 文档或后续验收文档。
7. 不创建 tag/release，除非后续 signed distribution gate 已批准。

workflow artifacts 阶段先于 tag/release，因为它只表达“一次内部构建输出”，不会制造公开发布语义，也不需要 signing secrets。

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

进入 Windows 内部安装和 smoke 前必须先完成：

- 选择 Windows installer target。
- 选择 WebView2 runtime 策略。
- 如 dry run 失败，再评估是否需要明确 Windows bundle script 或 packaging-only Tauri config。
- 使用当前手动 workflow 的 `windows-latest` / `x86_64-pc-windows-msvc` / `nsis,msi` matrix row。

最低 smoke：

- Installer 可在 Windows x64 测试机运行。
- WebView2 Runtime 缺失/已存在两种路径的行为符合所选策略。
- App 能启动，窗口标题为 `AIOS Desktop`。
- 首次启动不自动扫描。
- Scan Management 可见，Advanced Full-Disk Discovery 保留显式确认。
- 空动态语料默认模块保持 0 计数。
- 不出现文件内容、raw secrets、env/auth/session/provider token values。
- 卸载或删除测试产物不删除用户文件。

## unsigned 分发说明

内部测试说明必须包含：

- 这是 unsigned internal build。
- macOS 可能触发 Gatekeeper 警告；Windows 可能触发 SmartScreen 或企业策略。
- 产物不适合公开分享，不是正式 release。
- 没有自动更新能力。
- 安装包不包含用户扫描数据、真实 SQLite app data 或任何凭据。
- 测试人员不得上传、转发或贴出包含本机路径、日志、截图或内部 artifact 链接的敏感内容。

## 回滚与清理

内部验收失败时：

- 删除本次下载的 unsigned artifacts。
- 记录失败平台、runner label、命令、关键错误和产物路径。
- 不通过修改安全边界来让打包通过。
- 不新增 signing/updater/workflow secret 来绕过 unsigned 限制。
- 不删除真实用户 app data。
- 不运行 `git reset --hard`、`git clean` 或 repo 外清理命令，除非后续任务明确批准。

## 延后到 signed distribution 的工作

以下内容不属于当前内部 playbook：

- macOS Developer ID 签名。
- Hardened Runtime、entitlements、公证、stapling。
- Windows code signing、timestamp 和 SmartScreen reputation。
- GitHub release、tag trigger、release notes、checksums 发布和公开下载。
- Updater plugin、updater keys、release endpoint、manifest 和自动更新 UI。
- Artifact attestation、SBOM、公有渠道验收和企业部署策略。

## 后续可能修改文件

只有进入后续阶段时，才可能修改：

- `.github/workflows/desktop-build-artifacts.yml`
- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `docs/DESKTOP_RELEASE_READINESS.zh-CN.md`
- `docs/RELEASE_BASELINE_0.1.0.zh-CN.md`
- `docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md`
- `docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md`

当前步骤不修改上述实现文件，也不修改 README。

## 参考

- AIOS Desktop 本地发行准备：`docs/DESKTOP_RELEASE_READINESS.zh-CN.md`
- AIOS Desktop 本地发行基线：`docs/RELEASE_BASELINE_0.1.0.zh-CN.md`
- GitHub manual workflow dispatch: <https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow>
- GitHub workflow artifacts: <https://docs.github.com/en/actions/tutorials/store-and-share-data>
- Tauri Windows installer: <https://v2.tauri.app/distribute/windows-installer/>
