import assert from "node:assert/strict";
import {
  asLegacySnapshotDataSource,
  buildLocalResourceLibraryViewState,
  buildResourceDataSourceState,
  buildCorpusScopeTabs,
  fallbackResourceCorpusSummary,
  getActiveResourceCorpusSummary,
  getCorpusEmptyMessage,
  getCorpusSourceLabel,
  getCorpusSourceMode,
  getProjectResourceMap,
  getResourceDetail,
  getResourceInspectorProvenanceSummary,
  getScanSourceResourceMap,
  getScopeViewingLabel,
  globalCorpusScope,
  listResourceCorpusScopes,
  listResourcesByScope,
  markLegacySnapshotResource,
  mapCorpusResourceToAiosResource,
  mergeResourceWithCorpusDetail,
  shouldShowFirstRunOnboarding,
  scopeToResourceQuery,
  type ResourceCorpusDetail,
  type ResourceCorpusResource,
  type ResourceCorpusScope,
  type ResourceCorpusSummary,
  type ProjectResourceMapEntry,
  type ScanSourceResourceMapEntry
} from "./resourceCorpus";
import { buildResourcesByView, countResourcesByView, getModuleResourcesForDataSource, getViewCountsForDataSource } from "./filtering";
import { getResourceDisplay } from "../i18n/resourceText";
import { moduleEmptyStateCopy } from "../components/modules/moduleUtils";
import type { AiosResource } from "../types/inventory";

const fallbackSummary = await getActiveResourceCorpusSummary();
const fallbackScopes = await listResourceCorpusScopes();
const fallbackResources = await listResourcesByScope();
const fallbackProjectMap = await getProjectResourceMap();
const fallbackSourceMap = await getScanSourceResourceMap();

assert.deepEqual(fallbackSummary, fallbackResourceCorpusSummary);
assert.equal(fallbackScopes[0].id, "global");
assert.deepEqual(fallbackResources, []);
assert.deepEqual(fallbackProjectMap, []);
assert.deepEqual(fallbackSourceMap, []);
await assert.rejects(() => getResourceDetail("resource-1"), /Tauri 桌面运行时/);
assert.equal(getCorpusSourceMode(fallbackSummary), "empty");
assert.equal(getCorpusSourceLabel("empty"), "还没有查找");
assert.equal(getCorpusEmptyMessage("empty"), "还没有查找这台电脑上的 AI 技能和 MCP 工具；请从首页开始查找或在高级里手动选择文件夹。");
assert.equal(shouldShowFirstRunOnboarding(fallbackSummary, false), true);
assert.equal(shouldShowFirstRunOnboarding(fallbackSummary, true), false);
assert.equal(moduleEmptyStateCopy("skills").body, "开始查找后，这里会显示技能名称、用途、来源和使用方法。");
assert.equal(moduleEmptyStateCopy("mcp").body, "开始查找后，这里会显示本机已配置的 MCP 服务和工具。");

const emptyLibraryView = buildLocalResourceLibraryViewState(fallbackSummary, globalCorpusScope, "empty");
assert.equal(emptyLibraryView.statusLabel, "还没有查找");
assert.equal(emptyLibraryView.dynamicResourceCount, 0);
assert.equal(emptyLibraryView.scanSourceCount, 0);
assert.equal(emptyLibraryView.projectScopeCount, 0);
assert.equal(emptyLibraryView.activeScopeLabel, "正在查看：全部本机结果");
assert.equal(emptyLibraryView.scanManagementCtaVisible, true);
assert.deepEqual(emptyLibraryView.firstUseActions, ["开始查找", "手动选择文件夹"]);

const emptyDataSource = buildResourceDataSourceState(fallbackSummary, 4);
assert.deepEqual(emptyDataSource, {
  activeSource: "empty",
  dynamicResourceCount: 0,
  legacySnapshotCount: 4,
  hasDynamicCorpus: false,
  hasLegacySnapshot: true,
  displayLabel: "还没有查找"
});

