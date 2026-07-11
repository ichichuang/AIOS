import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SkillListItem } from "../../lib/skillLibrary";
import { ProductSkillRow } from "./SkillRow";

function setupSsrEnvironment() {
  if (typeof globalThis.window === "undefined") {
    (globalThis as unknown as Record<string, unknown>).window = {
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false
      })
    };
  }
}

setupSsrEnvironment();

function buildItem(overrides: Partial<SkillListItem> = {}): SkillListItem {
  return {
    id: "skill-test",
    displayName: "测试技能",
    originalName: "test-skill",
    shortPurpose: "用于测试用途。",
    status: "available",
    sourceLabel: "Codex",
    sourceKindLabel: "manual",
    availableInTools: ["codex", "claude"],
    aliases: [],
    tags: [],
    capabilities: ["react"],
    usageText: "在需要快速生成组件时使用。",
    attentionReasons: [],
    primaryPathHint: "",
    sourceCount: 1,
    updatedAt: null,
    lastSeenAt: null,
    scopeSummary: {
      classification: "globalOnly",
      hasGlobalSource: true,
      projects: [],
      hasUnknownSource: false,
      evidence: [
        {
          sourceId: "source:global",
          scopeKind: "global",
          projectId: null,
          projectLabel: null,
          scopeSource: "builtinProfile",
          scopeConfirmed: true
        }
      ]
    },
    ...overrides
  };
}

function renderRow(item: SkillListItem, selectedId: string | null = null): string {
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    return renderToStaticMarkup(
      createElement(ProductSkillRow, {
        item,
        selectedId,
        onSelect: () => undefined
      })
    );
  } finally {
    process.stderr.write = originalStderr;
  }
}

function assertContains(html: string, expected: string, message: string) {
  assert(html.includes(expected), `${message}: expected to find "${expected}"`);
}

function assertNotContains(html: string, unexpected: string, message: string) {
  assert(!html.includes(unexpected), `${message}: expected not to find "${unexpected}"`);
}

// 1. Name is primary, purpose appears before metadata, when-to-use uses 适合：.
{
  const html = renderRow(buildItem());
  const nameIndex = html.indexOf("测试技能");
  const purposeIndex = html.indexOf("用于测试用途。");
  const usageIndex = html.indexOf("适合：");
  const toolIndex = html.indexOf("Codex");
  assert(nameIndex >= 0, "Skill name must be rendered");
  assert(purposeIndex > nameIndex, "Purpose must follow the name");
  assert(usageIndex > purposeIndex, "Usage must follow the purpose");
  assert(toolIndex > usageIndex, "Tool metadata must follow usage");
}

// 2. Normal status has no repetitive 可用 chip.
{
  const html = renderRow(buildItem({ status: "available" }));
  assertNotContains(html, "可用", "Normal status must not render an available chip");
}

// 3. Broken and attention statuses use ordinary labels.
{
  const brokenHtml = renderRow(buildItem({ status: "broken" }));
  assertContains(brokenHtml, "不可用", "Broken status must render a plain unavailable label");

  const attentionHtml = renderRow(buildItem({ status: "needsAttention" }));
  assertContains(attentionHtml, "需要检查", "Needs-attention status must render a plain attention label");
}

