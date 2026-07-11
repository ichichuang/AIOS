import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SkillDetail, SkillListItem } from "../../lib/skillLibrary";
import { SkillDetailInspector } from "./SkillDetailInspector";

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
    id: "skill-detail-test",
    displayName: "详情测试技能",
    originalName: "detail-test-skill",
    shortPurpose: "它可以自动生成组件。",
    status: "available",
    sourceLabel: "Codex",
    sourceKindLabel: "manual",
    availableInTools: ["cline", "codex"],
    aliases: ["别名 A", "别名 B"],
    tags: ["frontend", "ui"],
    capabilities: ["react"],
    usageText: "在需要快速搭建界面时使用。",
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

function buildDetail(item: SkillListItem): SkillDetail {
  return {
    ...item,
    whatItDoes: item.shortPurpose || "它可以完成特定任务。",
    whenToUse: item.usageText || "在适合的场景中使用。",
    howToUse: item.usageText || "按说明调用即可。",
    usageSummary: { usageKnown: true, usageText: item.usageText || "", availableInTools: item.availableInTools },
    sourceSummaries: [
      {
        id: "source-1",
        sourceLabel: item.sourceLabel || "本地",
        sourceKindLabel: item.sourceKindLabel || "manual",
        availableInTools: item.availableInTools,
        pathHint: "",
        rootPathHint: null,
        lastSeenAt: null,
        scanStatus: null,
        findingCount: 0,
        duplicate: false
      }
    ],
    relatedDuplicateSources: [],
    safeAdvancedMetadataSummary: [],
    findings: []
  };
}

