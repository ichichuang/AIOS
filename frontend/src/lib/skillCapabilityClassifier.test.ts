import assert from "node:assert/strict";
import {
  classifySkillCapability,
  classifySkillListItem,
  getSkillCapabilitySearchText,
  SKILL_CAPABILITY_CATEGORIES
} from "./skillCapabilityClassifier.ts";
import type { AiosResource } from "../types/inventory.ts";

const REQUIRED_TAXONOMY_KEYS = [
  "frontend-ui",
  "coding",
  "code-review",
  "docs-writing",
  "automation-scripts",
  "data-spreadsheets",
  "browser-debug",
  "mcp-integrations",
  "project-governance",
  "design-visual",
  "research-analysis",
  "local-system",
  "other"
];

const REQUIRED_TAXONOMY_LABELS: Record<string, string> = {
  "frontend-ui": "前端与界面",
  coding: "通用代码开发",
  "code-review": "代码审查与重构",
  "docs-writing": "文档与写作",
  "automation-scripts": "自动化与脚本",
  "data-spreadsheets": "数据与表格",
  "browser-debug": "浏览器与调试",
  "mcp-integrations": "MCP 与工具集成",
  "project-governance": "项目治理与安全",
  "design-visual": "设计与视觉",
  "research-analysis": "研究与分析",
  "local-system": "本地系统与环境",
  other: "其他"
};

function makeSkillResource(overrides: Partial<AiosResource> & Pick<AiosResource, "id" | "name" | "description">): AiosResource {
  return {
    toolType: "codex",
    capabilityType: "skill",
    status: "active",
    risk: "low",
    paths: [],
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: "low",
      executionRisk: "low",
      notes: []
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "metadata"
    },
    prompts: [],
    ...overrides
  };
}

const categoryKeys = SKILL_CAPABILITY_CATEGORIES.map((category) => category.key);
assert.deepEqual(categoryKeys, REQUIRED_TAXONOMY_KEYS, "category order and keys must match the required user-facing taxonomy");

for (const category of SKILL_CAPABILITY_CATEGORIES) {
  assert.equal(category.title, REQUIRED_TAXONOMY_LABELS[category.key], `${category.key} must keep its stable Chinese label`);
}

const frontend = classifySkillCapability(makeSkillResource({ id: "skill:frontend", name: "codex-frontend-ui-debug", description: "Debug frontend UI layout and browser rendering." }));
assert.equal(frontend.primaryCategory.key, "frontend-ui");
assert(frontend.evidenceKeywords.includes("frontend"));

const playwright = classifySkillCapability(makeSkillResource({ id: "skill:playwright", name: "playwright-interactive", description: "Automate browser e2e screenshot testing." }));
assert.equal(playwright.primaryCategory.key, "browser-debug");
assert.match(getSkillCapabilitySearchText(playwright), /浏览器与调试/);

const agent = classifySkillCapability(makeSkillResource({ id: "skill:mcp", name: "aios-tool-router", description: "Route local AI agent MCP and Codex tool choices." }));
assert.equal(agent.primaryCategory.key, "mcp-integrations");

const writer = classifySkillListItem({
  id: "skill:writer",
  displayName: "writer",
  originalName: "writer",
  shortPurpose: "用于撰写和润色文本。",
  status: "available",
  sourceLabel: "Codex",
  sourceKindLabel: "Codex",
  availableInTools: ["Codex"],
  aliases: ["writer", "copy-helper"],
  tags: ["writing", "product-copy"],
  capabilities: ["drafting", "editing"],
  usageText: "在 Codex 中输入 `$writer` 。",
  attentionReasons: [],
  primaryPathHint: "~/.codex/skills/writer/SKILL.md",
  sourceCount: 1,
  updatedAt: "2024-09-01T00:00:00.000Z",
  lastSeenAt: "2024-09-01T00:00:01.000Z"
});
assert.equal(writer.primaryCategory.key, "docs-writing");
assert.match(getSkillCapabilitySearchText(writer), /文档与写作/);

const spreadsheet = classifySkillCapability(makeSkillResource({ id: "skill:csv", name: "csv-table-helper", description: "Parse CSV spreadsheets and tabular data." }));
assert.equal(spreadsheet.primaryCategory.key, "data-spreadsheets");

const localSystem = classifySkillCapability(makeSkillResource({ id: "skill:shell", name: "local-shell-helper", description: "Run local shell and filesystem helpers." }));
assert.equal(localSystem.primaryCategory.key, "local-system");

console.log("skillCapabilityClassifier tests passed");
