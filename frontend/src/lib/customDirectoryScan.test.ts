import assert from "node:assert/strict";
import {
  DEFAULT_SCAN_PROFILE_ID,
  applyScanJobProgressEvent,
  canStartScanMode,
  createFallbackScanJobSnapshot,
  fallbackScanProfiles,
  getScanProfileById,
  getScanModeById,
  isTerminalScanJobStatus,
  mapScanResourcesToAiosResources,
  nextScanModeState,
  scanLifecycleFromSnapshot,
  type ScanJobEventPayload,
  type CustomScanResult
} from "./customDirectoryScan";

const sampleResult: CustomScanResult = {
  policyId: "custom-directory-metadata-scan-mvp",
  rootDisplayName: "fixture",
  rootSummary: "~/AIOS/fixture",
  scannedAtMs: 1_725_000_000_000,
  counts: {
    visitedEntries: 5,
    returnedResources: 5,
    skippedByExclude: 0,
    skippedBySize: 0,
    skippedSymlinks: 0,
    deniedErrors: 0,
    truncated: false
  },
  warnings: [],
  resources: [
    {
      id: "custom-scan:skill:skills/writer/SKILL.md",
      relativePath: "skills/writer/SKILL.md",
      entryType: "file",
      extension: "md",
      sizeBytes: 128,
      modifiedAtMs: 1_725_000_000_000,
      resourceKind: "skill",
      riskLabels: ["metadata-only"],
      boundaryLabels: ["read-only", "no-content-read"],
      classificationReason: "路径或文件名匹配技能资源。",
      sensitive: false
    },
    {
      id: "custom-scan:validator:scripts/validate-aios.mjs",
      relativePath: "scripts/validate-aios.mjs",
      entryType: "file",
      extension: "mjs",
      sizeBytes: 256,
      modifiedAtMs: null,
      resourceKind: "validator",
      riskLabels: ["metadata-only", "execution-disabled"],
      boundaryLabels: ["read-only", "no-content-read", "not-executed"],
      classificationReason: "路径或文件名匹配验证器。",
      sensitive: false
    },
    {
      id: "custom-scan:unknown-local-resource:configs/[sensitive]",
      relativePath: "configs/[sensitive]",
      entryType: "file",
      extension: "env",
      sizeBytes: 64,
      modifiedAtMs: null,
      resourceKind: "unknown-local-resource",
      riskLabels: ["metadata-only", "sensitive-path-redacted"],
      boundaryLabels: ["read-only", "no-content-read", "redacted"],
      classificationReason: "未匹配已知 AIOS 资源类别，仅保留本地元数据。",
      sensitive: true
    },
    {
      id: "custom-scan:mcp-config:.mcp/servers.json",
      relativePath: ".mcp/servers.json",
      entryType: "file",
      extension: "json",
      sizeBytes: 64,
      modifiedAtMs: null,
      resourceKind: "mcp-config",
      riskLabels: ["metadata-only", "mcp-not-executed"],
      boundaryLabels: ["read-only", "no-content-read", "not-executed"],
      classificationReason: "路径或文件名匹配 MCP 配置元数据。",
      sensitive: false
    },
    {
      id: "custom-scan:policy-governance:policies/local-policy.md",
      relativePath: "policies/local-policy.md",
      entryType: "file",
      extension: "md",
      sizeBytes: 64,
      modifiedAtMs: null,
      resourceKind: "policy-governance",
      riskLabels: ["metadata-only"],
      boundaryLabels: ["read-only", "no-content-read"],
      classificationReason: "路径或文件名匹配策略治理资源。",
      sensitive: false
    }
  ]
};

const resources = mapScanResourcesToAiosResources(sampleResult);
const projectProfile = getScanProfileById("project-root");
const fallbackProfile = getScanProfileById(undefined);

