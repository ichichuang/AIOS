# AIOS Desktop Windows / macOS 打包兼容性审计

## 范围

本文件记录 AIOS Desktop 0.1.0 在 Windows 与 macOS 内部分发打包前的兼容性审计。

本步骤只新增仓库内文档，不新增 GitHub workflow，不改产品代码，不改 Tauri capability，不改 scanner、data、privacy、onboarding 或 runtime 行为，不配置签名、公证、stapling、code signing、updater 或发布渠道。

## 当前产品基线

AIOS Desktop 当前是 local-first、metadata-only 的 Tauri v2 桌面应用：

- 前端：React + TypeScript + Vite，包名 `@aios-control/frontend`，版本 `0.1.0`。
- 根包：`aios-control-center`，版本 `0.1.0`，`private: true`，`packageManager: pnpm@10.28.2`。
- Rust package：`aios-desktop`，版本 `0.1.0`，Rust edition `2021`，`rust-version = 1.77.2`。
- Tauri CLI：根 `package.json` 固定 `@tauri-apps/cli = 2.11.4`。
- Tauri runtime：`src-tauri/Cargo.toml` 使用 `tauri = "2"` 与 `tauri-plugin-dialog = "2"`。
- Tauri capability：仅 `core:default` 与 `dialog:allow-open`。
- 当前本地数据库：Rust-owned SQLite，位于 Tauri app local data 目录，不进入仓库或 bundle。

当前产品行为边界保持不变：

- 首次启动不扫描任何目录。
- 扫描只能由用户在扫描管理中显式启动。
- 扫描只保存安全元数据，不读取文件内容，不执行脚本，不启动 MCP，不保存 raw secret、env、auth/session、provider key、cookie 或 token value。
- Legacy snapshot 只作为示例/兼容数据显式查看，不代表当前电脑扫描结果，不参与动态资源计数。
- 清空本地库只删除 AIOS app SQLite 记录，不删除用户文件。

## 当前 Tauri 身份与版本

| 项目 | 当前值 | 来源 |
| --- | --- | --- |
| Product name | `AIOS Desktop` | `src-tauri/tauri.conf.json` |
| Window title | `AIOS Desktop` | `src-tauri/tauri.conf.json` |
| Bundle identifier | `com.ichichuang.aios.desktop` | `src-tauri/tauri.conf.json` |
| App version | `0.1.0` | `package.json`、`frontend/package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` |
| Rust binary | `aios-desktop` | `src-tauri/Cargo.toml` |
| Bundle targets | `app`, `dmg` | `src-tauri/tauri.conf.json` |
| Updater artifacts | `createUpdaterArtifacts: false` | `src-tauri/tauri.conf.json` |
| Publisher | `ichichuang` | `src-tauri/tauri.conf.json` |
| Category | `DeveloperTool` | `src-tauri/tauri.conf.json` |

当前 `pnpm desktop:build` 只构建 release executable，不生成安装包。当前 `pnpm desktop:bundle:mac` 执行 `pnpm tauri build --bundles app,dmg --no-sign`，只适合本地 unsigned macOS packaging dry run。

## macOS Apple Silicon 内部打包目标

目标：

- 架构：Apple Silicon，`arm64` / `aarch64-apple-darwin`。
- 产物：unsigned `.app` 与 unsigned `.dmg`。
- 当前本地已验证路径：`src-tauri/target/release/bundle/macos/AIOS Desktop.app` 与 `src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_aarch64.dmg`。
- 适用场景：开发者本机、内部 dry run、产品验收，不适合公开分发。

限制：

- 当前使用 `--no-sign`，没有 Developer ID 签名、TeamIdentifier、公证或 stapling。
- Gatekeeper 可能阻止或警告，内部测试人员需要明确知道这是 unsigned 内部产物。
- 不应把 unsigned `.dmg` 作为公开下载物、release asset 或自动更新源。

## macOS Intel 内部打包目标

目标：

- 架构：Intel，`x64` / `x86_64-apple-darwin`。
- 产物：unsigned `.app` 与 unsigned `.dmg`。
- 建议在真实 Intel GitHub-hosted macOS runner 或 Intel Mac 上构建，不把 Apple Silicon 本地产物冒充 Intel 产物。

当前差距：

- 当前仓库只记录了本地 Apple Silicon dry run 产物。
- 仍需在后续阶段增加独立的 macOS Intel 打包验证命令和产物命名规则。
- 仍需确认 Tauri bundler、Rust target、前端 build 和 app smoke 在 Intel runner 上通过。

限制与 Apple Silicon 相同：unsigned only，不签名、不公证、不 staple、不发布。

## Windows x64 内部打包目标

目标：

- 架构：Windows x64，`x86_64-pc-windows-msvc`。
- 产物：后续阶段应选择明确的 Tauri Windows installer target，例如 NSIS 或 MSI，并固定产物命名。
- 适用场景：Windows x64 内部安装和 smoke，不适合公开分发。

当前差距：