const projectScope: ResourceCorpusScope = {
  id: "project:aios",
  scopeKind: "project",
  label: "AIOS",
  description: "项目 scope：AIOS",
  resourceCount: 2,
  projectLabel: "AIOS",
  scanSourceId: null,
  rootDisplayPath: "~/AIOS",
  profileId: "project-root",
  enabled: null
};
const sourceScope: ResourceCorpusScope = {
  id: "source:fixture",
  scopeKind: "source",
  label: "custom-scan-basic",
  description: "~/custom-scan-basic",
  resourceCount: 2,
  projectLabel: "AIOS",
  scanSourceId: "scan-source:fixture",
  rootDisplayPath: "~/custom-scan-basic",
  profileId: "project-root",
  enabled: true
};
const dynamicSummary: ResourceCorpusSummary = {
  ...fallbackResourceCorpusSummary,
  sourceCount: 1,
  enabledSourceCount: 1,
  projectScopeCount: 1,
  resourceCount: 2,
  locationCount: 2,
  countsByScope: [
    { scopeId: "global", scopeKind: "global", label: "全局", count: 2 },
    { scopeId: projectScope.id, scopeKind: "project", label: "AIOS", count: 2 }
  ]
};
const tabs = buildCorpusScopeTabs([globalCorpusScope, projectScope, sourceScope], dynamicSummary);
assert.equal(tabs.length, 3);
assert.equal(tabs[1].label, "AIOS");
assert.deepEqual(scopeToResourceQuery(projectScope, 20), {
  scopeKind: "project",
  scopeId: "project:aios",
  projectLabel: "AIOS",
  scanSourceId: null,
  limit: 20,
  offset: 0
});
assert.equal(getCorpusSourceMode(dynamicSummary), "dynamic-corpus");
assert.equal(getCorpusSourceLabel("dynamic-corpus"), "本机结果");
assert.equal(shouldShowFirstRunOnboarding(dynamicSummary, false), false);
const dynamicDataSource = buildResourceDataSourceState(dynamicSummary, 4);
assert.equal(dynamicDataSource.activeSource, "dynamic-corpus");
assert.equal(dynamicDataSource.displayLabel, "本机结果");
assert.equal(getScopeViewingLabel(globalCorpusScope, "dynamic-corpus"), "正在查看：全部本机结果");
assert.equal(getScopeViewingLabel(projectScope, "dynamic-corpus"), "正在查看项目：AIOS");
assert.equal(getScopeViewingLabel(sourceScope, "dynamic-corpus"), "正在查看来源：custom-scan-basic");

const projectMapEntry: ProjectResourceMapEntry = {
  scopeId: projectScope.id,
  projectLabel: "AIOS",
  directories: [
    {
      scanSourceId: "scan-source:fixture",
      displayName: "custom-scan-basic",
      rootDisplayPath: "~/custom-scan-basic",
      profileId: "project-root",
      sourceKind: "custom-directory",
      enabled: true,
      resourceCount: 2,
      skippedEntries: 1,
      errorCount: 0,
      lastScanStatus: "completed",
      lastScanFinishedAtMs: 1_725_000_001_000
    }
  ],
  resourceCount: 2,
  countsByKind: [
    { resourceKind: "skill", count: 1 },
    { resourceKind: "script", count: 1 }
  ],
  lastScanStatus: "completed",
  lastScanFinishedAtMs: 1_725_000_001_000,
  skippedEntries: 1,
  errorCount: 0,
  metadataOnly: true
};
const sourceMapEntry: ScanSourceResourceMapEntry = {
  scopeId: sourceScope.id,
  scanSourceId: "scan-source:fixture",
  displayName: "custom-scan-basic",
  rootDisplayPath: "~/custom-scan-basic",
  profileId: "project-root",
  sourceKind: "custom-directory",
  projectLabel: "AIOS",
  enabled: true,
  resourceCount: 2,
  countsByKind: [
    { resourceKind: "skill", count: 1 },
    { resourceKind: "script", count: 1 }
  ],
  lastScanStatus: "completed",
  lastScanFinishedAtMs: 1_725_000_001_000,
  skippedEntries: 1,
  errorCount: 0,
  metadataOnly: true
};
assert.equal(projectMapEntry.projectLabel, "AIOS");
assert.equal(projectMapEntry.directories[0].rootDisplayPath, "~/custom-scan-basic");
assert.equal(projectMapEntry.countsByKind[0].resourceKind, "skill");
assert.equal(sourceMapEntry.displayName, "custom-scan-basic");
assert.equal(sourceMapEntry.projectLabel, "AIOS");

const noResourceSummary: ResourceCorpusSummary = {
  ...dynamicSummary,
  resourceCount: 0
};
assert.equal(shouldShowFirstRunOnboarding(noResourceSummary, false), true);

