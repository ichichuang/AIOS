import assert from "node:assert/strict";
import {
  classifySkillCapability,
  classifySkillListItem,
  getSkillCapabilityConfidenceLabel,
  getSkillCapabilitySearchText,
  SKILL_CAPABILITY_CATEGORIES
} from "./skillCapabilityClassifier.ts";
import { unknownSkillScopeSummary } from "./skillLibrary.ts";
import type { AiosResource } from "../types/inventory.ts";
import type { SkillCapabilityClassification } from "./skillCapabilityClassifier.ts";

const REQUIRED_TAXONOMY_KEYS = [
  "frontend-ui",
  "coding",
  "code-review",
  "testing-qa",
  "docs-writing",
  "data-automation",
  "research-analysis",
  "security-governance",
  "design-visual",
  "unknown"
];

const REQUIRED_TAXONOMY_LABELS: Record<string, string> = {
  "frontend-ui": "前端与界面",
  coding: "通用代码开发",
  "code-review": "代码审查与重构",
  "testing-qa": "测试与质量",
  "docs-writing": "文档与写作",
  "data-automation": "数据与自动化",
  "research-analysis": "研究与分析",
  "security-governance": "安全与治理",
  "design-visual": "设计与视觉",
  unknown: "尚未分类"
};

const REMOVED_CATEGORY_KEYS = [
  "automation-scripts",
  "data-spreadsheets",
  "browser-debug",
  "mcp-integrations",
  "project-governance",
  "local-system",
  "other"
];

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

function makeSkillListItem(
  overrides: Partial<Record<string, unknown>> & { id: string }
): SkillCapabilityClassification {
  const item = {
    displayName: "skill",
    originalName: "skill",
    shortPurpose: "A useful skill.",
    status: "available" as const,
    sourceLabel: "Codex",
    sourceKindLabel: "Codex",
    availableInTools: ["Codex"],
    aliases: [],
    tags: [],
    capabilities: [],
    usageText: null,
    attentionReasons: [],
    primaryPathHint: "~/.codex/skills/skill/SKILL.md",
    sourceCount: 1,
    updatedAt: "2024-09-01T00:00:00.000Z",
    lastSeenAt: "2024-09-01T00:00:01.000Z",
    scopeSummary: unknownSkillScopeSummary(),
    ...overrides
  };
  item.aliases = Array.isArray(item.aliases) ? item.aliases : [];
  item.tags = Array.isArray(item.tags) ? item.tags : [];
  item.capabilities = Array.isArray(item.capabilities) ? item.capabilities : [];
  return classifySkillListItem(item as Parameters<typeof classifySkillListItem>[0]);
}

// 1. Exact taxonomy order is 9 formal categories plus unknown.
const categoryKeys = SKILL_CAPABILITY_CATEGORIES.map((category) => category.key);
assert.deepEqual(categoryKeys, REQUIRED_TAXONOMY_KEYS, "category order and keys must match the required user-facing taxonomy");

// 2. Removed category IDs are absent.
for (const removedKey of REMOVED_CATEGORY_KEYS) {
  assert.ok(!categoryKeys.includes(removedKey as (typeof categoryKeys)[number]), `removed category ${removedKey} must not be present`);
}

// Labels match required Chinese copy.
for (const category of SKILL_CAPABILITY_CATEGORIES) {
  assert.equal(category.title, REQUIRED_TAXONOMY_LABELS[category.key], `${category.key} must keep its stable Chinese label`);
}

// 3. Provider names alone classify as unknown.
const providerOnly = classifySkillCapability(makeSkillResource({ id: "skill:provider", name: "codex", description: "Codex Claude MCP agent integration." }));
assert.equal(providerOnly.primaryCategory.key, "unknown", "bare provider names must not determine a category");

// 4. availableInTools does not affect classification.
const toolDriven = makeSkillListItem({
  id: "skill:tool-driven",
  displayName: "helper",
  shortPurpose: "A useful helper.",
  availableInTools: ["Codex", "Claude", "Agents"],
  tags: [],
  capabilities: []
});
assert.equal(toolDriven.primaryCategory.key, "unknown", "availableInTools alone must not classify a Skill");

// 5. sourceLabel and sourceKindLabel do not affect classification.
const sourceDriven = makeSkillListItem({
  id: "skill:source-driven",
  displayName: "helper",
  shortPurpose: "A useful helper.",
  sourceLabel: "Codex",
  sourceKindLabel: "Codex",
  tags: [],
  capabilities: []
});
assert.equal(sourceDriven.primaryCategory.key, "unknown", "source labels must not classify a Skill");

// 6. Paths do not affect classification.
const pathInName = classifySkillCapability(
  makeSkillResource({
    id: "skill:path",
    name: "my-project-helper",
    description: "Found under /Users/cc/projects/my-app/frontend.",
    metadata: { tags: [], capabilities: [] }
  })
);
assert.equal(pathInName.primaryCategory.key, "unknown", "paths and folder names must not classify a Skill");

// 7. Explicit tags and capabilities outrank names.
const vagueNameStrongTags = makeSkillListItem({
  id: "skill:strong-tags",
  displayName: "helper",
  shortPurpose: "A useful helper.",
  tags: ["frontend", "react", "component"],
  capabilities: ["ui-development"]
});
assert.equal(vagueNameStrongTags.primaryCategory.key, "frontend-ui", "explicit tags/capabilities must outrank weak names");

