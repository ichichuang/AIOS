# 界面文案与术语指南

## 文案原则

- 默认写给普通用户。
- 先说结果，再说原因。
- 使用自然中文，不把工程缩写放在主标题里。
- 技术细节放到“高级”或开发者补充。
- 错误文案要告诉用户能做什么，不能只显示内部错误。

## 推荐名称

| 概念 | 推荐中文 |
| --- | --- |
| Dashboard | 首页 |
| Skills | 技能 |
| Skill Library | 技能库 |
| MCP | MCP |
| MCP Library | MCP 工具库 |
| Advanced | 高级 |
| Scan | 查找 |
| Scan Result | 查找结果 |
| Source | 来源 |
| Config Source | 配置来源 |
| Global Source | 全局来源 |
| Project Source | 项目来源 |
| Custom Directory | 手动选择的文件夹 |
| Health Status | 状态 |
| Missing Dependency | 缺少依赖 |
| Duplicate | 重复 |
| Broken | 已损坏 |
| Unknown | 来源不明 |
| Needs Attention | 需要处理 |

## 必须解释的词

MCP 可以保留英文缩写，但第一次出现时必须解释：

MCP 是一种让 AI 应用连接外部工具的方式。在 AIOS Desktop 里，用户只需要知道：这里列出这台电脑上已经配置的 MCP 服务和它们提供的工具。

技能必须解释为：

技能是一段给 AI 使用的说明和流程，帮助 AI 完成某类任务。

## 禁用或替换的说法

| 不要写 | 改成 |
| --- | --- |
| resource corpus | 本机结果 |
| metadata-only corpus | 只保存基本信息的本机结果 |
| governance | 管理和安全说明 |
| validators | 检查结果 |
| policies | 安全说明 |
| scan scope | 查找位置 |
| full-disk discovery | 高级全电脑查找 |
| SQLite state | 应用自己的本地记录 |
| runtime view | 当前状态 |
| registry | 来源列表 |
| project pack | 项目里的技能和工具 |
| capability domain | 能力类型 |
| raw scan diagnostics | 查找问题摘要 |
| internal scanner/debug concepts | 开发者诊断信息 |

这些词只允许在本指南的禁用表或开发者附录中出现，不能作为普通用户界面文案。

## 空状态文案

首页空状态：

- 标题：还没有查找这台电脑上的 AI 技能
- 说明：点击开始后，AIOS Desktop 会查找本机 AI 技能和 MCP 工具的基本信息。
- 主按钮：开始查找
- 次按钮：手动选择文件夹

技能空状态：

- 标题：还没有找到 AI 技能
- 说明：开始查找后，这里会显示技能名称、用途、来源和使用方法。

MCP 空状态：

- 标题：还没有找到 MCP 工具
- 说明：开始查找后，这里会显示本机已配置的 MCP 服务和工具。

搜索无结果：

- 标题：没有匹配结果
- 说明：换一个关键词，或清除筛选后再试。

## 查找结果文案

成功：

- 已找到 {skillCount} 个 AI 技能、{mcpServerCount} 个 MCP 服务、{mcpToolCount} 个 MCP 工具。

技能可用工具：

- 可在 {toolName} 中使用。

技能使用方式：

- 使用方式：{usageText}

部分完成：

- 已完成查找，但有 {attentionCount} 项需要处理。

没有找到：

- 没有找到 AI 技能或 MCP 工具。你可以手动选择一个文件夹再试。

被跳过：

- 有些位置无法读取，已跳过。你的文件没有被修改。

## 隐私文案

推荐短文案：

- 查找结果只保存在这台电脑上。
- AIOS Desktop 不上传你的查找结果。
- AIOS Desktop 不读取密钥、令牌、密码、浏览器 Cookie 或登录会话。
- AIOS Desktop 不执行脚本，也不启动 MCP 服务。
- 清空本地记录只会删除 AIOS Desktop 自己保存的结果，不会删除你的文件。

## 错误文案

权限不足：

- 这个位置无法读取。你可以选择更具体的项目文件夹，或跳过它。

缺少依赖：

- 这个 MCP 服务可能需要先安装依赖。请查看它的来源说明，确认本机是否已安装所需工具。

来源已不存在：

- 这个来源找不到了。文件夹可能被移动或删除。

重复：

- 找到了多个看起来相同的项目。你可以保留一个常用来源，其余放到高级里查看。

未知：

- AIOS Desktop 还不能判断这个项目的用途。它会先显示在“来源不明”里。
