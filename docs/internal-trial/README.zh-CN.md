# AIOS Desktop 可信内部试用文档包

本文档包只用于 AIOS Desktop P4B 可信内部试用交接，面向少量受信任的 Mac 同事。它不是公开发布说明。

## 当前基线

- Commit：`23e71f226cdd99ffc1973954f9d70ca0058c0474`
- 结论：GO，仅限可信内部 packaged Mac trial。
- 发布状态：不适合公开发布。
- 签名状态：当前内部构建为 unsigned；没有 Developer ID 签名、公证、stapling 或 updater-ready 分发能力，除非后续仓库证据另行说明。
- 更新状态：Tauri updater artifacts 当前关闭，不应承诺自动更新。

## 产品说明

AIOS Desktop 帮助用户查看、理解、整理和使用自己电脑上已经安装或配置的 AI Skills 和 MCP 工具。

- 结果保存在本机。
- 不上传查找结果。
- 不读取密钥值、环境变量值、token、密码、Cookie 或登录会话。
- 不启动 MCP 服务。
- 不连接 MCP endpoint。
- 不调用 MCP 工具。
- 当前 MCP 服务和工具信息是本机只读元数据；除非界面明确标注，否则不承诺 MCP 实时运行状态。

## 试用边界

- 仅限受信任同事。
- 仅限 Mac 本地测试。
- 只使用小型、明确、可控的测试文件夹或合成 fixture。
- 不要扫描包含密钥或隐私内容的目录。
- 不要扫描 home root、`/Users`、`/Volumes`、`/System`、`/Library`、整块磁盘、公司或客户私有工作区、凭据目录、浏览器 profile、生产仓库。
- 反馈中不要包含原始日志、密钥、token、环境变量值、私有路径、含敏感内容的截图或客户数据。

## 文档

- [内部试用指南](AIOS_DESKTOP_INTERNAL_TRIAL_GUIDE.zh-CN.md)
- [试用检查清单](AIOS_DESKTOP_TRIAL_CHECKLIST.zh-CN.md)
- [反馈模板](AIOS_DESKTOP_FEEDBACK_TEMPLATE.zh-CN.md)
- [合成 fixture 指南](AIOS_DESKTOP_SYNTHETIC_FIXTURE_GUIDE.zh-CN.md)
