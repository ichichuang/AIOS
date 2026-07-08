# AIOS Desktop 内部试用构建记录

本文记录一次 P4C 本地内部试用 packaged Mac build。该记录只用于少量可信 Mac 同事的内部试用交接，不是公开发行说明。

## 基线

- 分支：`main`
- 基线 commit：`61edc736f93c96df1963aeacdd2e0bdda9deb27a`
- 构建时间：`2026-07-07 21:40:17 +0800`
- 包管理器：`pnpm@10.28.2`
- 打包命令：`pnpm desktop:bundle:mac`
- 实际 Tauri 打包参数：`tauri build --bundles app,dmg --no-sign`

## 产物与校验和

| 产物 | 路径 | SHA256 |
| --- | --- | --- |
| DMG | `src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_aarch64.dmg` | `18605e747f5f412aaea6fd5b4553d9c49ababb4496232a367d0153e8e85ede87` |
| `.app` 本地 zip | `src-tauri/target/release/bundle/macos/AIOS Desktop_0.1.0_aarch64.app.zip` | `4755a668f831f2fb0a9d974ce7ab68715813e883edcd927136b01746e39ab6c8` |
| `.app` bundle | `src-tauri/target/release/bundle/macos/AIOS Desktop.app` | 未直接计算；使用上方 `.app` zip 作为交接校验产物。 |

本地 zip 使用 `ditto -c -k --keepParent` 从 `.app` bundle 创建。上述产物都位于 `src-tauri/target/` 下，该目录由仓库 `.gitignore` 忽略，不应提交。

## 验证结果

| 命令 | 结果 |
| --- | --- |
| `git diff --check` | 通过 |
| `cd src-tauri && cargo fmt --check` | 通过 |
| `cd src-tauri && cargo check` | 通过 |
| `cd src-tauri && cargo test` | 通过，70 个 Rust 单元测试通过 |
| `pnpm --filter @aios-control/frontend typecheck` | 通过 |
| `pnpm --filter @aios-control/frontend test:unit` | 通过 |
| `pnpm --filter @aios-control/frontend build` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 通过 |
| `pnpm desktop:bundle:mac` | 通过，生成 `.app` 与 DMG |

`pnpm build` 重新生成过 `frontend/public/aios-inventory.snapshot.json`，该生成漂移已按 P4C 要求恢复到基线状态。未保留 `frontend/public/aios-inventory.snapshot.json` 或 `frontend/dist/aios-inventory.snapshot.json` 的变更。

## 打包结论

- 结论：可作为可信内部 Mac trial 的本地 unsigned packaged build 交接。
- 适用范围：只给受信任的内部 Mac 同事试用。
- 不适用范围：不是公开发布，不创建 GitHub Release、tag、PR 或 issue，不上传产物。
- 签名状态：本次命令包含 `--no-sign`，因此未签名。
- 公证状态：未公证，未 stapling。
- 更新状态：`src-tauri/tauri.conf.json` 中 `createUpdaterArtifacts` 为 `false`，本次不具备 updater-ready 分发能力。

## 已知限制

- unsigned、未公证、无 updater-ready 分发能力，不适合公开分发。
- MCP 服务和工具信息只作为静态/未验证元数据，不代表实时 MCP 运行状态。
- 本次记录只覆盖本地 packaged build、校验和与既有验证命令结果。
- 本地资源库与查找结果只保存在本机；AIOS Desktop 只保存路径、大小、时间、安全分类等元数据，不保存文件内容、secret、env value、auth/session 或 cookie。
- 本次不运行真实扫描，不扫描 home root、`/Users`、`/Volumes`、`/System`、`/Library`、整块磁盘、生产仓库、凭据目录或浏览器 profile。
- 本次不启动 MCP 服务、不连接 endpoint、不调用 MCP 工具、不上传数据。
- 本次未执行新的 packaged no-scan launch smoke；P4A packaged synthetic smoke 作为功能 smoke 基线，P4C 只重新构建并记录 checksum。

## 交接说明

只向可信内部同事共享 DMG 与对应 SHA256。交接时同时发送：

- `docs/internal-trial/AIOS_DESKTOP_INTERNAL_TRIAL_GUIDE.zh-CN.md`
- `docs/internal-trial/AIOS_DESKTOP_TRIAL_CHECKLIST.zh-CN.md`
- `docs/internal-trial/AIOS_DESKTOP_FEEDBACK_TEMPLATE.zh-CN.md`
- `docs/internal-trial/AIOS_DESKTOP_SYNTHETIC_FIXTURE_GUIDE.zh-CN.md`

试用人员应使用小型、明确、可控的合成 fixture 或安全测试项目。不要扫描 broad folders、真实 home、整块磁盘、公司或客户私有工作区、生产仓库、凭据目录或浏览器 profile。

## 隐私反馈警告

反馈中不得包含密钥、token、密码、Cookie、登录会话、环境变量值、原始日志、私有路径、客户数据、未脱敏截图或其他敏感内容。截图和日志如需提供，必须先人工审阅并脱敏。