const corpusResource: ResourceCorpusResource = {
  id: "resource:skill",
  stableKey: "scan-source:fixture\u001fproject-root\u001fskill\u001fskills/writer/SKILL.md",
  name: "SKILL.md",
  resourceKind: "skill",
  description: "路径或文件名匹配技能资源。",
  primaryType: "file",
  riskLevel: "low",
  boundaryLabels: ["read-only", "no-content-read"],
  updatedAtMs: 1_725_000_000_000,
  locationId: "location:skill",
  scanSourceId: "scan-source:fixture",
  scanSourceName: "custom-scan-basic",
  sourceKind: "custom-directory",
  scanSourceEnabled: true,
  projectLabel: "AIOS",
  rootDisplayPath: "~/custom-scan-basic",
  profileId: "project-root",
  scanJobId: "job-1",
  scanJobStatus: "completed",
  scanJobStartedAtMs: 1_725_000_000_000,
  scanJobFinishedAtMs: 1_725_000_001_000,
  relativePath: "skills/writer/SKILL.md",
  displayPath: "skills/writer/SKILL.md",
  extension: "md",
  entryType: "file",
  sizeBytes: 128,
  modifiedAtMs: 1_725_000_000_000,
  classificationReason: "路径或文件名匹配技能资源。",
  sensitivePathRedacted: false
};
const mapped = mapCorpusResourceToAiosResource(corpusResource);
assert.equal(mapped.id, "corpus:resource:skill");
assert.equal(mapped.capabilityType, "skill");
assert.equal(mapped.metadata?.corpusSource, "dynamic-resource-corpus");
assert.equal(mapped.metadata?.projectLabel, "AIOS");
assert.equal(mapped.metadata?.rootDisplayPath, "~/custom-scan-basic");
assert.equal(mapped.safetyProfile.readOnly, true);
assert.ok(mapped.safetyProfile.notes.includes("仅保存持久化元数据"));
assert.deepEqual(getResourceInspectorProvenanceSummary(mapped), {
  dataSourceType: "本机结果",
  projectLabel: "AIOS",
  scanSourceName: "custom-scan-basic",
  scanSourceDirectory: "~/custom-scan-basic",
  relativePath: "skills/writer/SKILL.md",
  profileLabel: "项目根目录",
  lastScanLabel: "completed · job-1",
  metadataBoundary: "仅展示应用自己保存的基本信息，不读取文件内容"
});

const detail: ResourceCorpusDetail = {
  resource: corpusResource,
  locations: [
    {
      id: "location:skill",
      scanSourceId: "scan-source:fixture",
      scanSourceName: "custom-scan-basic",
      projectLabel: "AIOS",
      rootDisplayPath: "~/custom-scan-basic",
      profileId: "project-root",
      scanJobId: "job-1",
      scanJobStatus: "completed",
      relativePath: "skills/writer/SKILL.md",
      displayPath: "skills/writer/SKILL.md",
      extension: "md",
      entryType: "file",
      sizeBytes: 128,
      modifiedAtMs: 1_725_000_000_000,
      classificationReason: "路径或文件名匹配技能资源。",
      sensitivePathRedacted: false
    }
  ],
  findings: [],
  metadataOnly: true,
  contentStorageEnabled: false
};
const merged = mergeResourceWithCorpusDetail(mapped, detail);
assert.equal(merged.metadata?.corpusDetailLoaded, true);
assert.equal((merged.metadata?.corpusDetailLocations as unknown[]).length, 1);

const legacyTabs = buildCorpusScopeTabs([globalCorpusScope, projectScope], fallbackResourceCorpusSummary);
assert.equal(legacyTabs.length, 1);
assert.equal(legacyTabs[0].label, "全局");
assert.equal(getScopeViewingLabel(globalCorpusScope, "legacy-snapshot"), "正在查看历史示例");

