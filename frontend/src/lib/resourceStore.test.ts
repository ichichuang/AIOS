import assert from "node:assert/strict";
import {
  buildPersistedLibraryState,
  buildDiscoveryResultStats,
  buildSelectedBatchSourceIds,
  clearResourceLibrary,
  fallbackResourceLibrarySummary,
  getResourceLibrarySummary,
  getResourceStoreStatus,
  isTerminalScanBatchStatus,
  listPersistedResources,
  listPersistedScanJobs,
  listScanSources,
  normalizeResourceKindCounts,
  patchSourceInList,
  scanBatchProgressPercent,
  scanBatchStatusLabel,
  startScanSourcesBatch,
  type PersistedScanJob,
  type PersistedScanSource,
  type ScanBatchSnapshot,
  type ResourceLibrarySummary
} from "./resourceStore";

const fallbackStatus = await getResourceStoreStatus();
const fallbackSummary = await getResourceLibrarySummary();
const fallbackSources = await listScanSources();
const fallbackJobs = await listPersistedScanJobs();
const fallbackResources = await listPersistedResources();
const clearedSummary = await clearResourceLibrary();

assert.equal(fallbackStatus.databaseReady, false);
assert.equal(fallbackStatus.metadataOnly, true);
assert.equal(fallbackStatus.contentStorageEnabled, false);
assert.equal(fallbackStatus.enabledSourceCount, 0);
assert.deepEqual(fallbackSummary, fallbackResourceLibrarySummary);
assert.deepEqual(fallbackSources, []);
assert.deepEqual(fallbackJobs, []);
assert.deepEqual(fallbackResources, []);
assert.deepEqual(clearedSummary, fallbackResourceLibrarySummary);
await assert.rejects(() => startScanSourcesBatch(["source-1"]), /Tauri 桌面运行时/);
await assert.rejects(() => startScanSourcesBatch(["source-1"], { advancedConfirmationAccepted: true }), /Tauri 桌面运行时/);

const counts = normalizeResourceKindCounts([
  { resourceKind: "skill", count: 2 },
  { resourceKind: "skill", count: 3 },
  { resourceKind: "script", count: -1 },
  { resourceKind: "prompt", count: Number.NaN }
]);
assert.deepEqual(counts, [
  { resourceKind: "skill", count: 5 },
  { resourceKind: "prompt", count: 0 },
  { resourceKind: "script", count: 0 }
]);

const latestJob: PersistedScanJob = {
  id: "job-2",
  status: "completed",
  profileId: "project-root",
  startedAtMs: 1_725_000_000_000,
  finishedAtMs: 1_725_000_001_000,
  elapsedMs: 1_000,
  requestedBy: "custom-directory-scan",
  totalEntries: 12,
  matchedResources: 4,
  skippedEntries: 2,
  errorCount: 0,
  cancelled: false,
  rootDisplayPath: "~/custom-scan-basic"
};
const source: PersistedScanSource = {
  id: "scan-source:test",
  displayName: "custom-scan-basic",
  rootDisplayPath: "~/custom-scan-basic",
  profileId: "project-root",
  sourceKind: "custom-directory",
  projectLabel: "AIOS",
  enabled: true,
  createdAtMs: 1_725_000_000_000,
  updatedAtMs: 1_725_000_001_000,
  lastScanJobId: "job-2",
  lastScanStatus: "completed",
  lastScanFinishedAtMs: 1_725_000_001_000,
  resourceCount: 4,
  skippedEntries: 2,
  errorCount: 0
};
const summary: ResourceLibrarySummary = {
  ...fallbackResourceLibrarySummary,
  sourceCount: 1,
  enabledSourceCount: 1,
  jobCount: 2,
  resourceCount: 4,
  locationCount: 4,
  latestJob,
  latestSuccessfulScan: latestJob,
  countsByKind: [
    { resourceKind: "skill", count: 2 },
    { resourceKind: "script", count: 1 },
    { resourceKind: "unknown-local-resource", count: 1 }
  ],
  skipCountsByReason: [
    { reason: "excluded_directory", count: 2 },
    { reason: "permission_denied", count: 1 }
  ],
  skippedEntryTotal: 2,
  errorTotal: 0
};

const state = buildPersistedLibraryState(summary, [source], [latestJob], [source.id]);
assert.equal(state.canClear, true);
assert.equal(state.latestJobLabel, "completed · ~/custom-scan-basic");
assert.ok(state.latestSuccessfulScanLabel.includes("2024"));
assert.equal(state.sourceRows[0].primary, "custom-scan-basic");
assert.equal(state.sourceRows[0].secondary, "~/custom-scan-basic · AIOS · project-root");
assert.equal(state.sourceRows[0].selected, true);
assert.equal(state.sourceRows[0].statusLabel, "已完成");
assert.equal(state.sourceRows[0].resourceCount, 4);
assert.equal(state.categoryRows[0].label, "技能");
assert.equal(state.categoryRows[0].count, 2);

const disabledSource: PersistedScanSource = { ...source, id: "scan-source:disabled", enabled: false };
assert.deepEqual(buildSelectedBatchSourceIds([source, disabledSource], [source.id, disabledSource.id]), [source.id]);
assert.equal(patchSourceInList([source], { ...source, projectLabel: "Renamed" })[0].projectLabel, "Renamed");

const batchSnapshot: ScanBatchSnapshot = {
  batchId: "batch-1",
  status: "running",
  startedAtMs: 1,
  updatedAtMs: 2,
  completedAtMs: null,
  totalSources: 4,
  completedSources: 1,
  cancelledSources: 0,
  failedSources: 0,
  activeSourceId: source.id,
  progress: {
    completedSources: 1,
    totalSources: 4,
    activeVisitedEntries: 12,
    activeMatchedResources: 3,
    activeSkippedEntries: 2,
    elapsedMs: 500,
    cancellationRequested: false
  },
  sources: [],
  error: null
};
assert.equal(scanBatchProgressPercent(batchSnapshot), 25);
assert.equal(scanBatchStatusLabel("running"), "扫描中");
assert.equal(isTerminalScanBatchStatus("completed"), true);
assert.equal(isTerminalScanBatchStatus("running"), false);

const discoveryStats = buildDiscoveryResultStats(summary, [source], {
  ...batchSnapshot,
  status: "completed",
  startedAtMs: 1_725_000_000_000,
  updatedAtMs: 1_725_000_001_000,
  completedAtMs: 1_725_000_001_000
});
assert.equal(discoveryStats.totalResources, 4);
assert.equal(discoveryStats.scannedSources, 1);
assert.equal(discoveryStats.skippedEntries, 2);
assert.equal(discoveryStats.excludedCount, 2);
assert.equal(discoveryStats.permissionDeniedCount, 1);
assert.equal(discoveryStats.errors, 0);
assert.equal(discoveryStats.elapsedSeconds, 1);
assert.equal(discoveryStats.storedLibraryCount, 4);
assert.deepEqual(discoveryStats.resourcesByKind.slice(0, 2), [
  { resourceKind: "skill", label: "技能", count: 2 },
  { resourceKind: "script", label: "脚本", count: 1 }
]);

const emptyState = buildPersistedLibraryState(fallbackResourceLibrarySummary, [], []);
assert.equal(emptyState.canClear, false);
assert.equal(emptyState.latestJobLabel, "无持久扫描记录");
assert.deepEqual(emptyState.sourceRows, []);

console.log("resourceStore client tests passed");