function renderInspector(item: SkillListItem | null, detail?: SkillDetail): string {
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    return renderToStaticMarkup(
      createElement(SkillDetailInspector, {
        detail: detail ?? null,
        fallbackItem: item,
        loading: false,
        error: null
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

function renderItem(overrides: Partial<SkillListItem> = {}): string {
  const item = buildItem(overrides);
  return renderInspector(item, buildDetail(item));
}

// 1. Primary section order is correct.
{
  const html = renderItem();
  const whatIndex = html.indexOf("它能做什么");
  const whenIndex = html.indexOf("适合什么时候用");
  const howIndex = html.indexOf("如何使用");
  const toolsIndex = html.indexOf("可在哪些 AI 工具中使用");
  const scopeIndex = html.indexOf("归属范围");
  assert(whatIndex < whenIndex, "'它能做什么' must precede '适合什么时候用'");
  assert(whenIndex < howIndex, "'适合什么时候用' must precede '如何使用'");
  assert(howIndex < toolsIndex, "'如何使用' must precede tool section");
  assert(toolsIndex < scopeIndex, "Tool section must precede '归属范围'");
}

// 2. Original technical name is absent from the primary header.
{
  const html = renderItem();
  assertContains(html, "详情测试技能", "Display name must be in the header");
  const advancedIndex = html.indexOf("高级信息");
  const originalIndex = html.indexOf("detail-test-skill");
  assert(originalIndex > advancedIndex, "Original technical name must only appear inside the collapsed advanced section");
}

// 3. Capability and scope appear near the header.
{
  const html = renderItem();
  const headerIndex = html.indexOf("详情测试技能");
  const capabilityIndex = html.indexOf("前端与界面");
  const scopeIndex = html.indexOf("全局技能");
  assert(capabilityIndex < headerIndex, "Capability must appear before the display name");
  assert(scopeIndex > headerIndex, "Scope summary must appear after the display name");
}

// 4. Compatible tools only when explicit; Unknown is omitted.
{
  const html = renderItem({ availableInTools: ["Unknown", "codex"] });
  assertContains(html, "Codex", "Explicit tool must render");
  assertNotContains(html, "Unknown", "Unknown tool placeholder must be omitted");
}

// 5. Scope wording for each classification.
{
  const globalHtml = renderItem({ scopeSummary: { classification: "globalOnly", hasGlobalSource: true, projects: [], hasUnknownSource: false, evidence: [] } });
  assertContains(globalHtml, "全局技能", "Global scope detail must use global wording");

  const projectHtml = renderItem({ scopeSummary: { classification: "projectOnly", hasGlobalSource: false, projects: [{ projectId: "p1", projectLabel: "Alpha" }], hasUnknownSource: false, evidence: [] } });
  assertContains(projectHtml, "Alpha", "Project scope detail must list the project label");

  const mixedHtml = renderItem({ scopeSummary: { classification: "mixed", hasGlobalSource: true, projects: [{ projectId: "p1", projectLabel: "Alpha" }], hasUnknownSource: false, evidence: [] } });
  assertContains(mixedHtml, "全局", "Mixed scope detail must include global");
  assertContains(mixedHtml, "Alpha", "Mixed scope detail must include project");

  const unknownHtml = renderItem({ scopeSummary: { classification: "unknown", hasGlobalSource: false, projects: [], hasUnknownSource: true, evidence: [] } });
  assertContains(unknownHtml, "AIOS 还不能判断这个技能属于全局范围还是某个项目。", "Unknown scope detail must explain the unknown state");
}

// 6. hasUnknownSource adds a note in scope detail.
{
  const html = renderItem({
    scopeSummary: {
      classification: "mixed",
      hasGlobalSource: true,
      projects: [{ projectId: "p1", projectLabel: "Alpha" }],
      hasUnknownSource: true,
      evidence: []
    }
  });
  assertContains(html, "另有来源尚未整理范围", "Mixed unknown scope must explain the unknown source");
}

// 7. One consolidated missing-information notice when several fields are missing.
{
  const item = buildItem({ shortPurpose: "", usageText: "", availableInTools: [] });
  const detail = { ...buildDetail(item), whatItDoes: "", whenToUse: "", howToUse: "" };
  const html = renderInspector(item, detail);
  const noticeCount = html.split("这个技能的详细说明还不完整").length - 1;
  assertContains(html, "这个技能的详细说明还不完整", "Missing information must show a consolidated notice");
  assert.equal(noticeCount, 1, "Consolidated notice must appear exactly once");
}

// 8. Source metadata is collapsed by default.
{
  const html = renderItem();
  assertContains(html, "来源与记录", "Source section must be present");
  assert(html.includes('aria-expanded="false"') || html.includes("MuiCollapse-hidden"), "Source section must be collapsed by default");
}

// 9. Advanced metadata is collapsed by default.
{
  const html = renderItem();
  assertContains(html, "高级信息", "Advanced section must be present");
  assert(html.includes('aria-expanded="false"') || html.includes("MuiCollapse-hidden"), "Advanced section must be collapsed by default");
}

// 10. Paths and IDs are not primary content.
{
  const html = renderItem({ primaryPathHint: "/private/path" });
  assertNotContains(html, "/private/path", "Private path must not be primary content");
}

// 11. Repeated unknown placeholders are absent.
{
  const item = buildItem({ shortPurpose: "暂时无法判断", usageText: "暂时无法判断" });
  const detail = { ...buildDetail(item), whatItDoes: "暂时无法判断它能做什么。请在高级信息里查看来源。", whenToUse: "暂时无法判断适合什么时候用。请在高级信息里查看来源。" };
  const html = renderInspector(item, detail);
  const placeholderCount = html.split("暂时无法判断").length - 1;
  assert.equal(placeholderCount, 0, "Unknown placeholder must not repeat in primary sections");
}

// 12. Inspector headings and disclosure controls are accessible.
{
  const html = renderItem();
  assertContains(html, "aria-expanded", "Disclosure controls must expose expanded state");
  assertContains(html, "来源与记录", "Source disclosure heading must be present");
  assertContains(html, "高级信息", "Advanced disclosure heading must be present");
}

console.log("SkillDetailInspector P6D tests passed");
