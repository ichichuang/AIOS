# AIOS Desktop GitHub Actions 打包计划

## 范围

本文件记录 AIOS Desktop 内部安装包 GitHub Actions 手动构建 workflow。

当前已新增 `.github/workflows/desktop-build-artifacts.yml`。该 workflow 仅使用 `workflow_dispatch` 手动触发，只上传 workflow artifacts，不创建 tag、release、PR 或 push，不写入任何 secret，不改变 AIOS Desktop 产品行为。

## 当前仓库状态

- 当前仓库有一个内部打包 dry-run workflow：`.github/workflows/desktop-build-artifacts.yml`。
- 当前 workflow 没有 push、pull_request、schedule、tag 或 release trigger。
- 当前本地打包能力仅覆盖 macOS unsigned `.app` / `.dmg` dry run。
- 当前 `src-tauri/tauri.conf.json` 的 bundle targets 为 `app` 与 `dmg`。
- 当前 Windows installer 仅通过 workflow matrix 的 Tauri CLI `--bundles nsis,msi` dry run 请求，不修改 Tauri bundle config。
- 当前没有 Windows code signing、notarization、stapling 或 updater 配置。

## 计划原则

当前 workflow 只做手动触发的 unsigned internal artifacts：

- 只使用 `workflow_dispatch`。
- 只上传 workflow artifacts，不创建 tag，不创建 GitHub release，不上传 release assets。
- 不使用 signing secrets。
- 不配置 Apple、Windows、updater 或 provider 凭据。
- 不启用 `tauri-plugin-updater`。
- 不修改 scanner、data、privacy、onboarding 或 runtime 行为。
- 不新增 Tauri filesystem、shell、process、SQL、autostart、global-shortcut、notification 或 updater plugin。

## 已验证 runner labels

当前 workflow 使用以下 GitHub-hosted runner labels：

| 目标 | 推荐 label | 架构 | 用途 |
| --- | --- | --- | --- |
| macOS Apple Silicon | `macos-latest` | arm64 | Apple Silicon 内部 `.app` / `.dmg` artifact。 |
| macOS Intel | `macos-15-intel` | Intel x64 | Intel `.app` / `.dmg` artifact。 |
| Windows x64 | `windows-latest` | x64 | Windows x64 `nsis` / `msi` artifact dry run。 |

可选后续 labels：

- `macos-15`：arm64，适合在需要固定 macOS major image 时替代 `macos-latest`。
- `macos-26`：arm64，适合在确认 Tauri/Rust/Xcode 工具链兼容后升级。
- `macos-26-intel`：Intel x64，适合在确认工具链兼容后升级。
- `windows-2025`：x64，适合在需要固定 Windows image 时替代 `windows-latest`。
- `windows-2022`：x64 fallback，用于 `windows-2025` 上出现工具链或 runner image 问题时降级。

当前 workflow 是内部 dry run，不是 release workflow；如后续进入可复现 release gate，应重新评审是否把 `macos-latest` / `windows-latest` 固定为具体版本 label。

## 当前 matrix 策略

当前 workflow matrix 包含三个 job：

| job | `runs-on` | 目标产物 | 备注 |
| --- | --- | --- | --- |
| `macos-arm64` | `macos-latest` | unsigned `.app` / `.dmg` | Apple Silicon 内部验证，`--target aarch64-apple-darwin --bundles app,dmg --no-sign`。 |
| `macos-intel` | `macos-15-intel` | unsigned `.app` / `.dmg` | Intel 内部验证。 |
| `windows-x64` | `windows-latest` | unsigned Windows `nsis` / `msi` | Windows x64 内部 dry run，`--target x86_64-pc-windows-msvc --bundles nsis,msi`。 |

Windows job 仍是 dry run。如果 GitHub-hosted Windows run 暴露缺失 Windows icon、WebView2 install mode 或 Tauri bundle 配置问题，后续只能做最小 packaging-only 修正，并继续禁止签名、updater 和产品行为改动。

## workflow_dispatch artifacts 先于 tag/release

先做 `workflow_dispatch` artifact workflow 的原因：

- 手动触发可以把打包从日常 CI、tag、release 和公开分发中隔离出来。
- unsigned 内部产物需要人工下载、安装、smoke 和记录限制，不应被误认为公开发布。
- workflow artifacts 可以在一次 run 结束后保留构建输出，适合内部验收。
- artifact 阶段不需要 Apple、Windows 或 updater signing secrets。
- artifact 阶段可以先验证 runner、pnpm、Rust、Tauri CLI、产物路径、命名和上传逻辑。
- tag/release workflow 会制造更强的发布语义，必须等签名、公证、stapling、code signing、release notes、校验和、回滚和权限模型成熟后再做。

