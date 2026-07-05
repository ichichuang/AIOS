import assert from "node:assert/strict";
import {
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
assert.equal(getCorpusSourceLabel("empty"), "空资源库");
assert.equal(getCorpusEmptyMessage("empty"), "尚未扫描任何目录；请到扫描管理添加项目目录或运行智能发现。");
assert.equal(shouldShowFirstRunOnboarding(fallbackSummary, false), true);
assert.equal(shouldShowFirstRunOnboarding(fallbackSummary, true), false);
assert.equal(moduleEmptyStateCopy("skills").body, "尚未发现 Skills；请到扫描管理添加项目目录或运行智能发现。");
assert.equal(moduleEmptyStateCopy("mcp").body, "尚未发现 MCP metadata。");

const emptyLibraryView = buildLocalResourceLibraryViewState(fallbackSummary, globalCorpusScope, "empty");
assert.equal(emptyLibraryView.statusLabel, "空资源库");
assert.equal(emptyLibraryView.dynamicResourceCount, 0);
assert.equal(emptyLibraryView.scanSourceCount, 0);
assert.equal(emptyLibraryView.projectScopeCount, 0);
assert.equal(emptyLibraryView.activeScopeLabel, "正在查看：全局本地资源库");
assert.equal(emptyLibraryView.scanManagementCtaVisible, true);
assert.deepEqual(emptyLibraryView.firstUseActions, ["添加自选目录", "查看智能发现"]);

const emptyDataSource = buildResourceDataSourceState(fallbackSummary, 4);
assert.deepEqual(emptyDataSource, {
  activeSource: "empty",
  dynamicResourceCount: 0,
  legacySnapshotCount: 4,
  hasDynamicCorpus: false,
  hasLegacySnapshot: true,
  displayLabel: "空资源库"
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
assert.equal(getCorpusSourceLabel("dynamic-corpus"), "动态资源库");
assert.equal(shouldShowFirstRunOnboarding(dynamicSummary, false), false);
const dynamicDataSource = buildResourceDataSourceState(dynamicSummary, 4);
assert.equal(dynamicDataSource.activeSource, "dynamic-corpus");
assert.equal(dynamicDataSource.displayLabel, "动态资源库");
assert.equal(getScopeViewingLabel(globalCorpusScope, "dynamic-corpus"), "正在查看：全局本地资源库");
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
assert.ok(mapped.safetyProfile.notes.includes("metadata-only persistence"));
assert.deepEqual(getResourceInspectorProvenanceSummary(mapped), {
  dataSourceType: "动态本地资源库",
  projectLabel: "AIOS",
  scanSourceName: "custom-scan-basic",
  scanSourceDirectory: "~/custom-scan-basic",
  relativePath: "skills/writer/SKILL.md",
  profileLabel: "项目根目录",
  lastScanLabel: "completed · job-1",
  metadataBoundary: "仅展示 SQLite 持久化元数据，不读取文件内容"
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
assert.equal(getScopeViewingLabel(globalCorpusScope, "legacy-snapshot"), "正在查看 Legacy 示例快照");

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
assert.equal(dynamicCounts.scripts, 1);
assert.equal(dynamicCounts.legacy, 0);
assert.deepEqual(getModuleResourcesForDataSource("skills", dynamicDataSource, [dynamicSkill, dynamicScript], [legacySnapshotSkill]), [dynamicSkill]);
assert.deepEqual(getModuleResourcesForDataSource("legacy", dynamicDataSource, [dynamicSkill], [legacySnapshotSkill, legacySnapshotPrompt]), [legacySnapshotSkill, legacySnapshotPrompt]);

console.log("resourceCorpus client tests passed");