assert.equal(resources.length, 5);
assert.equal(fallbackScanProfiles.length, 8);
assert.equal(fallbackProfile.id, DEFAULT_SCAN_PROFILE_ID);
assert.equal(projectProfile.id, "project-root");
assert.ok(projectProfile.emphasizedResourceKinds.includes("package-manifest"));
assert.equal(resources[0].capabilityType, "skill");
assert.equal(resources[0].toolType, "project-local");
assert.equal(resources[0].metadata?.scanProfileId, DEFAULT_SCAN_PROFILE_ID);
assert.equal(resources[0].metadata?.scanProfileName, fallbackProfile.displayName);
assert.equal(resources[1].capabilityType, "validator");
assert.equal(resources[1].safetyProfile.executionRisk, "medium");
assert.equal(resources[2].path, "configs/[sensitive]");
assert.equal(resources[2].status, "warn");
assert.equal(resources[2].risk, "medium");
assert.equal(resources[2].safetyProfile.secretExposureRisk, "medium");
assert.equal(resources[3].capabilityType, "mcp-client");
assert.equal(resources[3].safetyProfile.executionRisk, "low");
assert.equal(resources[4].capabilityType, "policy");
assert.ok(resources.every((resource) => resource.metadata?.sourceKind === "custom-directory-scan"));

const defaultMode = getScanModeById(undefined);
const intelligentMode = getScanModeById("intelligent-discovery");
const advancedMode = getScanModeById("advanced-full-disk");
assert.equal(defaultMode.id, "custom-directory");
assert.equal(intelligentMode.sourceKind, "intelligent-discovery");
assert.equal(advancedMode.requiresConfirmation, true);
assert.equal(canStartScanMode("custom-directory", { hasSelectedSources: true, advancedConfirmed: false, tauriAvailable: true, scanLocked: false }), true);
assert.equal(canStartScanMode("custom-directory", { hasSelectedSources: false, advancedConfirmed: false, tauriAvailable: true, scanLocked: false }), false);
assert.equal(canStartScanMode("intelligent-discovery", { hasSelectedSources: false, advancedConfirmed: false, tauriAvailable: true, scanLocked: false }), true);
assert.equal(canStartScanMode("advanced-full-disk", { hasSelectedSources: false, advancedConfirmed: false, tauriAvailable: true, scanLocked: false }), false);
assert.equal(canStartScanMode("advanced-full-disk", { hasSelectedSources: false, advancedConfirmed: true, tauriAvailable: true, scanLocked: false }), true);
assert.deepEqual(nextScanModeState("advanced-full-disk", { advancedConfirmed: true }), { modeId: "advanced-full-disk", advancedConfirmed: false });

const fallbackSnapshot = createFallbackScanJobSnapshot("job-1", "project-root");
assert.equal(fallbackSnapshot.status, "queued");
assert.equal(fallbackSnapshot.progress.profileId, "project-root");
assert.equal(scanLifecycleFromSnapshot(null, false, false), "idle");
assert.equal(scanLifecycleFromSnapshot(null, true, false), "directory-selected");
assert.equal(scanLifecycleFromSnapshot({ ...fallbackSnapshot, status: "running" }, true, false), "running");
assert.equal(scanLifecycleFromSnapshot({ ...fallbackSnapshot, status: "cancelling" }, true, false), "cancelling");
assert.equal(scanLifecycleFromSnapshot({ ...fallbackSnapshot, status: "completed" }, true, false), "completed");
assert.equal(scanLifecycleFromSnapshot({ ...fallbackSnapshot, status: "cancelled" }, true, false), "cancelled");
assert.equal(scanLifecycleFromSnapshot({ ...fallbackSnapshot, status: "failed" }, true, false), "failed");
assert.equal(scanLifecycleFromSnapshot(null, true, true), "failed");
assert.equal(isTerminalScanJobStatus("completed"), true);
assert.equal(isTerminalScanJobStatus("cancelled"), true);
assert.equal(isTerminalScanJobStatus("failed"), true);
assert.equal(isTerminalScanJobStatus("running"), false);

const progressEvent: ScanJobEventPayload = {
  jobId: "job-1",
  status: "running",
  progress: {
    visitedEntries: 12,
    matchedResources: 5,
    skippedEntries: 7,
    elapsedMs: 320,
    currentPhase: "walking",
    profileId: "project-root",
    maxEntries: 2_000,
    maxDepth: 6,
    truncated: false,
    cancellationRequested: false
  },
  error: null
};
const mergedSnapshot = applyScanJobProgressEvent(fallbackSnapshot, progressEvent);
assert.equal(mergedSnapshot.status, "running");
assert.equal(mergedSnapshot.progress.visitedEntries, 12);
assert.equal(mergedSnapshot.progress.matchedResources, 5);
assert.equal(mergedSnapshot.progress.skippedEntries, 7);
assert.equal(mergedSnapshot.result, null);

console.log("customDirectoryScan mapper tests passed");
