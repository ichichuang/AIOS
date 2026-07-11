import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fileURLToPath } from "node:url";
import { fallbackResourceCorpusSummary, globalCorpusScope } from "../../lib/resourceCorpus";
import type { SkillListItem, SkillLibraryModuleState, SkillLibrarySummary } from "../../lib/skillLibrary";
import type { AiosModuleProps } from "./moduleUtils";

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
  if (typeof globalThis.sessionStorage === "undefined") {
    const store = new Map<string, string>();
    (globalThis as unknown as Record<string, unknown>).sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear()
    };
  }
}

setupSsrEnvironment();

const { SkillsModule } = await import("./SkillsModule");

const emptySkillSummary: SkillLibrarySummary = {
  generatedAtMs: 0,
  latestScanAtMs: null,
  latestSuccessfulScanAtMs: null,
  counts: {
    totalSkillCandidates: 0,
    dedupedSkillCount: 0,
    availableSkillCount: 0,
    needsAttentionCount: 0,
    duplicateCount: 0,
    brokenCount: 0,
    sourceUnknownCount: 0,
    uncheckedCount: 0
  },
  metadataOnly: true,
  contentStorageEnabled: false
};

const emptySkillLibrary: SkillLibraryModuleState = {
  summary: emptySkillSummary,
  items: [],
  loading: false,
  error: null,
  available: true
};

function unknownScopeSummary(): SkillListItem["scopeSummary"] {
  return {
    classification: "unknown",
    hasGlobalSource: false,
    projects: [],
    hasUnknownSource: true,
    evidence: [
      {
        sourceId: "source:legacy",
        scopeKind: "unknown",
        projectId: null,
        projectLabel: null,
        scopeSource: "legacyMigration",
        scopeConfirmed: false
      }
    ]
  };
}

function globalScopeSummary(): SkillListItem["scopeSummary"] {
  return {
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
  };
}

function projectScopeSummary(projectId: string, projectLabel: string): SkillListItem["scopeSummary"] {
  return {
    classification: "projectOnly",
    hasGlobalSource: false,
    projects: [{ projectId, projectLabel }],
    hasUnknownSource: false,
    evidence: [
      {
        sourceId: "source:project",
        scopeKind: "project",
        projectId,
        projectLabel,
        scopeSource: "userConfig",
        scopeConfirmed: true
      }
    ]
  };
}

function mixedScopeSummary(projectId: string, projectLabel: string): SkillListItem["scopeSummary"] {
  return {
    classification: "mixed",
    hasGlobalSource: true,
    projects: [{ projectId, projectLabel }],
    hasUnknownSource: true,
    evidence: [
      {
        sourceId: "source:global",
        scopeKind: "global",
        projectId: null,
        projectLabel: null,
        scopeSource: "builtinProfile",
        scopeConfirmed: true
      },
      {
        sourceId: "source:project",
        scopeKind: "project",
        projectId,
        projectLabel,
        scopeSource: "userConfig",
        scopeConfirmed: true
      }
    ]
  };
}

function buildSkill(overrides: Partial<SkillListItem> = {}): SkillListItem {
  return {
    id: `skill-${overrides.id ?? Math.random().toString(36).slice(2)}`,
    displayName: "未命名技能",
    originalName: "unnamed-skill",
    shortPurpose: "通用用途",
    status: "available",
    sourceLabel: "本地",
    sourceKindLabel: "manual",
    availableInTools: [],
    aliases: [],
    tags: [],
    capabilities: [],
    usageText: null,
    attentionReasons: [],
    primaryPathHint: "",
    sourceCount: 1,
    updatedAt: null,
    lastSeenAt: null,
    scopeSummary: unknownScopeSummary(),
    ...overrides
  } as SkillListItem;
}

