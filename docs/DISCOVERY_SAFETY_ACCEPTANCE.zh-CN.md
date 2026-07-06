# AIOS Desktop Phase 4A.1 发现扫描安全验收

文档类型：内部安全验收文档。

当前用户-facing 产品定义见 `docs/product/`。本文保留发现扫描安全验收历史，相关工程术语只用于内部边界说明。普通用户默认只应看到首页一键查找，开发者细节放在高级。

## 范围

本报告记录 AIOS Desktop Phase 4A.1 对既有 `Custom Directories`、`Intelligent Whole-Computer Discovery` 和 `Advanced Full-Disk Discovery` 的安全验收与小幅加固。

本次不是功能扩展；未新增扫描模式，未扩大扫描范围，未增加 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification 插件或前端文件系统权限。

## 加固项

- 普通 `Custom Directories` 来源创建现在只接受普通自选目录 profiles；`intelligent-discovery` 与 `advanced-full-disk` profiles 不能通过 custom-directory 请求路径使用。
- 前端扫描模板选择器在 Custom Directories 模式下只展示普通 profiles；已持久化的发现来源只读显示其发现 profile，不允许从普通来源控件改写。
- Rust skip summary 增加验收所需安全原因名：`depth_limit`、`unsupported_root`、`duplicate_source`。
- 到达 max depth 的目录现在记录为聚合 `depth_limit` 跳过；不暴露该目录路径。
- 高级确认文案和 Web/Vite fallback 文案提取为可测试常量，防止 UI 与测试漂移。

## 安全不变量检查

| 不变量 | 结论 |
| --- | --- |
| 启动、模块挂载、模式切换、profile 切换、来源添加、scope tab 切换不会自动扫描 | 通过。扫描只在 `handleStartBatch` / `handleStartDiscovery` 用户点击路径触发。 |
| Custom Directories 拒绝 root、home root、`/Users`、`/Volumes`、系统根、磁盘根 | 通过。Rust `rejects_broad_machine_roots`、`rejects_system_root_descendants`、`custom_directory_mode_never_accepts_advanced_broad_roots` 覆盖。 |
| Intelligent Discovery 候选根为 curated 用户工作区，不含系统根、磁盘根、`/Users`、`/Volumes` 或 home root 直接根 | 通过。Rust candidate resolver 测试覆盖，且 resolver 只生成 Desktop/Documents/Downloads/Developer/Work/Projects/Code/Workspace/AIOS 候选。 |
| Advanced Full-Disk Discovery 无显式确认不能启动，且不能通过 custom-directory profile 路径进入 | 通过。Rust `advanced_full_disk_rejects_without_confirmation`、`custom_directory_source_creation_rejects_discovery_profiles` 覆盖；前端 advanced start gating 覆盖。 |
| 高级确认为 Rust-side typed validation，不只依赖前端 checkbox | 通过。`start_scan_sources_batch` 对 `advanced-full-disk` source_kind 二次校验 `advanced_confirmation_accepted`。 |
| metadata-only：不读文件内容、不 hash 文件内容、不读 env/auth/session/provider key/token/cookie value | 通过。扫描使用 path/metadata/classification；Rust 和 resource_store no-content tests 覆盖 fixture 正文不进入结果或 SQLite。 |
| 不执行脚本、不启动 MCP、不写 AIOS DB 以外配置、不跟随 symlink | 通过。Tauri capability 仍只有 `core:default` 与 `dialog:allow-open`；Rust symlink test 覆盖不跟随。 |
| 进度事件和错误不发高频绝对路径，不暴露 secret-like value | 通过。progress payload 只含聚合计数；warning/error sample path 使用 redacted relative path 或空 path。 |
| skipped/error summary 安全分类 | 通过。覆盖 `permission_denied`、`protected_system_path`、`excluded_directory`、`metadata_error`、`entry_limit`、`depth_limit`、`cancelled`、`unsupported_root`、`duplicate_source`、`metadata_policy_skip`。 |
| 发现结果以 source_kind 和 mode metadata 持久化到 SQLite，动态模块可读取 | 通过。Rust fixture tests 覆盖 intelligent 与 advanced discovery 写入动态语料。 |
| reset/clear 只删除 AIOS 数据库记录，不删除用户文件 | 通过。resource_store tests 覆盖 clear/remove 语义。 |
| Tauri capabilities 最小化，无新增 broad FS/SQL permission | 通过。`src-tauri/capabilities/default.json` 未扩大。 |
| Rust commands typed、最小、server-side 校验模式/path/confirmation | 通过。新增 custom-only profile resolver；发现来源和 batch start 均在 Rust 侧校验 mode/confirmation。 |

## 验证命令

本次运行并通过：

```bash
git diff --check
cd src-tauri && cargo fmt --check
cd src-tauri && cargo check
cd src-tauri && cargo test
pnpm --filter @aios-control/frontend typecheck
pnpm --filter @aios-control/frontend test:unit
pnpm --filter @aios-control/frontend build
pnpm tauri --version
pnpm desktop:build
```

`pnpm --filter @aios-control/frontend build` 与 `pnpm desktop:build` 仍出现既有 Vite chunk size warning，但命令退出码为 0。

## Native smoke

执行：

```bash
src-tauri/target/release/aios-desktop
```

观察结果：

- release executable 启动成功，macOS 窗口标题为 `AIOS Desktop`。
- 扫描管理模块可见。
- `Custom Directories` 为默认模式。
- `Intelligent Whole-Computer Discovery` 和 `Advanced Full-Disk Discovery` mode cards 可见。
- 页面显示 `0 项可见`，未出现运行中扫描、来源创建或批次进度。
- macOS Accessibility 后续坐标点击被系统权限阻止；因此未在 native 中继续自动点击 Advanced checkbox。
- release 进程已停止，未留下后台 `aios-desktop` 进程。

## Web/Vite supplemental smoke

执行：

```bash
pnpm --filter @aios-control/frontend preview -- --port 4173
```

使用 Playwright wrapper 验证：

- 页面标题为 `AIOS Desktop`。
- 扫描管理模块可见。
- 三个扫描 mode cards 可见。
- Custom Directories 默认选中。
- Custom Directories profile selector 只显示普通自选目录 profiles，不显示 discovery profiles。
- Intelligent Discovery 模式切换后没有自动创建来源、没有自动启动扫描，Web fallback 下 `开始发现` 禁用。
- Advanced Full-Disk 模式显示显式 checkbox 文案；未勾选时 `开始发现` 禁用。
- 勾选 advanced checkbox 后，Web/Vite fallback 仍禁用 `开始发现`，不模拟真实扫描。
- 发现结果统计保持 0，动态语料边界和 reset copy 显示“清空只删除 AIOS 本地库记录，不删除用户文件”。
- Playwright console `warning` 级别检查：0 errors / 0 warnings。

## 明确未执行

- 未扫描开发者机器 root、home root、`/Users`、`/Volumes` 或系统盘。
- 未执行真实 full-disk / home / system-root scan。
- 未启动 MCP server。
- 未执行脚本。
- 未读取或打印 raw secrets、env values、auth/session/provider/cookie/token values。
- 未修改 provider/model/auth/session 文件。
- 未推送远端。

## 剩余边界

- Native Advanced checkbox 细节由 Rust/frontend 自动化测试和 Web/Vite smoke 覆盖；native 二次点击受 macOS Accessibility 权限限制。
- Advanced broad root 行为仅通过 Rust guard/unit tests 验证；本次不进行真实 broad root 扫描。
