# AIOS Desktop 本地发行准备

## 范围

本文件记录 Phase 4C 的本地 installable-product 验证准备。此阶段只覆盖 unsigned macOS `.app` / `.dmg` dry run、产品元数据、bundle 命令和发行准备说明。

本阶段不配置公开分发、代码签名、公证、自动更新、发布源或 updater UI。

## Bundle 元数据

| 项目 | 当前值 |
| --- | --- |
| Product name | `AIOS Desktop` |
| Window title | `AIOS Desktop` |
| Bundle identifier | `com.ichichuang.aios.desktop` |
| Version | `0.1.0` |
| Rust package | `aios-desktop` |
| Bundle targets | `app`, `dmg` |
| Category | `DeveloperTool` |
| Icon references | `src-tauri/icons/icon.png`, `src-tauri/icons/icon.icns` |

版本号在根 `package.json`、`frontend/package.json`、`src-tauri/Cargo.toml` 和 `src-tauri/tauri.conf.json` 中保持 `0.1.0`。

## 本地命令

```bash
pnpm desktop:build
pnpm desktop:bundle:mac
```

`pnpm desktop:build` 只构建 release executable，并通过 `--no-bundle` 保持 Phase 1-4B 的可执行产物验证路径。

`pnpm desktop:bundle:mac` 使用 `pnpm tauri build --bundles app,dmg --no-sign`，只用于本机 unsigned packaging dry run。

## 预期产物

```text
src-tauri/target/release/aios-desktop
src-tauri/target/release/bundle/macos/AIOS Desktop.app
src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_*.dmg
```

具体 DMG 文件名包含当前 macOS 架构或 Tauri bundler 生成的目标后缀，以实际 dry run 输出为准。

## 当前状态

- 2026-07-05 本地 unsigned macOS `.app` / `.dmg` dry run 已通过。
- Bundle 配置已启用本地 macOS `.app` / `.dmg` 目标。
- Bundle metadata 使用产品名、稳定 bundle id、显式版本、DeveloperTool 分类和本地优先说明。
- Updater artifact 生成保持关闭：`createUpdaterArtifacts = false`。
- 未配置 signing identity、Apple 账号、notarization、stapling、updater pubkey、updater endpoint 或公开发布渠道。
- `pnpm desktop:bundle:mac` 使用 `--no-sign`；产物没有 Developer ID / TeamIdentifier，只适合本机验证。
- Tauri capability 仍只包含既有 `core:default` 与 `dialog:allow-open`。
- 未新增 Tauri SQL、filesystem、shell、process、updater、autostart、global-shortcut 或 notification 插件。
- Rust-owned SQLite 数据库仍由 Tauri `app_local_data_dir()` 创建和管理，不放入仓库或 bundle，也不把用户数据打包进 app。

## 本轮验证结果

通过命令：

- `git diff --check`
- `cd src-tauri && cargo check`
- `cd src-tauri && cargo test`
- `pnpm --filter @aios-control/frontend typecheck`
- `pnpm --filter @aios-control/frontend test:unit`
- `pnpm --filter @aios-control/frontend build`
- `pnpm tauri --version`
- `pnpm desktop:build`
- `pnpm desktop:bundle:mac`

未运行 `cargo fmt --check`，因为本阶段未修改 Rust source 文件。

实际产物：

```text
src-tauri/target/release/aios-desktop
src-tauri/target/release/bundle/macos/AIOS Desktop.app
src-tauri/target/release/bundle/dmg/AIOS Desktop_0.1.0_aarch64.dmg
```

Bounded native smoke 结果：

- `AIOS Desktop` 窗口可启动。
- Dashboard 首次/空库引导和无自动扫描边界可见。
- 扫描管理可打开，显示 `0 项可见`，未出现自动扫描或运行中批次。
- Advanced Full-Disk Discovery 仍显示显式确认边界和 `需要确认`。
- Skills 动态 / fallback 模块可切换加载。
- 未运行真实 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk 扫描。
- 未发现文件内容泄露；UI 仍只显示 resource metadata 和安全说明。
- 进程输出仅出现既有 macOS IMK wakeup warning，未出现 Rust panic 或前端 error。
- 验证结束后未留下 `aios-desktop` 后台进程。

## 扫描安全边界

Phase 4C 不改变 scanner 行为、动态语料行为、onboarding 行为、隐私控制或 full-disk safety gates。

保持不变的约束：

- AIOS Desktop 首次启动不自动扫描。
- 扫描只在“扫描管理”中由用户显式启动。
- Advanced Full-Disk Discovery 仍需要前端确认和 Rust-side typed validation。
- 不读取文件内容，不执行脚本，不启动 MCP，不跟随 symlink。
- 不保存 raw secrets、token values、auth/session values、provider keys、cookies 或 env values。
- 清空本地库只删除 AIOS app SQLite 记录，不删除用户文件。

本阶段没有运行真实 root、home root、`/Users`、`/Volumes`、系统盘或 full-disk 扫描。

## 已知事项

- `pnpm --filter @aios-control/frontend build` 和 Tauri build 仍可能出现既有 Vite large chunk warning；该警告不表示 bundle dry run 失败。
- 当前产物只适合本机 unsigned 验证，不适合公开分发。

## 后续签名分发步骤

进入 signed distribution 前需要单独评审：

- macOS Developer ID signing identity 和证书管理。
- Hardened Runtime、entitlements、notarization、stapling 和 Gatekeeper 验证。
- DMG/app 版本发布流程、校验和、回滚策略和 release notes。
- Updater 需求、签名 key、发布源、integrity 校验和 UI 入口。
- 是否仍能保持最小 Tauri capabilities，不引入宽 filesystem/shell/process/SQL 权限。