// 8. Frontend Skill classification.
const frontend = classifySkillCapability(makeSkillResource({ id: "skill:frontend", name: "codex-frontend-ui-debug", description: "Debug frontend UI layout and browser rendering." }));
assert.equal(frontend.primaryCategory.key, "frontend-ui");
assert.ok(frontend.evidenceKeywords.includes("frontend") || frontend.evidenceKeywords.includes("ui"), "frontend evidence must be visible");

// 9. General coding classification.
const coding = classifySkillCapability(makeSkillResource({ id: "skill:coding", name: "algorithm-helper", description: "Implement algorithms and data structures in TypeScript." }));
assert.equal(coding.primaryCategory.key, "coding");

// 10. Code-review classification.
const review = classifySkillCapability(makeSkillResource({ id: "skill:review", name: "refactor-assistant", description: "Review code, run lint, and perform AST-based refactoring." }));
assert.equal(review.primaryCategory.key, "code-review");

// 11. Testing and browser-debug classification.
const playwright = classifySkillCapability(makeSkillResource({ id: "skill:playwright", name: "playwright-interactive", description: "Automate browser e2e screenshot testing." }));
assert.equal(playwright.primaryCategory.key, "testing-qa", "browser testing signals must belong to testing-qa");
assert.match(getSkillCapabilitySearchText(playwright), /测试与质量/);

// 12. Documentation classification.
const writer = makeSkillListItem({
  id: "skill:writer",
  displayName: "writer",
  originalName: "writer",
  shortPurpose: "用于撰写和润色文本。",
  tags: ["writing", "product-copy"],
  capabilities: ["drafting", "editing"]
});
assert.equal(writer.primaryCategory.key, "docs-writing");
assert.match(getSkillCapabilitySearchText(writer), /文档与写作/);

// 13. Data and automation classification.
const spreadsheet = classifySkillCapability(makeSkillResource({ id: "skill:csv", name: "csv-table-helper", description: "Parse CSV spreadsheets and tabular data." }));
assert.equal(spreadsheet.primaryCategory.key, "data-automation", "data and spreadsheet signals must merge into data-automation");

const pipeline = classifySkillCapability(makeSkillResource({ id: "skill:pipeline", name: "ci-pipeline", description: "Run build scripts and CI/CD pipelines." }));
assert.equal(pipeline.primaryCategory.key, "data-automation");

// 14. Research classification.
const research = classifySkillCapability(makeSkillResource({ id: "skill:research", name: "research-synth", description: "Summarize articles and synthesize research perspectives." }));
assert.equal(research.primaryCategory.key, "research-analysis");

// 15. Security and governance classification.
const security = classifySkillCapability(
  makeSkillResource({ id: "skill:security", name: "dependency-audit", description: "Audit repository dependencies for security risks and governance policies." })
);
assert.equal(security.primaryCategory.key, "security-governance");

// 16. Design and visual classification.
const design = classifySkillCapability(makeSkillResource({ id: "skill:design", name: "figma-polish", description: "Create visual themes and animation motion for UI." }));
assert.equal(design.primaryCategory.key, "design-visual");

// 17. Weak generic terms produce unknown.
const generic = classifySkillCapability(makeSkillResource({ id: "skill:generic", name: "helper", description: "A useful local tool and service plugin." }));
assert.equal(generic.primaryCategory.key, "unknown");

// 18. Multi-capability produces one primary and at most two secondary categories.
const multi = classifySkillCapability(
  makeSkillResource({
    id: "skill:multi",
    name: "frontend-docs-helper",
    description: "Build React components and write Markdown documentation for design systems.",
    metadata: { tags: ["frontend", "react", "markdown", "documentation", "design-system"], capabilities: [] }
  })
);
assert.equal(multi.primaryCategory.key, "frontend-ui");
assert.ok(multi.secondaryCategories.length <= 2, "at most two secondary categories");
assert.ok(multi.secondaryCategories.some((category) => category.key === "docs-writing" || category.key === "design-visual"), "secondary categories must reflect real evidence");

// 19. Tie-breaking is deterministic.
const tieInputs = [
  makeSkillResource({ id: "a", name: "ui-helper", description: "frontend react" }),
  makeSkillResource({ id: "b", name: "ui-helper", description: "frontend react" })
];
const tieA = classifySkillCapability(tieInputs[0]);
const tieB = classifySkillCapability(tieInputs[1]);
assert.deepEqual(tieA, tieB, "identical inputs must produce identical classification");

// 20. Repeated runs return identical output.
const run1 = classifySkillCapability(makeSkillResource({ id: "skill:stable", name: "stable", description: "Data processing and CSV automation." }));
const run2 = classifySkillCapability(makeSkillResource({ id: "skill:stable", name: "stable", description: "Data processing and CSV automation." }));
assert.deepEqual(run1, run2, "classification must be deterministic across repeated runs");

// Confidence labels.
assert.equal(getSkillCapabilityConfidenceLabel("high"), "高");
assert.equal(getSkillCapabilityConfidenceLabel("unknown"), "未分类");

console.log("skillCapabilityClassifier tests passed");