// 4. Scope variants render correctly.
{
  const globalHtml = renderRow(buildItem({ scopeSummary: { classification: "globalOnly", hasGlobalSource: true, projects: [], hasUnknownSource: false, evidence: [] } }));
  assertContains(globalHtml, "全局", "Global-only scope must render the global label");

  const projectHtml = renderRow(buildItem({ scopeSummary: { classification: "projectOnly", hasGlobalSource: false, projects: [{ projectId: "p1", projectLabel: "Alpha" }], hasUnknownSource: false, evidence: [] } }));
  assertContains(projectHtml, "项目 · Alpha", "Single-project scope must render the project label");

  const multiProjectHtml = renderRow(buildItem({ scopeSummary: { classification: "projectOnly", hasGlobalSource: false, projects: [{ projectId: "p1", projectLabel: "Alpha" }, { projectId: "p2", projectLabel: "Beta" }], hasUnknownSource: false, evidence: [] } }));
  assertContains(multiProjectHtml, "2 个项目", "Multi-project scope must render the project count");

  const mixedHtml = renderRow(buildItem({ scopeSummary: { classification: "mixed", hasGlobalSource: true, projects: [{ projectId: "p1", projectLabel: "Alpha" }], hasUnknownSource: false, evidence: [] } }));
  assertContains(mixedHtml, "全局 + 1 个项目", "Mixed scope must render global plus project count");

  const unknownHtml = renderRow(buildItem({ scopeSummary: { classification: "unknown", hasGlobalSource: false, projects: [], hasUnknownSource: true, evidence: [] } }));
  assertContains(unknownHtml, "范围未整理", "Unknown scope must render the unknown label");
}

// 5. Mixed unknown evidence does not overload the row.
{
  const html = renderRow(
    buildItem({
      scopeSummary: {
        classification: "mixed",
        hasGlobalSource: true,
        projects: [{ projectId: "p1", projectLabel: "Alpha" }],
        hasUnknownSource: true,
        evidence: []
      }
    })
  );
  assertContains(html, "全局 + 1 个项目", "Mixed row must show only confirmed scope");
  assertNotContains(html, "另有来源尚未整理", "Row must not carry the unknown-source explanation");
}

// 6. Explicit tools render and Unknown is omitted.
{
  const html = renderRow(buildItem({ availableInTools: ["Unknown", "codex", "claude", "agents"] }));
  assertContains(html, "Codex", "Known tool labels must render");
  assertContains(html, "Claude", "Known tool labels must render");
  assertContains(html, "+1", "Additional tools must collapse into a count");
  assertNotContains(html, "Unknown", "Unknown tool placeholder must be omitted");
}

// 7. Known source is secondary; unknown source chip is omitted.
{
  const knownHtml = renderRow(buildItem({ sourceLabel: "Codex" }));
  assertContains(knownHtml, "来自 Codex", "Known source must appear as secondary provenance");

  const unknownHtml = renderRow(buildItem({ sourceLabel: "来源不明" }));
  assertNotContains(unknownHtml, "来源不明", "Unknown source chip must not be rendered");
}

// 8. Original technical name is not primary.
{
  const html = renderRow(buildItem({ originalName: "very-technical-skill-name" }));
  assertNotContains(html, "very-technical-skill-name", "Original technical name must not dominate the row");
}

// 9. Missing purpose and usage produce one fallback.
{
  const html = renderRow(buildItem({ shortPurpose: "", usageText: "" }));
  const fallbackCount = html.split("暂未记录详细用途").length - 1;
  assertContains(html, "暂未记录详细用途", "Missing purpose and usage must show a single fallback");
  assert.equal(fallbackCount, 1, "Fallback sentence must appear exactly once");
}

// 10. Row is keyboard selectable and exposes button semantics.
{
  const html = renderRow(buildItem());
  assertContains(html, 'role="button"', "Row must expose button semantics");
  assertContains(html, "tabindex=\"0\"", "Row must be focusable");
}

// 11. Selected state is distinct from hover and does not rely only on color.
{
  const selectedHtml = renderRow(buildItem(), "skill-library:skill-test");
  assertContains(selectedHtml, "skill-row-selected", "Selected row must expose a selected class");
  assertContains(selectedHtml, "data-aios-selected-surface=\"true\"", "Selected row must expose a non-color selected marker");
}

// 12. Row geometry remains stable: no transform-based hover style.
{
  const source = renderRow(buildItem());
  assertNotContains(source, "transform:", "Row must not use transform-based motion");
  assertNotContains(source, "translate", "Row must not use translate-based hover");
}

console.log("SkillRow P6D tests passed");