- 当前 `src-tauri/tauri.conf.json` 的 `bundle.targets` 只有 `app` 与 `dmg`，没有 Windows installer target。
- 当前 `package.json` 没有 Windows bundle 脚本。
- 当前没有 GitHub workflow 或 Windows-hosted packaging job。
- 当前没有 Windows WebView2 runtime 策略配置。
- 当前没有 Windows code signing、timestamp、SmartScreen 或 Microsoft Store 分发配置。

内部限制：

- unsigned Windows installer 或 executable 可能触发 SmartScreen、Defender、企业策略或浏览器下载警告。
- 内部测试说明必须明确产物 unsigned，且不得要求用户绕过企业安全策略。
- 不应把 unsigned Windows 产物作为公开 release asset。

## Windows WebView2 Runtime 处理选项

Tauri Windows app 使用 Microsoft Edge WebView2。当前仓库尚未配置 Windows `webviewInstallMode`。后续 Windows 打包阶段需要先选策略，再改 `src-tauri/tauri.conf.json`。

可选策略：

| 策略 | 说明 | 适合度 |
| --- | --- | --- |
| Evergreen bootstrapper | 安装器检查并通过网络安装 Evergreen WebView2 Runtime。安装包较小，但依赖网络。 | 默认候选，适合内部联网测试。 |
| Offline installer | 把 Evergreen offline installer 嵌入安装包，支持无网络安装，但安装包明显变大。 | 适合受控内网或离线测试。 |
| Fixed runtime | 随 app 打包固定版本 WebView2 Runtime，可控性高，但包体更大，且需要自行更新 runtime 安全补丁。 | 仅在业务或环境强约束下考虑。 |
| Skip | 不检查或安装 Runtime，目标机器缺少 WebView2 时 app 不可用。 | 不建议作为默认内部分发策略。 |

Windows 11 通常预装 WebView2 Runtime，Windows 10 多数设备也已有 Runtime，但仍需处理少数缺失场景。内部计划应优先 Evergreen，除非目标 Windows 环境明确离线或被企业策略锁定。

## unsigned 内部分发限制

当前所有计划均限定为 internal unsigned distribution：

- 不保证安装体验顺滑。
- 不绕过 Gatekeeper、SmartScreen、Defender、企业 MDM、浏览器下载策略或终端用户安全设置。
- 不提供自动更新。
- 不提供公开 release、tag release、稳定下载链接或渠道化发布。
- 不承诺跨版本数据迁移，除非后续 release gate 单独验证。
- 不把 app local data、用户扫描结果、真实数据库或用户文件打包进安装包。

## 延后工作

以下工作必须延后到单独阶段，并在实施前单独评审：

- macOS Developer ID signing identity、Hardened Runtime、entitlements、公证、stapling 和 Gatekeeper 验证。
- Windows code signing certificate、timestamp server、SmartScreen reputation、MSI/NSIS 签名和企业分发策略。
- `tauri-plugin-updater`、updater public key、private signing key、endpoint、release manifest、回滚策略和 updater UI。
- GitHub tag/release workflow、release upload、artifact attestation 或公开下载页。
- 任何新增 Tauri filesystem、shell、process、SQL、autostart、global-shortcut、notification 或 updater plugin。
- scanner、data、privacy、onboarding 或 runtime 行为调整。

## 不得加入的凭据与密钥

后续阶段不得把以下内容提交到仓库、workflow、文档、脚本、配置或日志：

- Apple Developer 账号值、证书、私钥、P12/P8、app-specific password、ASC issuer/key id/private key。
- Windows code signing certificate、PFX、PVK、密码、timestamp 服务凭据。
- GitHub PAT、fine-grained token、Actions secret value、release token。
- Tauri updater private key、updater signing key、私有发布源 token。
- SSH private key、GPG private key、codesign identity private material。
- OpenAI 或其他 provider API key、auth/session 文件、cookie、token、环境变量值。

文档和 workflow 只能提到 secret 名称占位和注入边界，不得出现真实值。

## 后续阶段可能需要修改的仓库文件

仅在进入后续明确阶段时，才可能修改：

- `src-tauri/tauri.conf.json`：Windows bundle target、Windows installer 配置、WebView2 `webviewInstallMode`、未来签名配置占位。
- `package.json`：新增明确的 Windows/macOS matrix 打包脚本，例如 Windows bundle 命令。
- `src-tauri/Cargo.toml`：仅当后续阶段明确批准新增 Tauri plugin 或 Rust 依赖时修改。
- `.github/workflows/*.yml`：仅在 workflow 计划被批准后新增；本步骤不新增。
- `docs/*.zh-CN.md`：持续记录 release gate、smoke、签名和分发决策。

当前不需要修改 README；README 已有 Desktop / Tauri 与 release readiness 文档入口。

## 参考

- GitHub runner labels: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job>
- Tauri Windows installer and WebView2 modes: <https://v2.tauri.app/distribute/windows-installer/>
- Microsoft WebView2 distribution: <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution>
- Microsoft Evergreen vs fixed WebView2 Runtime: <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/evergreen-vs-fixed-version>
