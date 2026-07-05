# AIOS Desktop 0.1.0 原生 app-data 验收

## 结论

验收状态：有条件通过。

已验证真实 Tauri native app 在隔离 app data 下可以启动、创建 Rust-owned SQLite、保持空首次使用状态、重启后保持同一隔离数据库状态，并且 Legacy 示例与当前电脑扫描结果隔离。Fixture 扫描、SQLite 持久化、project/source scope 过滤、Inspector provenance 所需元数据和 reset 语义通过 Rust native scanner/store 测试验证，未使用 Web/Vite mock。

限制：本机 macOS UI 自动化无法稳定完成 WebView 滚动和系统目录选择器路径选择；因此未完成一次全 UI picker 的 fixture 选择与扫描。该限制不影响 scanner/store 的原生 Rust 验证结果，但发行前仍建议在可人工操作或可稳定 Accessibility 自动化的 macOS 会话中补做一次手动 picker smoke。

## 原生测试策略

- 先定位真实 AIOS app data，只读检查路径存在性，不修改真实数据。
- 使用 `open -n --env HOME=...` 启动 unsigned `.app`，把 Tauri `app_local_data_dir()` 解析到仓库内 ignored `src-tauri/target/` 临时 home。
- 用 bounded window screenshot 和 SQLite 聚合查询验证 native app 的空首次使用、Legacy 隔离和重启持久化。
- 用现有 Rust unit tests 验证同一 scanner/store 原生代码路径的 fixture scan、SQLite 持久化、动态语料 scope/filter/detail 和 reset 语义。
- 不运行 root/home/system/`/Users`/`/Volumes`/full-disk scan。

## App-data 隔离

真实 app data 路径只读定位结果：

```text
/Users/cc/Library/Application Support/com.ichichuang.aios.desktop
/Users/cc/Library/Application Support/com.ichichuang.aios.desktop/aios-resource-library.sqlite3
```

真实数据库检查期间保持未触碰；`stat` 观察到的 mtime 保持为 `Jul 5 11:50:38 2026`。

隔离 app data 路径：

```text
/Users/cc/.ai/AIOS/src-tauri/target/native-app-data-acceptance-20260705163118/home/Library/Application Support/com.ichichuang.aios.desktop/aios-resource-library.sqlite3
```

隔离策略使用仓库内 ignored `src-tauri/target/`，未创建未跟踪源码文件，未修改真实用户 app data。

## Fixture

使用 repo-local fixture：

```text
test-fixtures/custom-scan-basic
```

同时复制一份临时 fixture 到：

```text
src-tauri/target/native-app-data-acceptance-20260705163118/fixture
```

Fixture 文件清单为 11 个文件，覆盖 skill、prompt、MCP config、script、report、project pack、policy、validator、package manifest、unknown local resource 和 excluded `venv` 场景。`rg -il` token/secret/cookie/session/key 模式检查无匹配。复制 fixture 的 before/after SHA-256 ledger `diff` 无输出，确认 fixture 文件未被修改。

## 空首次使用证据

Native app 启动方式：

```bash
open -n --env HOME=/Users/cc/.ai/AIOS/src-tauri/target/native-app-data-acceptance-20260705163118/home "/Users/cc/.ai/AIOS/src-tauri/target/release/bundle/macos/AIOS Desktop.app"
```

隔离 SQLite 初始计数：

```text
scan_sources|0
scan_jobs|0
resources|0
project_scopes|0
resource_locations|0
```

UI 观察：

- native window title 为 `AIOS Desktop`。
- Dashboard 显示空资源库、动态资源 `0`、扫描来源 `0`、项目 scope `0`、暂无扫描记录。
- Dashboard 明确说明“这台机器还没有动态资源”和不会自动开始扫描。
- Scan Management 可达，显示 `0 项可见`，并说明所有扫描都是本地 `metadata-only`。
- Advanced Full-Disk Discovery 显示 `需要确认`，未确认时不允许启动。
- UI 未出现文件内容、raw secrets、env values、auth/session values、provider keys、cookies 或 token-like values。

