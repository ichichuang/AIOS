# AIOS Desktop Tauri 桌面壳冒烟验证

文档类型：内部验收文档。

当前用户-facing 产品定义见 `docs/product/`。本文保留桌面壳冒烟验证记录，不定义当前普通用户主功能。

## 范围

本报告记录 Phase 1 Tauri v2 桌面壳的本地冒烟验证。验证范围仅覆盖已提交的桌面壳、现有 Material Console 前端集成、Tauri CLI、Rust 编译和 release 可执行产物。

本次验证未添加扫描器、SQLite、文件系统插件、Shell 插件、Process 插件、Updater、Autostart、Global Shortcut、Notification、SQL 插件、MCP 执行或 Rust command。

## 静态验证

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `git diff --check` | 通过 | 无 whitespace error |
| `pnpm --filter @aios-control/frontend typecheck` | 通过 | TypeScript typecheck 通过 |
| `pnpm --filter @aios-control/frontend build` | 通过 | Vite build 通过；仍有大 chunk 警告 |
| `pnpm tauri --version` | 通过 | `tauri-cli 2.11.4` |
| `cargo check` in `src-tauri` | 通过 | `aios-desktop` dev profile 检查通过 |

## 桌面 dev 冒烟

命令：

```bash
pnpm desktop:dev
```

结果：未能启动窗口。

原因：`beforeDevCommand` 启动 Vite 时发现 `127.0.0.1:5173` 已被占用，Tauri dev 以非零状态退出。关键错误为：

```text
Error: Port 5173 is already in use
The "beforeDevCommand" terminated with a non-zero status code.
```

端口占用检查显示已有 repo-local Vite 进程监听该端口：

```text
node /Users/cc/.ai/AIOS/frontend/node_modules/.bin/../vite/bin/vite.js --host 127.0.0.1
```

该进程不是本次 bounded smoke wrapper 启动的进程，因此未被强制终止。bounded wrapper 清理了本次启动的 Tauri dev 进程树，没有留下由本次 smoke 创建的后台进程。

## 桌面 build 冒烟

命令：

```bash
pnpm desktop:build
```

结果：通过。

输出：

```text
Built application at: /Users/cc/.ai/AIOS/src-tauri/target/release/aios-desktop
```

release executable 存在且可执行：

```text
src-tauri/target/release/aios-desktop
```

当前 `src-tauri/tauri.conf.json` 保持：

```json
"bundle": {
  "active": false
}
```

因此本次 build 只验证 release executable，不执行分发打包、签名、公证或 updater 流程。

## Release executable 运行冒烟

命令：

```bash
src-tauri/target/release/aios-desktop
```

结果：通过。

观察：

- release executable 在 bounded wrapper 中启动并保持运行 12 秒。
- 未观察到 Rust panic、frontend error 或立即退出。
- wrapper 发送 `TERM` 后进程退出，未留下本次启动的后台进程。
- 日志中出现 macOS 输入法框架 IMK wakeup warning，不影响本次只读桌面壳启动判断。

本项验证的是 release executable 运行稳定性，不替代 `pnpm desktop:dev` 的 dev-mode 窗口验证。

## 结论

- Phase 1 Tauri shell 的静态验证和 release build 验证通过。
- Desktop dev 窗口启动尚未通过，当前阻塞项是本地端口 `5173` 已被现有 repo-local Vite 进程占用。
- Release executable 可启动并在短观察窗口内保持运行。
- 未发现本次验证引入扫描器、SQLite、额外 Tauri 插件、MCP 执行、Rust command 或 Tauri permission 变化。

## 后续处理

- 释放或复用当前 `5173` Vite 进程后，重新运行 `pnpm desktop:dev` 进行窗口级冒烟。
- 维持 `bundle.active = false`，直到进入明确的分发、签名和公证阶段。