const dynamicSkill = {
  id: "dynamic-skill",
  name: "dynamic-skill",
  toolType: "project-local",
  capabilityType: "skill",
  status: "available",
  risk: "low",
  paths: [],
  description: "dynamic skill",
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
    reason: "fixture"
  },
  prompts: [],
  metadata: {
    corpusSource: "dynamic-resource-corpus"
  }
} satisfies AiosResource;
const dynamicScript = {
  ...dynamicSkill,
  id: "dynamic-script",
  name: "dynamic-script",
  toolType: "script",
  capabilityType: "script",
  metadata: {
    corpusSource: "dynamic-resource-corpus"
  }
} satisfies AiosResource;
const dynamicPrompt = makeDynamicCorpusResource({
  id: "dynamic-prompt",
  name: "draft.prompt.md",
  capabilityType: "usage-prompt",
  toolType: "project-local",
  projectLabel: "Project Alpha",
  scanSourceId: "source-alpha",
  scanSourceName: "alpha-workspace"
});
const legacySnapshotSkill = {
  ...dynamicSkill,
  id: "legacy-skill",
  name: "legacy-skill",
  metadata: {
    corpusSource: "legacy-snapshot"
  }
} satisfies AiosResource;
const legacySnapshotPrompt = {
  ...dynamicSkill,
  id: "legacy-prompt",
  name: "legacy-prompt",
  toolType: "legacy",
  capabilityType: "usage-prompt",
  metadata: {
    corpusSource: "legacy-snapshot"
  }
} satisfies AiosResource;
const markedLegacySnapshotSkill = markLegacySnapshotResource(dynamicSkill, "2026-07-05T00:00:00.000Z");
assert.equal(markedLegacySnapshotSkill.id, "legacy-snapshot:dynamic-skill");
assert.equal(markedLegacySnapshotSkill.metadata?.corpusSource, "legacy-snapshot");
assert.equal(markedLegacySnapshotSkill.metadata?.legacySnapshot, true);