只有当 unsigned artifacts 在三个目标上稳定、并且签名/公证/Windows code signing/updater 决策通过后，才应设计 tag 或 GitHub release workflow。

## 当前 workflow 边界

当前 workflow 只做这些步骤：

1. Checkout。
2. 设置 pnpm 和 Node，使用仓库 `packageManager` 与 `engines.node` 约束。
3. 设置 Rust toolchain，匹配 `src-tauri/Cargo.toml` 的 `rust-version = 1.77.2` 或 repo 后续明确版本。
4. 安装依赖。
5. 运行 `git diff --check`、typecheck 和必要 build gate。
6. 按 matrix 运行对应 Tauri bundle 命令。
7. 收集明确路径下的 `.app`、`.dmg` 或 Windows installer。
8. 上传 workflow artifacts。

当前 workflow 不应：

- 写入仓库。
- 创建 commit、tag、release 或 PR。
- 调用 Apple notarization、codesign、signtool 或 updater signing。
- 打印 secrets、环境变量值或证书信息。
- 读取真实用户 app data。
- 运行 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk scan。

## 产物命名建议

当前 workflow artifact 名称应包含产品、版本、平台、架构和 bundle 类型：

```text
aios-desktop-[version]-[platform]-[arch]-[bundle]
```

产物内部文件名以 Tauri 实际输出为准，但上传前应在 job log 中列出相对路径、文件大小和 SHA-256 checksum。checksum 可以记录 hash 值；不得记录任何 secret、token、cookie、auth/session 或环境变量值。

## Windows WebView2 策略

Windows x64 内部安装和验收进入前必须先选择 WebView2 runtime 策略：

- 默认候选：Evergreen bootstrapper，包体较小，但依赖目标机器联网获取 Runtime。
- 离线候选：offline installer，包体增大，但可以覆盖离线安装。
- 特殊候选：fixed runtime，包体更大且需要自行跟进 Runtime 安全更新。
- 不建议：skip，因为缺少 WebView2 Runtime 的机器上 app 不可用。

该选择应写入 `src-tauri/tauri.conf.json` 的 Windows bundle 配置，并在 Windows artifact 名称或 release notes 中说明。

## signing / notarization / updater 延后

以下内容不进入当前 workflow：

- macOS Developer ID signing identity。
- Hardened Runtime、entitlements、公证、stapling。
- Windows PFX/code signing certificate、timestamp 配置和 SmartScreen reputation 工作。
- `tauri-plugin-updater`、updater private key、updater public key、endpoint、manifest、release signing。
- GitHub release upload、tag trigger、release notes automation。

这些工作需要单独 approval gate 和 secrets handling plan。

## 永不加入的 secrets

workflow、repository、docs 和 scripts 不得包含真实值：

- Apple Developer 账号、证书、私钥、P12/P8、app-specific password、ASC key。
- Windows signing certificate、PFX、password、timestamp credential。
- Tauri updater private key。
- GitHub PAT 或 release token。
- Provider API key、auth/session 文件、cookie、token、环境变量值。

后续 workflow 只有在 signing 阶段被单独批准后才可引用抽象 secret 占位；不得在文档、workflow 或脚本中写入真实 secret 名称或真实值。

## 后续可能变更文件

后续修正 Windows 或 release gate 时可能需要修改：

- `.github/workflows/desktop-build-artifacts.yml`：调整手动 artifact workflow。
- `package.json`：新增 `desktop:bundle:win` 或按平台拆分的 bundle scripts。
- `src-tauri/tauri.conf.json`：新增 Windows bundle target、Windows WebView2 runtime 策略和可审计的 bundle metadata。
- `docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md`：记录实际 matrix 验证结果。
- `docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md`：记录 artifact 下载、安装、smoke 和回滚步骤。

## 参考

- GitHub runner labels: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job>
- Manual workflow trigger: <https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow>
- Workflow artifacts: <https://docs.github.com/en/actions/tutorials/store-and-share-data>
- Tauri Windows installer: <https://v2.tauri.app/distribute/windows-installer/>
- Microsoft WebView2 distribution: <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution>