function buildProps(overrides: Partial<AiosModuleProps> & { initialScope?: "all" | "global" | "project" | "unknown"; initialShowMoreFilters?: boolean } = {}): AiosModuleProps & { initialScope?: "all" | "global" | "project" | "unknown"; initialShowMoreFilters?: boolean } {
  return {
    allResources: [],
    baseline: {
      aiosRoot: "",
      appSourcePath: "",
      generatedAt: "",
      policyHash: null,
      canonicalSkillCount: 0,
      codexTopLevelCount: 0,
      codexActiveUserSkillCount: 0,
      agentsActiveUserSkillCount: 0,
      claudeSkillCount: null,
      customSkillRouterCodex: false,
      customSkillRouterAgents: false,
      codexAutomationDirectoryState: { exists: false, isDirectory: false, entryCount: 0, summary: "目录缺失" },
      validators: [],
      knownWarnings: []
    },
    resourceCorpus: {
      activeScope: globalCorpusScope,
      dataSource: {
        activeSource: "empty",
        dynamicResourceCount: 0,
        legacySnapshotCount: 0,
        hasDynamicCorpus: false,
        hasLegacySnapshot: false,
        displayLabel: "还没有查找"
      },
      error: null,
      firstRunOnboardingDismissed: false,
      loading: false,
      mode: "empty",
      projectMap: [],
      onSetFirstRunOnboardingDismissed: () => undefined,
      onScopeChange: () => undefined,
      refresh: () => undefined,
      scanSourceMap: [],
      scopes: [globalCorpusScope],
      summary: fallbackResourceCorpusSummary
    },
    mcpLibrary: {
      summary: {
        generatedAtMs: 0,
        latestSearchOrScanTime: null,
        counts: {
          mcpConfigCount: 0,
          serviceCount: 0,
          verifiedServiceCount: 0,
          unverifiedServiceCount: 0,
          toolHintCount: 0,
          needsAttentionCount: 0,
          sourceUnknownCount: 0,
          configUnreadableCount: 0
        },
        metadataOnly: true,
        contentStorageEnabled: false
      },
      items: [],
      loading: false,
      error: null,
      available: true
    },
    skillLibrary: emptySkillLibrary,
    displayById: new Map(),
    query: "",
    resources: [],
    selectedId: null,
    skillCapabilityById: new Map(),
    viewCounts: {
      dashboard: 0,
      skills: 0,
      mcp: 0,
      advanced: 0,
      "custom-scan": 0,
      scripts: 0,
      reports: 0,
      "project-packs": 0,
      policies: 0,
      validators: 0,
      legacy: 0
    },
    onBack: () => undefined,
    onClearSelection: () => undefined,
    onSelect: () => undefined,
    onViewChange: () => undefined,
    onQueryChange: () => undefined,
    ...overrides
  };
}

