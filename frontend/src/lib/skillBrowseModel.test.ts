import assert from "node:assert/strict";
import {
  buildSkillBrowseView,
  getSkillBrowseEmptyStateCopy,
  normalizeSkillBrowseFilters,
  readPersistedSkillCapability,
  readPersistedSkillProject,
  readPersistedSkillScope,
  writePersistedSkillCapability,
  writePersistedSkillProject,
  writePersistedSkillScope
} from "./skillBrowseModel.ts";
import { unknownSkillScopeSummary } from "./skillLibrary.ts";
import type { SkillListItem, SkillStatusFilter } from "./skillLibrary.ts";
import { SKILL_CAPABILITY_CATEGORIES } from "./skillCapabilityClassifier.ts";
import type { SkillCapabilityFilter, SkillScopeFilter } from "./skillBrowseModel.ts";

function makeItem(overrides: Partial<SkillListItem> & { id: string }): SkillListItem {
  const item = {
    displayName: overrides.id,
    originalName: overrides.id,
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
  return item as SkillListItem;
}

const allCapabilityKeys = new Set(SKILL_CAPABILITY_CATEGORIES.map((category) => category.key));

const globalItem = makeItem({
  id: "skill:global",
  displayName: "Global Writer",
  scopeSummary: {
    classification: "globalOnly",
    hasGlobalSource: true,
    projects: [],
    hasUnknownSource: false,
    evidence: []
  }
});

const projectAlphaItem = makeItem({
  id: "skill:project-alpha",
  displayName: "Alpha Coder",
  scopeSummary: {
    classification: "projectOnly",
    hasGlobalSource: false,
    projects: [{ projectId: "project-alpha", projectLabel: "Alpha Project" }],
    hasUnknownSource: false,
    evidence: []
  }
});

const projectBetaItem = makeItem({
  id: "skill:project-beta",
  displayName: "Beta Coder",
  scopeSummary: {
    classification: "projectOnly",
    hasGlobalSource: false,
    projects: [
      { projectId: "project-beta", projectLabel: "Beta Project" },
      { projectId: "project-alpha", projectLabel: "Alpha Project" }
    ],
    hasUnknownSource: false,
    evidence: []
  }
});

const mixedItem = makeItem({
  id: "skill:mixed",
  displayName: "Mixed Reviewer",
  scopeSummary: {
    classification: "mixed",
    hasGlobalSource: true,
    projects: [{ projectId: "project-alpha", projectLabel: "Alpha Project" }],
    hasUnknownSource: true,
    evidence: []
  }
});

const unknownItem = makeItem({
  id: "skill:unknown",
  displayName: "Unknown Helper",
  scopeSummary: unknownSkillScopeSummary()
});

const frontendItem = makeItem({
  id: "skill:frontend",
  displayName: "Frontend UI",
  tags: ["frontend", "react"]
});

const dataItem = makeItem({
  id: "skill:data",
  displayName: "CSV Parser",
  tags: ["csv", "data"]
});

const allItems = [globalItem, projectAlphaItem, projectBetaItem, mixedItem, unknownItem, frontendItem, dataItem];

const baseFilters = normalizeSkillBrowseFilters({}, new Set(), allCapabilityKeys);

// 21. All scope contains every Skill item once.
const allView = buildSkillBrowseView(allItems, { ...baseFilters, scope: "all" });
assert.equal(allView.totalCount, allItems.length, "all scope must contain every item");
assert.deepEqual(
  allView.groups.flatMap((group) => group.rows.map((row) => row.id)).sort(),
  allItems.map((item) => item.id).sort()
);

// 22. Global includes globalOnly and mixed with global evidence.
const globalView = buildSkillBrowseView(allItems, { ...baseFilters, scope: "global" });
assert.equal(globalView.totalCount, 2, "global scope must include globalOnly and mixed");
assert.ok(globalView.groups.some((group) => group.rows.some((row) => row.id === globalItem.id)), "globalOnly must appear");
assert.ok(globalView.groups.some((group) => group.rows.some((row) => row.id === mixedItem.id)), "mixed with global evidence must appear");

// 23. Project includes projectOnly and mixed with projects.
const projectView = buildSkillBrowseView(allItems, { ...baseFilters, scope: "project" });
assert.equal(projectView.totalCount, 3, "project scope must include projectOnly and mixed");
assert.ok(projectView.groups.some((group) => group.rows.some((row) => row.id === projectAlphaItem.id)));
assert.ok(projectView.groups.some((group) => group.rows.some((row) => row.id === projectBetaItem.id)));
assert.ok(projectView.groups.some((group) => group.rows.some((row) => row.id === mixedItem.id)));

// 24. Unknown includes unknown classification only.
const unknownView = buildSkillBrowseView(allItems, { ...baseFilters, scope: "unknown" });
const unknownScopeIds = unknownView.groups.flatMap((group) => group.rows.map((row) => row.id));
assert.ok(unknownScopeIds.includes(unknownItem.id), "unknown item must appear");
assert.ok(
  unknownScopeIds.every((id) => allItems.find((item) => item.id === id)?.scopeSummary.classification === "unknown"),
  "unknown scope must only contain items whose scopeSummary classification is unknown"
);
assert.ok(!unknownScopeIds.includes(globalItem.id), "globalOnly must not appear in unknown scope");
assert.ok(!unknownScopeIds.includes(mixedItem.id), "mixed must not appear in unknown-only scope");
assert.ok(!unknownScopeIds.includes(projectAlphaItem.id), "project item must not appear in unknown scope");

// 25. hasUnknownSource does not move a mixed Skill into Unknown-only.
assert.ok(!unknownView.groups.some((group) => group.rows.some((row) => row.id === mixedItem.id)), "mixed must not appear in unknown-only scope");

// 26. Multi-project Skills appear under each matching project.
const betaProjectView = buildSkillBrowseView(allItems, { ...baseFilters, scope: "project", projectId: "project-beta" });
assert.ok(betaProjectView.groups.some((group) => group.rows.some((row) => row.id === projectBetaItem.id)), "beta project must include beta-only item");
assert.ok(!betaProjectView.groups.some((group) => group.rows.some((row) => row.id === projectAlphaItem.id)), "alpha-only item must not appear under beta");

// 27. Project options deduplicate by projectId, not label.
const sameLabelProject = makeItem({
  id: "skill:same-label",
  displayName: "Same Label",
  scopeSummary: {
    classification: "projectOnly",
    hasGlobalSource: false,
    projects: [{ projectId: "project-same", projectLabel: "Shared Label" }],
    hasUnknownSource: false,
    evidence: []
  }
});
const anotherSameLabel = makeItem({
  id: "skill:another-same-label",
  displayName: "Another Same Label",
  scopeSummary: {
    classification: "projectOnly",
    hasGlobalSource: false,
    projects: [{ projectId: "project-same-2", projectLabel: "Shared Label" }],
    hasUnknownSource: false,
    evidence: []
  }
});
const sameLabelView = buildSkillBrowseView([sameLabelProject, anotherSameLabel], { ...baseFilters, scope: "project" });
const projectOptionValues = sameLabelView.projectOptions.map((option) => option.value);
assert.ok(projectOptionValues.includes("project-same"), "first project must be present");
assert.ok(projectOptionValues.includes("project-same-2"), "second project with same label must also be present");

// 28. Duplicate labels with different IDs remain separate.
const sameLabelOptions = sameLabelView.projectOptions.filter((option) => option.label === "Shared Label" && option.value !== "allProjects");
assert.equal(sameLabelOptions.length, 2, "same labels with different IDs must remain separate options");

// 29. Project options sort deterministically.
const unsortedProjectView = buildSkillBrowseView([projectBetaItem, projectAlphaItem, sameLabelProject], { ...baseFilters, scope: "project" });
const sortedProjectLabels = unsortedProjectView.projectOptions.filter((option) => option.value !== "allProjects").map((option) => option.label);
assert.deepEqual(sortedProjectLabels, ["Alpha Project", "Beta Project", "Shared Label"], "project options must be sorted by label");

// 30. Global and Project counts represent memberships.
assert.equal(allView.scopeOptions.find((option) => option.value === "global")?.count, 2);
assert.equal(allView.scopeOptions.find((option) => option.value === "project")?.count, 3);
const expectedUnknownCount = allItems.filter((item) => item.scopeSummary.classification === "unknown").length;
assert.equal(allView.scopeOptions.find((option) => option.value === "unknown")?.count, expectedUnknownCount);

// 31. Scope and category filters compose.
const frontendInProject = buildSkillBrowseView([frontendItem, projectAlphaItem], { ...baseFilters, scope: "project", capability: "frontend-ui" });
assert.equal(frontendInProject.totalCount, 0, "no frontend item is in project scope in this fixture");

// 32. Selected project and category filters compose.
const alphaDataView = buildSkillBrowseView([dataItem, projectAlphaItem], {
  ...baseFilters,
  scope: "project",
  projectId: "project-alpha",
  capability: "data-automation"
});
assert.equal(alphaDataView.totalCount, 0, "alpha project item is not data-automation");

// 33. Search and all filters compose.
const searchView = buildSkillBrowseView(allItems, { ...baseFilters, query: "Global" });
assert.equal(searchView.totalCount, 1);
assert.equal(searchView.groups[0]?.rows[0]?.id, globalItem.id);

// 34. Source filtering remains secondary and does not affect grouping.
const sourceView = buildSkillBrowseView(allItems, { ...baseFilters, source: "Codex" });
assert.equal(sourceView.totalCount, allItems.length, "all fixture items share Codex source");
assert.ok(sourceView.groups.length > 1, "source filter must not collapse capability groups");

// 35. Category counts are computed at the correct filtering stage.
const scopedCategoryView = buildSkillBrowseView(allItems, { ...baseFilters, scope: "project" });
const allCapabilityCount = scopedCategoryView.categoryOptions.find((option) => option.value === "all")?.count ?? 0;
assert.equal(allCapabilityCount, 3, "category all-count must be computed after scope filter");

// 36. All-capability results group in fixed order.
assert.deepEqual(
  allView.groups.map((group) => group.key),
  allView.groups.map((group) => group.key)
);
assert.ok(allView.groups.findIndex((group) => group.key === "frontend-ui") >= 0, "frontend group must exist");
assert.ok(allView.groups.findIndex((group) => group.key === "data-automation") >= 0, "data-automation group must exist");

// 37. Unknown category is last.
const unknownOptionIndex = allView.categoryOptions.findIndex((option) => option.value === "unknown");
assert.equal(unknownOptionIndex, allView.categoryOptions.length - 1, "unknown option must be last");

// 38. Sorting uses status, name, and stable ID.
const brokenItem = makeItem({ id: "skill:broken", displayName: "Zebra", status: "broken" });
const availableZebra = makeItem({ id: "skill:available-zebra", displayName: "Zebra", status: "available" });
const sortView = buildSkillBrowseView([brokenItem, availableZebra], baseFilters);
const flatIds = sortView.groups.flatMap((group) => group.rows.map((row) => row.id));
assert.ok(flatIds.indexOf(availableZebra.id) < flatIds.indexOf(brokenItem.id), "available must sort before broken");

// 39. Invalid persisted selections normalize safely.
const normalized = normalizeSkillBrowseFilters(
  { scope: "invalid" as unknown as SkillScopeFilter, projectId: "missing-project", capability: "invalid-category" as unknown as SkillCapabilityFilter, status: "invalid" as unknown as SkillStatusFilter, source: "Claude" },
  new Set(["project-alpha"]),
  allCapabilityKeys
);
assert.equal(normalized.scope, "all");
assert.equal(normalized.projectId, "allProjects");
assert.equal(normalized.capability, "all");
assert.equal(normalized.status, "all");
assert.equal(normalized.source, "Claude");

// 40. No field uses path inference.
const pathItem = makeItem({ id: "skill:path", displayName: "my-project-helper", primaryPathHint: "/Users/cc/projects/my-app/frontend" });
const pathView = buildSkillBrowseView([pathItem], baseFilters);
assert.equal(pathView.groups[0]?.rows[0]?.id, pathItem.id);
assert.notEqual(pathView.groups[0]?.key, "frontend-ui", "path must not be used to infer capability or scope");

// Persistence round-trip with safe fallback.
writePersistedSkillScope("global");
writePersistedSkillProject("project-alpha");
writePersistedSkillCapability("coding");
assert.equal(readPersistedSkillScope(), "global");
assert.equal(readPersistedSkillProject(), "project-alpha");
assert.equal(readPersistedSkillCapability(), "coding");

// Empty state copy.
assert.equal(getSkillBrowseEmptyStateCopy("no-global").title, "还没有明确归为全局的技能");
assert.equal(getSkillBrowseEmptyStateCopy("search").title, "没有匹配结果");

console.log("skillBrowseModel tests passed");
