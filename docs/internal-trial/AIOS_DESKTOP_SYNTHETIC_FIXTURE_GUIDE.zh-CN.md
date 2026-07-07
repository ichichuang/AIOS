# AIOS Desktop 合成 Fixture 指南

本指南用于创建安全的小型测试文件夹，帮助试用人员验证 AIOS Desktop 的本机只读元数据行为。不要把 fixture 放在 home root、生产仓库、凭据目录或包含隐私内容的位置。

## 原则

- 只使用假名称。
- 不写真实密钥、真实 token、真实账号、真实 hostname 或真实私有路径。
- 不创建可执行脚本。
- 不鼓励扫描 broad folders。
- fixture 只用于验证展示、脱敏和静态 MCP 元数据，不用于验证真实 MCP 运行状态。

## 建议结构

```text
aios-safe-fixture/
  skills/
    safe-note-summarizer/
      SKILL.md
    unsafe-fake-secret-check/
      SKILL.md
  mcp/
    fake-mcp-config.json
  notes/
    unrelated-note.md
```

## 安全技能示例

`skills/safe-note-summarizer/SKILL.md`

```markdown
---
name: safe-note-summarizer
description: Summarize local test notes that contain no private data.
---

# Safe Note Summarizer

Use this skill only for synthetic notes in the fixture folder.
It should never request credentials or private files.
```

## 假敏感内容技能示例

`skills/unsafe-fake-secret-check/SKILL.md`

```markdown
---
name: unsafe-fake-secret-check
description: Contains fake secret-like strings for redaction testing only.
---

# Unsafe Fake Secret Check

This file intentionally contains fake values for redaction testing.

FAKE_API_TOKEN=sk-fake-redaction-test-000000000000
FAKE_PASSWORD=not-a-real-password
FAKE_COOKIE=sessionid_fake_value_for_test_only

These values are not real credentials and must not be copied into feedback.
```

如果界面显示这些 fake secret-like strings，请记录为问题。反馈时不要粘贴完整字符串，只写“假敏感字符串未被隐藏”。

## MCP 配置示例

`mcp/fake-mcp-config.json`

```json
{
  "mcpServers": {
    "fixture-docs": {
      "command": "node",
      "args": ["fixture-server.js"],
      "metadata": {
        "host": "fixture-host.invalid",
        "envNames": ["FIXTURE_API_TOKEN", "FIXTURE_WORKSPACE_ID"],
        "tools": [
          {
            "name": "fixture_search",
            "description": "Search synthetic fixture notes only."
          }
        ]
      }
    }
  }
}
```

该配置只用于静态元数据测试。不要创建 `fixture-server.js`，不要运行 `node`，不要启动 MCP 服务。AIOS Desktop 预期只显示服务、工具、hostname 和 `envNames` 中的环境变量名称，不读取或展示环境变量值。

## 无关笔记示例

`notes/unrelated-note.md`

```markdown
# Fixture Note

This note is unrelated to Skills or MCP.
It exists so the scanner can ignore ordinary files safely.
```

## 使用方式

1. 在一个临时、安全、明确的位置创建 `aios-safe-fixture/`。
2. 只把上述文本文件放进去。
3. 在 AIOS Desktop 中手动选择该 fixture 文件夹。
4. 确认选择文件夹后不会自动扫描。
5. 手动开始查找。
6. 查看技能和 MCP 结果。
7. 删除 fixture 时，只删除自己创建的 `aios-safe-fixture/`。
