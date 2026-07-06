# AIOS Desktop 0.1.0 产品体验验收

文档类型：历史验收文档。

当前产品验收标准见 `docs/product/09-product-acceptance-criteria.zh-CN.md`。本文保留 0.1.0 阶段的旧模块和工程术语作为历史证据，不定义当前普通用户主导航。当前目标主导航是：首页、技能、MCP、高级。

## 范围

本文件记录 AIOS Desktop Phase 4C.4 产品 UX acceptance gate。目标是确认首次使用、动态本地资源库、项目 / 来源 scope、Legacy 示例隔离和扫描安全在用户界面中可理解、可验证、且不扩大 scanner 或 Tauri 权限边界。

本阶段不是功能扩展，不新增扫描模式，不移动 Legacy snapshot，不把 demo 数据写入 SQLite，不自动清空真实用户 app data。

## 空首次使用验收

验收状态：通过代码路径、frontend mocked empty corpus 和 UI smoke 验证。

- Web/Vite 非 Tauri 环境下，`getActiveResourceCorpusSummary()`、`listResourceCorpusScopes()`、`listResourcesByScope()`、Project Resource Map 和 Source Directory Map 均返回空降级状态。
- Dashboard 显示“尚未扫描任何目录”，说明 AIOS 尚未扫描这台机器，启动、搜索和切换模块不会自动扫描。
- Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、顶部可见数量和导航计数在空动态语料下保持 `0`。
- Scan Management 可从 Dashboard CTA、导航和搜索模块切换进入；进入后不会自动添加来源或启动扫描。
- Legacy 示例数据不参与全局、项目、来源和默认模块计数。
- 隐私与数据控制文案可见，并明确说明“清空只删除 AIOS 应用记录，不会删除用户文件”。

## 动态项目 / 来源语料验收

验收状态：通过 frontend two-project mocked corpus tests 和 bounded UI smoke 验证。

- 测试语料包含两个项目 / 来源示例：`Project Alpha` / `alpha-workspace` 和 `Project Beta` / `beta-tooling`。
- 两个项目包含不同资源类型：技能、提示词、脚本、MCP metadata、策略、验证器和报告元数据。
- Dashboard 的 Local Resource Library、Project Resource Map 和 Scan Source Directory Map 展示动态资源数、来源数、项目 scope 数、最近扫描状态、跳过 / 错误计数和 metadata-only 边界。
- 选择 Project scope 后，模块数据只来自对应项目；选择 Source scope 后，模块数据只来自对应扫描来源目录。
- Inspector provenance 显示数据来源类型、项目 / scope、扫描来源、授权根目录、相对路径、profile、最近扫描任务 / 状态和 metadata-only 边界。
- Dynamic prompt metadata 不再被归入 Legacy UI group 或 Legacy 导航计数。

## Legacy 隔离验收

验收状态：通过 frontend count tests 和 UI smoke 验证。

- Legacy 视图可通过导航进入。
- Legacy 视图明确标注为“内置示例/兼容快照”，不代表当前电脑扫描结果。
- Legacy snapshot 不写入 SQLite，不作为空动态语料 fallback。
- Legacy 资源只在 Legacy context 展示；全局、项目、来源、未归类 scope 和默认模块计数不包含 Legacy。
- 即使正在查看 Legacy，导航和顶部计数仍按动态本地资源库语义保持，不把示例数据混入当前机器资源数量。

## 扫描安全验收

验收状态：通过代码路径、Rust tests 和 UI smoke 验证；本轮未运行真实 root/home/system/full-disk scan。

- Scan Management 是唯一可启动扫描的产品入口。
- Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、Legacy 和 Inspector 只读取持久化元数据，不启动扫描。
- Custom Directories 添加来源不会自动扫描；用户必须选择已启用来源并点击“扫描所选”。
- Intelligent Discovery 只在用户点击开始后解析候选来源。
- Advanced Full-Disk Discovery 前端按钮受显式确认 checkbox 门控，Rust command path 同样要求 `advanced_confirmation_accepted`。
- UI 和测试输出不展示文件内容、raw secrets、env values、auth/session values、provider keys、cookies 或 token-like values。
- 未新增 Tauri SQL、filesystem、shell、process、updater、autostart、global-shortcut 或 notification 插件。

## Native / Web smoke 限制

- Phase 4C.6 原生 app-data 验收记录见 `docs/NATIVE_APP_DATA_ACCEPTANCE_0.1.0.zh-CN.md`。该验收已验证隔离 app data 启动、空首次使用、Legacy 隔离、重启持久化和 Rust native fixture scan/store/reset 路径；完整 native picker fixture scan 仍受当前 macOS Accessibility / foreground 自动化限制。
- Web/Vite smoke 使用 mocked/empty Tauri fallback 和前端测试状态验证，不连接真实用户 app data。
- Native smoke 只允许使用临时 app data 或既有 bounded fixture 状态；不得删除真实用户 app data。
- 本轮验收不执行 `/`、home root、`/Users`、`/Volumes`、系统盘或真实 full-disk 扫描。
- 由于当前环境的窗口截图能力可能受 macOS 权限影响，native smoke 以页面 title、DOM 文案、交互状态、控制禁用状态、console health 和进程清理为主要证据；截图仅作为可用时的补充证据。

## 剩余 UX 风险

- Policies 和 Validators 在动态资源计数为 `0` 时仍展示静态产品 guardrail / baseline check 区块；这些不是扫描资源，但后续可进一步强化“静态产品基线”的标签，降低首次用户误读风险。
- Prompt 类动态资源当前只进入 Dashboard 全局动态计数，没有独立 Prompts 模块；如果后续把提示词作为一等资源，需要单独设计模块归属和导航计数。
- Web fallback 无法代表真实 Tauri SQLite app data；最终发行前仍需要在临时 app data 下重复 native smoke。
- 当前产品仍为本地 unsigned 验证状态，签名、公证、stapling、updater 和公开分发仍是 future work。