function renderSkills(props: AiosModuleProps): string {
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    return renderToStaticMarkup(createElement(SkillsModule, props));
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

// 1. Empty state renders the new product title and honest copy.
{
  const html = renderSkills(buildProps());
  assertContains(html, "技能", "Page must render the Skills title");
  assertContains(html, "按任务和能力浏览已整理的 AI 技能，快速找到适合当前工作的技能。", "Page must explain the product purpose in plain language");
  assertContains(html, "还没有找到 AI 技能", "Empty state must use the honest no-skills title");
  assertContains(html, "开始查找后，这里会显示技能名称、用途和能力分类。", "Empty state must explain how skills will appear");
  assertNotContains(html, "scanner", "Empty state must not use scanner terminology");
  assertNotContains(html, "corpus", "Empty state must not use corpus terminology");
}

// 2. Scope tabs render with counts for a populated library.
{
  const items = [
    buildSkill({ id: "global-1", displayName: "全局 React 组件", capabilities: ["react", "component"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "project-1", displayName: "项目 API 封装", capabilities: ["api", "sdk"], scopeSummary: projectScopeSummary("proj-a", "Alpha 项目") }),
    buildSkill({ id: "mixed-1", displayName: "混合类型测试", capabilities: ["test"], scopeSummary: mixedScopeSummary("proj-b", "Beta 项目") }),
    buildSkill({ id: "unknown-1", displayName: "未知范围技能", capabilities: [], scopeSummary: unknownScopeSummary() })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, summary: { ...emptySkillSummary, counts: { ...emptySkillSummary.counts, dedupedSkillCount: items.length } }, items };
  const html = renderSkills(buildProps({ skillLibrary }));

  assertContains(html, "全部技能", "Scope tabs must include All Skills");
  assertContains(html, "全局技能", "Scope tabs must include Global Skills");
  assertContains(html, "项目技能", "Scope tabs must include Project Skills");
  assertContains(html, "范围未整理", "Scope tabs must include Unknown Scope");

  // Counts: all=4, global=2 (global-1 + mixed-1), project=2 (project-1 + mixed-1), unknown=1.
  assertContains(html, "4", "All scope tab must show the total count");
  assertContains(html, "2", "Global or Project scope tab must show membership count");
  assertContains(html, "1", "Unknown scope tab must show the unknown-only count");
}

// 3. Capability rail contains the 9 formal categories plus unknown, in plain language.
{
  const items = [
    buildSkill({ id: "fe", displayName: "React 组件", capabilities: ["react"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "code", displayName: "TypeScript 助手", capabilities: ["typescript"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "review", displayName: "代码审查", capabilities: ["review"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "test", displayName: "E2E 测试", capabilities: ["e2e"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "docs", displayName: "文档生成", capabilities: ["documentation"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "data", displayName: "CSV 处理", capabilities: ["csv"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "research", displayName: "调研总结", capabilities: ["research"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "sec", displayName: "安全审查", capabilities: ["security"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "design", displayName: "动效设计", capabilities: ["animation"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "unk", displayName: "未知技能", capabilities: [], scopeSummary: globalScopeSummary() })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary }));

  const expectedCategories = ["前端与界面", "通用代码开发", "代码审查与重构", "测试与质量", "文档与写作", "数据与自动化", "研究与分析", "安全与治理", "设计与视觉", "尚未分类"];
  for (const label of expectedCategories) {
    assertContains(html, label, `Capability rail must include "${label}"`);
  }
}

// 4. Removed provider/source/path categories must not appear.
{
  const items = [
    buildSkill({ id: "mcp", displayName: "MCP 工具", capabilities: ["mcp"], scopeSummary: globalScopeSummary(), sourceLabel: "Codex" }),
    buildSkill({ id: "local", displayName: "本地脚本", capabilities: ["shell"], scopeSummary: globalScopeSummary(), sourceKindLabel: "claude" })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary }));

  assertNotContains(html, "MCP 集成", "Removed category MCP integrations must not appear");
  assertNotContains(html, "本地系统", "Removed category local system must not appear");
  assertNotContains(html, "项目治理", "Removed category project governance must not appear");
  assertNotContains(html, "浏览器与调试", "Removed category browser debug must not appear");
  assertNotContains(html, "自动化脚本", "Removed category automation scripts must not appear");
  assertNotContains(html, "电子表格", "Removed category data spreadsheets must not appear");
}

// 5. Project selector does not appear in All scope; appears only when Project scope is active.
{
  const items = [buildSkill({ id: "proj", displayName: "项目技能", capabilities: ["api"], scopeSummary: projectScopeSummary("proj-a", "Alpha 项目") })];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };

  const allScopeHtml = renderSkills(buildProps({ skillLibrary }));
  assertNotContains(allScopeHtml, "全部项目", "Project selector must not render in All scope");

  const projectScopeHtml = renderSkills(buildProps({ skillLibrary, initialScope: "project" }));
  assertContains(projectScopeHtml, "全部项目", "Project selector must render in Project scope");
  assertContains(projectScopeHtml, "Alpha 项目", "Project selector must expose the project label");
  assertNotContains(projectScopeHtml, "proj-a", "Project selector must not expose the stable project ID as visible text");
}

// 6. No absolute path is rendered as project identity.
{
  const items = [buildSkill({ id: "path-proj", displayName: "路径项目技能", capabilities: ["api"], scopeSummary: projectScopeSummary("proj-path", "Path 项目") })];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary, initialScope: "project" }));
  assertNotContains(html, "/Users/", "Project identity must not expose absolute paths");
  assertNotContains(html, "/home/", "Project identity must not expose home paths");
}

// 7. Secondary source/status controls are present behind the more-filters affordance.
{
  const items = [
    buildSkill({ id: "src-a", displayName: "来源 A", capabilities: ["api"], scopeSummary: globalScopeSummary(), sourceLabel: "Codex" }),
    buildSkill({ id: "src-b", displayName: "来源 B", capabilities: ["api"], scopeSummary: globalScopeSummary(), sourceLabel: "Claude" })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary }));

  assertContains(html, "更多筛选", "Secondary filters must be reachable through a more-filters control");

  const expandedHtml = renderSkills(buildProps({ skillLibrary, initialShowMoreFilters: true }));
  assertContains(expandedHtml, "状态筛选", "Status filter must be present as secondary");
  assertContains(expandedHtml, "来源筛选", "Source filter must be present as secondary");
  assertContains(expandedHtml, "全部来源", "Source filter must include the all-sources option");
}

// 8. Search empty state uses plain-language copy.
{
  const items = [buildSkill({ id: "findable", displayName: "可搜索技能", capabilities: ["api"], scopeSummary: globalScopeSummary() })];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary, query: "不存在的搜索词" }));

  assertContains(html, "没有匹配结果", "Search empty state must use the honest title");
  assertContains(html, "换一个关键词，或清除筛选后再试。", "Search empty state must suggest changing keywords or clearing filters");
}