## Fixture 扫描证据

全 UI picker 扫描未完成，原因见“macOS Accessibility 限制”。Fixture 扫描产品数据真值由 Rust native scanner/store tests 覆盖：

```bash
cd src-tauri && cargo test scans_fixture_with_classification_and_excludes
cd src-tauri && cargo test fixture_scan_results_persist_to_resource_store
cd src-tauri && cargo test corpus_queries_derive_project_source_scope_counts_and_details
```

结果均通过：

- `scans_fixture_with_classification_and_excludes` 验证 fixture 元数据分类覆盖 skill、prompt、MCP config、script、report-doc、project-pack、policy-governance、validator、package-manifest、unknown-local-resource，并验证 `venv` exclude。
- `fixture_scan_results_persist_to_resource_store` 验证扫描结果写入 SQLite，产生 1 个 source、1 个 job、resource count 与扫描结果一致，并且持久化路径为相对/redacted display path。
- `corpus_queries_derive_project_source_scope_counts_and_details` 验证动态语料 project/source scope counts、project map、source map、scope filtering、kind filtering 和 detail/provenance 元数据。

这些测试使用 Rust scanner/store 原生代码路径，不读取文件内容、不执行脚本、不启动 MCP，不依赖 Web/Vite mock。

## 重启持久化证据

流程：

1. 使用隔离 `HOME` 启动 `.app`。
2. 查询隔离 SQLite 初始计数。
3. 通过 bundle id 退出 app。
4. 使用同一隔离 `HOME` 重新启动 `.app`。
5. 再次查询同一 SQLite。

重启后计数仍为：

```text
scan_sources|0
scan_jobs|0
resources|0
project_scopes|0
resource_locations|0
```

说明 native app 使用同一隔离 app-data DB，且没有自动创建扫描来源、任务或资源。Fixture 资源的持久化与 project/source filtering 由上面的 Rust native persistence/scope tests 覆盖。

## Reset 证据

UI reset 未执行，原因是 WebView 滚动和 picker/按钮自动化不稳定；本阶段未对真实 app data 执行任何 reset。

Reset 语义通过 Rust native store tests 覆盖：

```bash
cd src-tauri && cargo test clear_library_removes_local_records_without_dropping_schema
cd src-tauri && cargo test adds_updates_and_removes_scan_sources_without_user_file_deletes
```

结果均通过：

- `clear_library_removes_local_records_without_dropping_schema` 验证 reset 只删除 AIOS SQLite records，不删除 schema。
- `adds_updates_and_removes_scan_sources_without_user_file_deletes` 验证来源删除只影响 store records，不删除用户文件。
- 复制 fixture 的 before/after SHA-256 ledger `diff` 无输出。

## 安全检查

- 未运行真实 root、home root、`/Users`、`/Volumes`、system root 或 full-disk scan。
- 未执行 MCP server、脚本、package script、provider/auth/session 操作。
- 未读取或打印 raw secrets、env values、auth/session values、provider keys、cookies 或 token-like values。
- 未新增 Tauri SQL/filesystem/shell/process/updater/autostart/global-shortcut/notification plugin。
- 未拓宽 frontend filesystem permission。
- Advanced discovery 前端保持显式确认门控；Rust command path 也要求 `advanced_confirmation_accepted`。
- Reset 文案在产品代码中为“清空只删除 AIOS 应用记录，不会删除用户文件。”
- 验证结束后 `pgrep -fl "aios-desktop|AIOS Desktop"` 无输出。

## macOS Accessibility 限制

本轮 native UI 自动化可以完成：

- 识别 `aios-desktop` native process 和 `AIOS Desktop` window。
- bounded window screenshot。
- 通过导航进入 Dashboard、Scan Management 和 Legacy。
- 观察空首次使用、Legacy 隔离和 Advanced confirmation gate。