const emptyCounts = getViewCountsForDataSource(emptyDataSource, [dynamicSkill], [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(emptyCounts.dashboard, 0);
assert.equal(emptyCounts.skills, 0);
assert.equal(emptyCounts.mcp, 0);
assert.equal(emptyCounts.advanced, 0);
assert.equal(emptyCounts.scripts, 0);
assert.equal(emptyCounts.reports, 0);
assert.equal(emptyCounts["project-packs"], 0);
assert.equal(emptyCounts.policies, 0);
assert.equal(emptyCounts.validators, 0);
assert.equal(emptyCounts.legacy, 0);
assert.deepEqual(getModuleResourcesForDataSource("skills", emptyDataSource, [dynamicSkill], [legacySnapshotSkill]), []);
assert.deepEqual(getModuleResourcesForDataSource("legacy", emptyDataSource, [dynamicSkill], [legacySnapshotSkill, legacySnapshotPrompt]), [legacySnapshotSkill, legacySnapshotPrompt]);

const legacyOnlyCounts = countResourcesByView(buildResourcesByView([legacySnapshotSkill, legacySnapshotPrompt]));
assert.equal(legacyOnlyCounts.dashboard, 2);
assert.equal(legacyOnlyCounts.skills, 1);
assert.equal(emptyCounts.dashboard, 0, "legacy snapshot must not affect default dashboard count");

const dynamicCounts = getViewCountsForDataSource(dynamicDataSource, [dynamicSkill, dynamicScript], [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(dynamicCounts.dashboard, 2);
assert.equal(dynamicCounts.skills, 1);
assert.equal(dynamicCounts.advanced, 1);
assert.equal(dynamicCounts.scripts, 1);
assert.equal(dynamicCounts.legacy, 0);
assert.deepEqual(getModuleResourcesForDataSource("skills", dynamicDataSource, [dynamicSkill, dynamicScript], [legacySnapshotSkill]), [dynamicSkill]);
assert.deepEqual(getModuleResourcesForDataSource("legacy", dynamicDataSource, [dynamicSkill], [legacySnapshotSkill, legacySnapshotPrompt]), [legacySnapshotSkill, legacySnapshotPrompt]);

const promptCounts = getViewCountsForDataSource(dynamicDataSource, [dynamicPrompt], [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(promptCounts.dashboard, 1);
assert.equal(promptCounts.advanced, 1);
assert.equal(promptCounts.legacy, 0, "dynamic prompt metadata must not appear as Legacy count");
assert.equal(getResourceDisplay(dynamicPrompt).uiGroup, "dashboard", "dynamic prompt metadata must not be labeled as Legacy UI data");

const legacyModeCounts = getViewCountsForDataSource(asLegacySnapshotDataSource(dynamicDataSource), [], [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(legacyModeCounts.dashboard, 0);
assert.equal(legacyModeCounts.skills, 0);
assert.equal(legacyModeCounts.advanced, 0);
assert.equal(legacyModeCounts.legacy, 0, "navigation counts must stay dynamic-only even when viewing Legacy");

const projectAlphaScope: ResourceCorpusScope = {
  id: "project:alpha",
  scopeKind: "project",
  label: "Project Alpha",
  description: "项目 scope：Project Alpha",
  resourceCount: 3,
  projectLabel: "Project Alpha",
  scanSourceId: null,
  rootDisplayPath: "~/alpha-workspace",
  profileId: "project-root",
  enabled: null
};
const sourceAlphaScope: ResourceCorpusScope = {
  id: "source:alpha",
  scopeKind: "source",
  label: "alpha-workspace",
  description: "~/alpha-workspace",
  resourceCount: 3,
  projectLabel: "Project Alpha",
  scanSourceId: "source-alpha",
  rootDisplayPath: "~/alpha-workspace",
  profileId: "project-root",
  enabled: true
};
const projectBetaScope: ResourceCorpusScope = {
  id: "project:beta",
  scopeKind: "project",
  label: "Project Beta",
  description: "项目 scope：Project Beta",
  resourceCount: 4,
  projectLabel: "Project Beta",
  scanSourceId: null,
  rootDisplayPath: "~/beta-tooling",
  profileId: "ai-toolchain",
  enabled: null
};
const sourceBetaScope: ResourceCorpusScope = {
  id: "source:beta",
  scopeKind: "source",
  label: "beta-tooling",
  description: "~/beta-tooling",
  resourceCount: 4,
  projectLabel: "Project Beta",
  scanSourceId: "source-beta",
  rootDisplayPath: "~/beta-tooling",
  profileId: "ai-toolchain",
  enabled: true
};
const twoProjectSummary: ResourceCorpusSummary = {
  ...fallbackResourceCorpusSummary,
  sourceCount: 2,
  enabledSourceCount: 2,
  projectScopeCount: 2,
  resourceCount: 7,
  locationCount: 7,
  countsByKind: [
    { resourceKind: "skill", count: 1 },
    { resourceKind: "prompt", count: 1 },
    { resourceKind: "script", count: 1 },
    { resourceKind: "mcp-config", count: 1 },
    { resourceKind: "policy-governance", count: 1 },
    { resourceKind: "validator", count: 1 },
    { resourceKind: "report-doc", count: 1 }
  ],
  countsByScope: [
    { scopeId: "global", scopeKind: "global", label: "全局", count: 7 },
    { scopeId: projectAlphaScope.id, scopeKind: "project", label: projectAlphaScope.label, count: 3 },
    { scopeId: projectBetaScope.id, scopeKind: "project", label: projectBetaScope.label, count: 4 },
    { scopeId: sourceAlphaScope.id, scopeKind: "source", label: sourceAlphaScope.label, count: 3 },
    { scopeId: sourceBetaScope.id, scopeKind: "source", label: sourceBetaScope.label, count: 4 }
  ]
};
const projectAlphaResources = [
  makeDynamicCorpusResource({ id: "alpha-skill", name: "writer/SKILL.md", capabilityType: "skill", toolType: "project-local", projectLabel: "Project Alpha", scanSourceId: "source-alpha", scanSourceName: "alpha-workspace" }),
  makeDynamicCorpusResource({ id: "alpha-script", name: "scan-helper.mjs", capabilityType: "script", toolType: "script", projectLabel: "Project Alpha", scanSourceId: "source-alpha", scanSourceName: "alpha-workspace" }),
  dynamicPrompt
];
const projectBetaResources = [
  makeDynamicCorpusResource({ id: "beta-mcp", name: "servers.json", capabilityType: "mcp-client", toolType: "mcp", projectLabel: "Project Beta", scanSourceId: "source-beta", scanSourceName: "beta-tooling" }),
  makeDynamicCorpusResource({ id: "beta-policy", name: "local-policy.md", capabilityType: "policy", toolType: "aios-root", projectLabel: "Project Beta", scanSourceId: "source-beta", scanSourceName: "beta-tooling" }),
  makeDynamicCorpusResource({ id: "beta-validator", name: "validate-basic.mjs", capabilityType: "validator", toolType: "validator", projectLabel: "Project Beta", scanSourceId: "source-beta", scanSourceName: "beta-tooling" }),
  makeDynamicCorpusResource({ id: "beta-report", name: "phase-2a.md", capabilityType: "report", toolType: "report", projectLabel: "Project Beta", scanSourceId: "source-beta", scanSourceName: "beta-tooling" })
];
const twoProjectResources = [...projectAlphaResources, ...projectBetaResources];
const twoProjectDataSource = buildResourceDataSourceState(twoProjectSummary, 2);
const twoProjectTabs = buildCorpusScopeTabs([{ ...globalCorpusScope, resourceCount: 7 }, projectAlphaScope, projectBetaScope, sourceAlphaScope, sourceBetaScope], twoProjectSummary);
assert.deepEqual(
  twoProjectTabs.map((tab) => `${tab.scope.scopeKind}:${tab.label}:${tab.count}`),
  ["global:全局:7", "project:Project Alpha:3", "project:Project Beta:4", "source:alpha-workspace:3", "source:beta-tooling:4"]
);
assert.deepEqual(scopeToResourceQuery(projectBetaScope, 25), {
  scopeKind: "project",
  scopeId: "project:beta",
  projectLabel: "Project Beta",
  scanSourceId: null,
  limit: 25,
  offset: 0
});
assert.deepEqual(scopeToResourceQuery(sourceAlphaScope, 25), {
  scopeKind: "source",
  scopeId: "source:alpha",
  projectLabel: "Project Alpha",
  scanSourceId: "source-alpha",
  limit: 25,
  offset: 0
});

const twoProjectGlobalCounts = getViewCountsForDataSource(twoProjectDataSource, twoProjectResources, [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(twoProjectGlobalCounts.dashboard, 7);
assert.equal(twoProjectGlobalCounts.skills, 1);
assert.equal(twoProjectGlobalCounts.mcp, 1);
assert.equal(twoProjectGlobalCounts.advanced, 5);
assert.equal(twoProjectGlobalCounts.scripts, 1);
assert.equal(twoProjectGlobalCounts.reports, 1);
assert.equal(twoProjectGlobalCounts["project-packs"], 0);
assert.equal(twoProjectGlobalCounts.policies, 1);
assert.equal(twoProjectGlobalCounts.validators, 1);
assert.equal(twoProjectGlobalCounts.legacy, 0);

const alphaCounts = getViewCountsForDataSource(twoProjectDataSource, projectAlphaResources, [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(alphaCounts.dashboard, 3);
assert.equal(alphaCounts.skills, 1);
assert.equal(alphaCounts.advanced, 2);
assert.equal(alphaCounts.scripts, 1);
assert.equal(alphaCounts.mcp, 0);
assert.equal(alphaCounts.policies, 0);
assert.equal(alphaCounts.validators, 0);
assert.equal(alphaCounts.legacy, 0);
assert.deepEqual(getModuleResourcesForDataSource("skills", twoProjectDataSource, projectAlphaResources, [legacySnapshotSkill]), [projectAlphaResources[0]]);
assert.deepEqual(getModuleResourcesForDataSource("mcp", twoProjectDataSource, projectAlphaResources, [legacySnapshotSkill]), []);

const betaCounts = getViewCountsForDataSource(twoProjectDataSource, projectBetaResources, [legacySnapshotSkill, legacySnapshotPrompt]);
assert.equal(betaCounts.dashboard, 4);
assert.equal(betaCounts.skills, 0);
assert.equal(betaCounts.mcp, 1);
assert.equal(betaCounts.advanced, 3);
assert.equal(betaCounts.scripts, 0);
assert.equal(betaCounts.reports, 1);
assert.equal(betaCounts.policies, 1);
assert.equal(betaCounts.validators, 1);
assert.equal(betaCounts.legacy, 0);
assert.deepEqual(getModuleResourcesForDataSource("mcp", twoProjectDataSource, projectBetaResources, [legacySnapshotSkill]), [projectBetaResources[0]]);
assert.deepEqual(getModuleResourcesForDataSource("skills", twoProjectDataSource, projectBetaResources, [legacySnapshotSkill]), []);

console.log("resourceCorpus client tests passed");

function makeDynamicCorpusResource(input: {
  id: string;
  name: string;
  capabilityType: AiosResource["capabilityType"];
  toolType: AiosResource["toolType"];
  projectLabel: string;
  scanSourceId: string;
  scanSourceName: string;
}): AiosResource {
  return {
    id: input.id,
    name: input.name,
    toolType: input.toolType,
    capabilityType: input.capabilityType,
    status: "available",
    risk: "low",
    paths: [input.name],
    path: input.name,
    description: `${input.name} dynamic metadata`,
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: "low",
      executionRisk: input.capabilityType === "script" || input.capabilityType === "validator" ? "medium" : "low",
      notes: ["仅保存持久化元数据"]
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "fixture"
    },
    prompts: [],
    metadata: {
      corpusSource: "dynamic-resource-corpus",
      corpusResourceId: input.id,
      projectLabel: input.projectLabel,
      scanSourceId: input.scanSourceId,
      scanSourceName: input.scanSourceName,
      scanProfileId: "project-root",
      scanJobId: `job-${input.scanSourceId}`,
      scanJobStatus: "completed",
      rootDisplayPath: `~/${input.scanSourceName}`,
      relativePath: input.name
    }
  };
}
