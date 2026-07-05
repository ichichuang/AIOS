import assert from "node:assert/strict";
import {
  buildCorpusScopeTabs,
  fallbackResourceCorpusSummary,
  getActiveResourceCorpusSummary,
  getCorpusEmptyMessage,
  getCorpusSourceLabel,
  getCorpusSourceMode,
  getResourceDetail,
  globalCorpusScope,
  listResourceCorpusScopes,
  listResourcesByScope,
  mapCorpusResourceToAiosResource,
  mergeResourceWithCorpusDetail,
  scopeToResourceQuery,
  type ResourceCorpusDetail,
  type ResourceCorpusResource,
  type ResourceCorpusScope,
  type ResourceCorpusSummary
} from "./resourceCorpus";

const fallbackSummary = await getActiveResourceCorpusSummary();
const fallbackScopes = await listResourceCorpusScopes();
const fallbackResources = await listResourcesByScope();

assert.deepEqual(fallbackSummary, fallbackResourceCorpusSummary);
assert.equal(fallbackScopes[0].id, "global");
assert.deepEqual(fallbackResources, []);
await assert.rejects(() => getResourceDetail("resource-1"), /Tauri 桌面运行时/);
assert.equal(getCorpusSourceMode(fallbackSummary), "legacy");
assert.equal(getCorpusSourceLabel("legacy"), "示例/Legacy snapshot");
assert.equal(getCorpusEmptyMessage("legacy"), "尚未扫描任何目录；请到扫描管理添加目录并手动开始扫描.");

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
assert.equal(getCorpusSourceMode(dynamicSummary), "dynamic");
assert.equal(getCorpusSourceLabel("dynamic"), "动态资源库");

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

console.log("resourceCorpus client tests passed");
