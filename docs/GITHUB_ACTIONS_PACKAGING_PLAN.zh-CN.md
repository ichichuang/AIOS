# AIOS Desktop GitHub Actions 打包计划

## 范围

本文件记录 AIOS Desktop 内部安装包的 GitHub Actions 打包入口。

当前入口已改为 `.github/workflows/desktop-internal-release.yml`。该 workflow 只在推送匹配 `v*-internal.*` 的 tag 时触发，自动创建 GitHub prerelease 并上传内部测试安装包；不再使用 `workflow_dispatch` 手动触发。

## 当前仓库状态

- 内部打包 workflow：`.github/workflows/desktop-internal-release.yml`。
- 唯一触发条件：`push.tags` 匹配 `v*-internal.*`。
- 当前不提供 `workflow_dispatch`、branch push、pull_request、schedule 或 release trigger。
- GitHub Release assets 上传需要 `contents: write`，workflow 权限只保留该最小写权限。
- 当前 `src-tauri/tauri.conf.json` 的 updater artifacts 仍为 `createUpdaterArtifacts: false`。
- 当前没有 signing、notarization、stapling、Windows code signing 或 Tauri updater 配置。
- 当前没有新增 Tauri filesystem、shell、process、SQL、autostart、global-shortcut、notification 或 updater plugin。

## 内部标签触发原则

内部 packaging 现在通过 tag gate 表达一次明确的内部测试发行：

- tag 必须匹配 `v*-internal.*`，例如 `v0.1.0-internal.1`。
- tag 必须只在明确人工批准后创建和推送。
- tag push 后 GitHub Actions 自动创建 prerelease，release 名称为 `AIOS Desktop <tag> Internal`。
- prerelease 仅用于内部 unsigned testing，不是公开 signed release。
- workflow 不创建 tag、PR 或 push；它只响应已经推送的内部 tag。
- workflow 不引用 Apple、Windows、provider、updater 或 signing secrets。
- workflow 只向 Tauri action 提供 GitHub 自动提供的 `GITHUB_TOKEN`。

## Matrix 策略

workflow 使用 `fail-fast: false`，并设置 `max-parallel: 1`，降低多个 matrix job 同时创建或更新同一个 prerelease 的竞态风险。

| job | `runs-on` | target | 产物 | Tauri args |
| --- | --- | --- | --- | --- |
| macOS Apple Silicon | `macos-latest` | `aarch64-apple-darwin` | unsigned `.app` / `.dmg` | `--target aarch64-apple-darwin --bundles app,dmg --no-sign` |
| macOS Intel | `macos-15-intel` | `x86_64-apple-darwin` | unsigned `.app` / `.dmg` | `--target x86_64-apple-darwin --bundles app,dmg --no-sign` |
| Windows x64 | `windows-latest` | `x86_64-pc-windows-msvc` | unsigned NSIS / MSI | `--target x86_64-pc-windows-msvc --bundles nsis,msi` |

## Workflow 步骤

每个 matrix job 执行：

1. `actions/checkout@v4`，并设置 `persist-credentials: false`。
2. `pnpm/action-setup@v4`，使用 `10.28.2`。
3. `actions/setup-node@v4`，使用 Node `22` 与 pnpm cache。
4. `dtolnay/rust-toolchain@stable`，安装 matrix target。
5. `pnpm install --frozen-lockfile`。
6. `pnpm typecheck`。
7. `cd src-tauri && cargo check --target "${{ matrix.target }}"`。
8. `tauri-apps/tauri-action@v1` 运行 `pnpm tauri`，用 matrix args 打包并上传 prerelease assets。

## 发布边界

该 workflow 的 release body 必须说明：

- 这是 unsigned internal testing build。
- 这不是 public signed release。
- macOS Gatekeeper、Windows SmartScreen 或企业策略可能提示或阻止安装。
- Tauri updater artifacts 保持关闭。
- signing、notarization、stapling、code signing 和 updater distribution 继续延后。

该 workflow 不应：

- 使用 `workflow_dispatch`。
- 配置 signing/notarization/stapling/code-signing。
- 启用 `tauri-plugin-updater`。
- 设置 `createUpdaterArtifacts: true`。
- 配置 updater endpoint、manifest、签名 key 或 updater JSON 上传。
- 修改 scanner、data、privacy、onboarding 或 runtime 行为。
- 读取、打印或保存 secrets、credentials、tokens、cookies 或环境变量值。
- 新增 Tauri filesystem、shell、process、SQL、autostart、global-shortcut、notification 或 updater plugin。

## 后续延后项

以下内容仍需要单独 approval gate 和 secrets handling plan：

- macOS Developer ID signing identity。
- Hardened Runtime、entitlements、公证和 stapling。
- Windows code signing certificate、timestamp 和 SmartScreen reputation。
- Tauri updater plugin、updater keys、endpoint、manifest、签名和自动更新 UI。
- 公开 release notes、校验和发布、SBOM、artifact attestation 和公开分发渠道。

## 参考

- GitHub runner labels: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job>
- GitHub Releases: <https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases>
- Tauri GitHub Action: <https://github.com/tauri-apps/tauri-action>
- Tauri Windows installer: <https://v2.tauri.app/distribute/windows-installer/>
- Microsoft WebView2 distribution: <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution>