但不能稳定完成：

- WebView 内部滚动到 `来源设置` 的 `添加目录` 控件。
- 系统目录选择器中的 fixture 路径选择。

主要表现：

- WebView body 不暴露为可搜索 Accessibility static text tree。
- raw executable 不可通过 bundle id 激活；改用 `.app` + `open --env HOME=...` 后激活改善，但 `view_image` / screenshot inspection 会使其他 app 抢占 foreground。
- 坐标点击在 macOS Spaces/foreground 切换后不稳定，存在命中其他前台 app 的风险，因此停止继续 UI picker 自动化。

## Exact commands run

```bash
git branch --show-current
git status --short
git log --oneline --decorate -20
git rev-parse HEAD
git fetch origin main
git status -sb
```

```bash
find test-fixtures/custom-scan-basic -maxdepth 3 -type f -print | sort
rg -il "(api[_-]?key|secret|token|password|cookie|session|BEGIN (RSA|OPENSSH|PRIVATE) KEY)" src-tauri/target/native-app-data-acceptance-20260705163118/fixture
find src-tauri/target/native-app-data-acceptance-20260705163118/fixture -type f -exec shasum -a 256 {} + | sort -k 2 > src-tauri/target/native-app-data-acceptance-20260705163118/evidence/fixture.before.sha256
```

```bash
open -n --env HOME=/Users/cc/.ai/AIOS/src-tauri/target/native-app-data-acceptance-20260705163118/home "/Users/cc/.ai/AIOS/src-tauri/target/release/bundle/macos/AIOS Desktop.app"
sqlite3 "/Users/cc/.ai/AIOS/src-tauri/target/native-app-data-acceptance-20260705163118/home/Library/Application Support/com.ichichuang.aios.desktop/aios-resource-library.sqlite3" "SELECT 'scan_sources', COUNT(*) FROM scan_sources UNION ALL SELECT 'scan_jobs', COUNT(*) FROM scan_jobs UNION ALL SELECT 'resources', COUNT(*) FROM resources UNION ALL SELECT 'project_scopes', COUNT(*) FROM project_scopes UNION ALL SELECT 'resource_locations', COUNT(*) FROM resource_locations;"
osascript -e 'tell application id "com.ichichuang.aios.desktop" to quit'
```

```bash
cd src-tauri && cargo test scans_fixture_with_classification_and_excludes
cd src-tauri && cargo test fixture_scan_results_persist_to_resource_store
cd src-tauri && cargo test corpus_queries_derive_project_source_scope_counts_and_details
cd src-tauri && cargo test clear_library_removes_local_records_without_dropping_schema
cd src-tauri && cargo test adds_updates_and_removes_scan_sources_without_user_file_deletes
```

```bash
find src-tauri/target/native-app-data-acceptance-20260705163118/fixture -type f -exec shasum -a 256 {} + | sort -k 2 > src-tauri/target/native-app-data-acceptance-20260705163118/evidence/fixture.after.sha256
diff -u src-tauri/target/native-app-data-acceptance-20260705163118/evidence/fixture.before.sha256 src-tauri/target/native-app-data-acceptance-20260705163118/evidence/fixture.after.sha256
pgrep -fl "aios-desktop|AIOS Desktop"
```

## 剩余风险

- 仍需在可稳定控制 macOS Accessibility 或由人工操作的环境中补做一次完整 native picker fixture scan smoke。
- 本轮 fixture scan/persistence/reset 证据来自 Rust native scanner/store tests，而不是全 UI picker end-to-end。
- 本轮 native app restart persistence 在空 app-data DB 上验证；非空 fixture persistence 由 Rust store tests 验证。
- 当前仍为 unsigned 本地 `.app` / `.dmg` 验证，不包含 signing、notarization、stapling、updater 或公开分发。
