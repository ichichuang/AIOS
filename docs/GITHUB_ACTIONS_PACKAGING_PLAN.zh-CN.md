# AIOS Desktop GitHub Actions 打包计划

## 范围

本文件是后续 GitHub Actions 打包 workflow 的计划文档。

本步骤不新增 `.github/workflows`，不修改现有 workflow，不创建 tag、release、PR 或 push，不写入任何 secret，不改变 AIOS Desktop 产品行为。

## 当前仓库状态

- 当前仓库没有 `.github/` 目录。
- 当前没有 GitHub Actions 打包 workflow。
- 当前本地打包能力仅覆盖 macOS unsigned `.app` / `.dmg` dry run。
- 当前 `src-tauri/tauri.conf.json` 的 bundle targets 为 `app` 与 `dmg`。
- 当前没有 Windows installer target、Windows bundle script、code signing、notarization、stapling 或 updater 配置。

## 计划原则

第一阶段 workflow 只做手动触发的 unsigned internal artifacts：

- 只使用 `workflow_dispatch`。
- 只上传 workflow artifacts，不创建 tag，不创建 GitHub release，不上传 release assets。
- 不使用 signing secrets。
- 不配置 Apple、Windows、updater 或 provider 凭据。
- 不启用 `tauri-plugin-updater`。
- 不修改 scanner、data、privacy、onboarding 或 runtime 行为。
- 不新增 Tauri filesystem、shell、process、SQL、autostart、global-shortcut、notification 或 updater plugin。

## 已验证 runner labels

根据 GitHub 官方 runner 文档，当前可用于标准 GitHub-hosted runner 的相关 labels 包括：

| 目标 | 推荐 label | 架构 | 用途 |
| --- | --- | --- | --- |
| macOS Apple Silicon | `macos-15` | arm64 | 默认 Apple Silicon 内部 `.app` / `.dmg` artifact。 |
| macOS Intel | `macos-15-intel` | Intel x64 | Intel `.app` / `.dmg` artifact。 |
| Windows x64 | `windows-2025` | x64 | Windows x64 installer artifact。 |

可选后续 labels：

- `macos-26`：arm64，适合在确认 Tauri/Rust/Xcode 工具链兼容后升级。
- `macos-26-intel`：Intel x64，适合在确认工具链兼容后升级。
- `windows-2022`：x64 fallback，用于 `windows-2025` 上出现工具链或 runner image 问题时降级。

不建议第一版使用 `macos-latest` 或 `windows-latest` 作为 release artifact runner，因为 `latest` 可能随 GitHub runner image 策略移动。打包产物需要可复现的 runner label。

## 初始 matrix 策略

后续 workflow 的第一版 matrix 建议为三个 job：

| job | `runs-on` | 目标产物 | 备注 |
| --- | --- | --- | --- |
| `macos-arm64` | `macos-15` | unsigned `.app` / `.dmg` | Apple Silicon 内部验证。 |
| `macos-intel` | `macos-15-intel` | unsigned `.app` / `.dmg` | Intel 内部验证。 |
| `windows-x64` | `windows-2025` | unsigned Windows installer | 需先补 Windows bundle target 和 WebView2 策略。 |

Windows job 不应在当前配置下直接宣称可交付，因为仓库尚未配置 Windows installer target。后续应先用单独文档或 PR 明确 NSIS/MSI 选择、WebView2 runtime 策略和 artifact 命名，再启用 Windows artifact。

## workflow_dispatch artifacts 先于 tag/release

先做 `workflow_dispatch` artifact workflow 的原因：

- 手动触发可以把打包从日常 CI、tag、release 和公开分发中隔离出来。
- unsigned 内部产物需要人工下载、安装、smoke 和记录限制，不应被误认为公开发布。
- workflow artifacts 可以在一次 run 结束后保留构建输出，适合内部验收。
- artifact 阶段不需要 Apple、Windows 或 updater signing secrets。
- artifact 阶段可以先验证 runner、pnpm、Rust、Tauri CLI、产物路径、命名和上传逻辑。
- tag/release workflow 会制造更强的发布语义，必须等签名、公证、stapling、code signing、release notes、校验和、回滚和权限模型成熟后再做。

只有当 unsigned artifacts 在三个目标上稳定、并且签名/公证/Windows code signing/updater 决策通过后，才应设计 tag 或 GitHub release workflow。

## 后续 workflow 草案边界

未来 workflow 应只做这些步骤：

1. Checkout。
2. 设置 pnpm 和 Node，使用仓库 `packageManager` 与 `engines.node` 约束。
3. 设置 Rust toolchain，匹配 `src-tauri/Cargo.toml` 的 `rust-version = 1.77.2` 或 repo 后续明确版本。
4. 安装依赖。
5. 运行 `git diff --check`、typecheck 和必要 build gate。
6. 按 matrix 运行对应 Tauri bundle 命令。
7. 收集明确路径下的 `.app`、`.dmg` 或 Windows installer。
8. 上传 artifacts，使用短 retention。

第一版 workflow 不应：

- 写入仓库。
- 创建 commit、tag、release 或 PR。
- 调用 Apple notarization、codesign、signtool 或 updater signing。
- 打印 secrets、环境变量值或证书信息。
- 读取真实用户 app data。
- 运行 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk scan。

## 产物命名建议

后续 artifact 名称应包含产品、版本、平台、架构和签名状态：

```text
AIOS-Desktop-0.1.0-macos-arm64-unsigned
AIOS-Desktop-0.1.0-macos-intel-unsigned
AIOS-Desktop-0.1.0-windows-x64-unsigned
```

产物内部文件名以 Tauri 实际输出为准，但上传前应在 job log 中列出相对路径、文件大小和 SHA-256 checksum。checksum 可以记录 hash 值；不得记录任何 secret、token、cookie、auth/session 或环境变量值。

## Windows WebView2 策略

Windows x64 job 进入前必须先选择 WebView2 runtime 策略：

- 默认候选：Evergreen bootstrapper，包体较小，但依赖目标机器联网获取 Runtime。
- 离线候选：offline installer，包体增大，但可以覆盖离线安装。
- 特殊候选：fixed runtime，包体更大且需要自行跟进 Runtime 安全更新。
- 不建议：skip，因为缺少 WebView2 Runtime 的机器上 app 不可用。

该选择应写入 `src-tauri/tauri.conf.json` 的 Windows bundle 配置，并在 Windows artifact 名称或 release notes 中说明。

## signing / notarization / updater 延后

以下内容不进入第一版 workflow：

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

后续 workflow 只能引用 secret 名称占位，例如 `${{ secrets.SOME_SIGNING_SECRET }}`，且必须等 signing 阶段批准后再引入。

## 后续可能变更文件

后续实施 workflow 时可能需要修改：

- `.github/workflows/aios-desktop-packaging.yml`：新增手动 artifact workflow。
- `package.json`：新增 `desktop:bundle:win` 或按平台拆分的 bundle scripts。
- `src-tauri/tauri.conf.json`：新增 Windows bundle target、Windows WebView2 runtime 策略和可审计的 bundle metadata。
- `docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md`：记录实际 matrix 验证结果。
- `docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md`：记录 artifact 下载、安装、smoke 和回滚步骤。

当前步骤不修改这些实现文件。

## 参考

- GitHub runner labels: <https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job>
- Manual workflow trigger: <https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow>
- Workflow artifacts: <https://docs.github.com/en/actions/tutorials/store-and-share-data>
- Tauri Windows installer: <https://v2.tauri.app/distribute/windows-installer/>
- Microsoft WebView2 distribution: <https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution>
