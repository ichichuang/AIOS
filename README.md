# AIOS Desktop

AIOS Desktop 是一个简单的本地桌面应用，用来帮助你看清这台电脑上有哪些 AI 技能和 MCP 工具。

它要回答六个问题：

- 我有多少 AI 技能？
- 每个技能能做什么？
- 它来自哪里？
- 哪个 AI 工具可以使用它？
- 我该怎么使用它？
- 哪些技能或 MCP 工具需要处理？

MCP 是一种让 AI 应用连接外部工具的方式。AIOS Desktop 只显示你电脑上已经配置的 MCP 服务和工具，不会直接运行它们。

当前产品规划以 [产品文档集](docs/product/README.zh-CN.md) 为准。旧的工程、发行和验收文档只作为内部参考，不定义普通用户看到的主功能。

## 主要页面

目标主导航只有四项：

| 页面 | 用途 |
| --- | --- |
| 首页 | 查看技能数量、MCP 数量、需要处理的项目和一键查找入口。 |
| 技能 | 查看每个技能的用途、来源、可用工具、使用方式和状态。 |
| MCP | 查看 MCP 服务和工具、配置来源、状态、问题和人工处理建议。 |
| 高级 | 给开发者查看来源分组、手动选择文件夹、问题摘要和本地数据控制。 |

脚本、报告、策略、检查器、旧示例和原始查找诊断不是普通用户的主页面。只有当它们能帮助理解技能或 MCP 时，才可以放在“高级”里。

## 首次使用

1. 打开应用后，首页应显示空状态，不会自动查找。
2. 点击“开始查找”，应用会说明将查找 AI 技能和 MCP 工具的基本信息。
3. 查找结果只保存在这台电脑上。
4. 查找结束后，首页显示技能数量、MCP 服务数量、MCP 工具数量和需要处理的项目数量。
5. 如果没有找到结果，可以手动选择一个明确的项目或工具文件夹。

## 隐私与安全

- AIOS Desktop 不上传查找结果。
- AIOS Desktop 不读取密钥、令牌、密码、浏览器 Cookie、登录会话或环境变量的值。
- AIOS Desktop 不执行脚本。
- AIOS Desktop 不启动 MCP 服务，也不调用 MCP 工具。
- AIOS Desktop 不修改技能文件、MCP 配置、系统设置或用户文件。
- 清空本地记录只删除 AIOS Desktop 自己保存的结果，不删除你的文件。

## 内部测试版下载与安装

内部测试版通过本仓库的 [GitHub Releases](../../releases) 分发。请选择最新的内部 prerelease，并按平台下载对应 asset，不要下载 source code 压缩包来安装桌面应用。

| 平台 | 选择的 asset |
| --- | --- |
| Apple Silicon Mac | `AIOS.Desktop_0.1.0_aarch64.dmg` |
| Intel Mac | `AIOS.Desktop_0.1.0_x64.dmg` |
| Windows x64 常规安装 | `AIOS.Desktop_0.1.0_x64-setup.exe` |
| Windows x64 MSI 用户 | `AIOS.Desktop_0.1.0_x64_en-US.msi` |

当前构建是 unsigned internal testing build，不是公开签名发行版。macOS Gatekeeper、Windows SmartScreen、浏览器下载保护或企业安全策略可能提示风险，甚至阻止安装。遇到企业策略拦截时，请按公司内部测试流程处理，不要绕过组织安全要求。

Tauri updater 当前未启用，应用不会自动更新。需要测试新版本时，请重新进入 GitHub Releases 下载新的内部测试版。

## 问题反馈

反馈问题时，请尽量提供：

- 操作系统和 CPU 架构。
- 下载的 Release / tag 和 asset 文件名。
- 问题发生的页面或操作路径。
- 预期结果、实际结果和可复现步骤。
- 关键错误摘要；如需日志，请先脱敏。

不要在 issue、聊天、截图、日志或文档中粘贴密钥、令牌、密码、Cookie、登录会话、环境变量值、账号值、证书、签名 key、私有路径或未脱敏的客户/项目名称。

## 开发者入口

以下内容仅面向开发者，不定义普通用户主功能。

本仓库是 AIOS Desktop 的 Tauri v2 桌面应用工程：

- 前端：React + TypeScript + Vite，位于 `frontend/`。
- 本地查找与整理逻辑：TypeScript / Rust，位于 `server/` 和 `src-tauri/`。
- 桌面壳：Tauri v2 / Rust，位于 `src-tauri/`。
- 包管理器：`pnpm@10.28.2`。
- Node.js：`>=22`。
- 当前版本：`0.1.0`。
- Bundle identifier：`com.ichichuang.aios.desktop`。
- Rust binary：`aios-desktop`。

常用本地命令：

```bash
pnpm install
pnpm inventory:generate
pnpm typecheck
pnpm build
pnpm --filter @aios-control/frontend dev
pnpm desktop:dev
pnpm desktop:build
pnpm desktop:bundle:mac
```

更深入的内部文档：

- [产品文档集](docs/product/README.zh-CN.md)
- [文档地图](docs/product/10-documentation-map.zh-CN.md)
- [Desktop 架构](docs/DESKTOP_ARCHITECTURE.zh-CN.md)
- [扫描与隐私策略](docs/SCANNER_POLICY.zh-CN.md)
- [Safety](docs/SAFETY.zh-CN.md)
- [Roadmap](docs/ROADMAP.zh-CN.md)
- [Desktop 发行准备](docs/DESKTOP_RELEASE_READINESS.zh-CN.md)
- [内部发行 Playbook](docs/INTERNAL_RELEASE_PLAYBOOK.zh-CN.md)
- [GitHub Actions 打包计划](docs/GITHUB_ACTIONS_PACKAGING_PLAN.zh-CN.md)
- [Windows / macOS 打包兼容性审计](docs/WIN_MAC_PACKAGING_COMPATIBILITY_AUDIT.zh-CN.md)