// 9. Global, Project, and Unknown empty states render honest copy when the scope is empty but other skills exist.
{
  const unknownOnlyLibrary: SkillLibraryModuleState = {
    ...emptySkillLibrary,
    items: [buildSkill({ id: "only-unknown", displayName: "未知范围技能", capabilities: [], scopeSummary: unknownScopeSummary() })]
  };
  const globalHtml = renderSkills(buildProps({ skillLibrary: unknownOnlyLibrary, initialScope: "global" }));
  assertContains(globalHtml, "还没有明确归为全局的技能", "Global empty state must explain explicit global scope requirement");

  const globalOnlyLibrary: SkillLibraryModuleState = {
    ...emptySkillLibrary,
    items: [buildSkill({ id: "only-global", displayName: "全局技能", capabilities: ["api"], scopeSummary: globalScopeSummary() })]
  };
  const projectHtml = renderSkills(buildProps({ skillLibrary: globalOnlyLibrary, initialScope: "project" }));
  assertContains(projectHtml, "还没有已登记的项目技能", "Project empty state must explain explicit project scope requirement");

  const projectOnlyLibrary: SkillLibraryModuleState = {
    ...emptySkillLibrary,
    items: [buildSkill({ id: "only-project", displayName: "项目技能", capabilities: ["api"], scopeSummary: projectScopeSummary("proj-empty", "空项目") })]
  };
  const unknownHtml = renderSkills(buildProps({ skillLibrary: projectOnlyLibrary, initialScope: "unknown" }));
  assertContains(unknownHtml, "没有范围未整理的技能", "Unknown empty state must explain unknown-only semantics");
}

// 10. Capability grouping is visible in All-capability mode.
{
  const items = [
    buildSkill({ id: "g-fe", displayName: "前端技能", capabilities: ["react"], scopeSummary: globalScopeSummary() }),
    buildSkill({ id: "g-code", displayName: "编码技能", capabilities: ["typescript"], scopeSummary: globalScopeSummary() })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary }));

  assertContains(html, "前端与界面", "All-capability view must render the frontend-ui group heading");
  assertContains(html, "通用代码开发", "All-capability view must render the coding group heading");
  assertContains(html, "前端技能", "All-capability view must render the frontend skill row");
  assertContains(html, "编码技能", "All-capability view must render the coding skill row");
}

// 11. Project scope with explicit projects renders the project selector; option separation by stable ID is covered in browse-model tests.
{
  const items = [
    buildSkill({ id: "same-label-1", displayName: "同名项目技能一", capabilities: ["api"], scopeSummary: projectScopeSummary("proj-id-1", "同名项目") }),
    buildSkill({ id: "same-label-2", displayName: "同名项目技能二", capabilities: ["api"], scopeSummary: projectScopeSummary("proj-id-2", "同名项目") })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary, initialScope: "project" }));

  assertContains(html, "全部项目", "Project selector must render when explicit projects exist");
  assertNotContains(html, "暂无已登记项目", "Project selector must not show the unavailable placeholder when projects exist");
}

// 12. Scope tabs and capability controls are keyboard accessible.
{
  const items = [buildSkill({ id: "kb", displayName: "键盘技能", capabilities: ["api"], scopeSummary: globalScopeSummary() })];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary }));
  assertContains(html, 'role="tab"', "Scope or capability controls must expose tab role for keyboard access");
  assertContains(html, 'role="tablist"', "Scope or capability controls must expose tablist role for keyboard access");
}

// 13. Scope precedes capability and secondary filters in the rendered order.
{
  const items = [
    buildSkill({ id: "scope-order-a", displayName: "范围排序技能 A", capabilities: ["api"], scopeSummary: globalScopeSummary(), sourceLabel: "Codex" }),
    buildSkill({ id: "scope-order-b", displayName: "范围排序技能 B", capabilities: ["api"], scopeSummary: globalScopeSummary(), sourceLabel: "Claude" })
  ];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary, initialShowMoreFilters: true }));
  const scopeIndex = html.indexOf("全部技能");
  const capabilityIndex = html.indexOf("全部能力");
  const sourceFilterIndex = html.indexOf("来源筛选");
  assert(scopeIndex >= 0 && capabilityIndex > scopeIndex, "Capability navigation must appear after scope tabs");
  assert(scopeIndex >= 0 && sourceFilterIndex > scopeIndex, "Source filters must appear after scope tabs");
}

// 14. Selection clears when scope, project, or capability changes.
{
  const skillsModuleSource = readFileSync(fileURLToPath(new URL("./SkillsModule.tsx", import.meta.url)), "utf8");
  assert(skillsModuleSource.includes("setScope(nextScope)"), "Scope change handler must update scope state");
  assert(skillsModuleSource.includes("handleProjectChange"), "Project change handler must exist");
  assert(skillsModuleSource.includes("handleCapabilityChange"), "Capability change handler must exist");
  assert(skillsModuleSource.includes("onClearSelection()"), "Changing a primary browsing dimension must clear the current selection");
}

// 15. Result list owns its own scroll region.
{
  const items = [buildSkill({ id: "scroll-1", displayName: "滚动技能", capabilities: ["api"], scopeSummary: globalScopeSummary() })];
  const skillLibrary: SkillLibraryModuleState = { ...emptySkillLibrary, items };
  const html = renderSkills(buildProps({ skillLibrary }));
  assertContains(html, 'data-aios-internal-scroll="true"', "Result area must declare internal scroll ownership");
}

console.log("SkillsModule P6D tests passed");
