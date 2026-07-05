import assert from "node:assert/strict";
import {
  buildPersistedLibraryState,
  clearResourceLibrary,
  fallbackResourceLibrarySummary,
  getResourceLibrarySummary,
  getResourceStoreStatus,
  listPersistedResources,
  listPersistedScanJobs,
  listScanSources,
  normalizeResourceKindCounts,
  type PersistedScanJob,
  type PersistedScanSource,
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
assert.deepEqual(fallbackSummary, fallbackResourceLibrarySummary);
assert.deepEqual(fallbackSources, []);
assert.deepEqual(fallbackJobs, []);
assert.deepEqual(fallbackResources, []);
assert.deepEqual(clearedSummary, fallbackResourceLibrarySummary);

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
  enabled: true,
  createdAtMs: 1_725_000_000_000,
  updatedAtMs: 1_725_000_001_000,
  lastScanJobId: "job-2",
  lastScanStatus: "completed",
  lastScanFinishedAtMs: 1_725_000_001_000
};
const summary: ResourceLibrarySummary = {
  ...fallbackResourceLibrarySummary,
  sourceCount: 1,
  jobCount: 2,
  resourceCount: 4,
  locationCount: 4,
  latestJob,
  countsByKind: [
    { resourceKind: "skill", count: 2 },
    { resourceKind: "script", count: 1 },
    { resourceKind: "unknown-local-resource", count: 1 }
  ]
};

const state = buildPersistedLibraryState(summary, [source], [latestJob]);
assert.equal(state.canClear, true);
assert.equal(state.latestJobLabel, "completed · ~/custom-scan-basic");
assert.equal(state.sourceRows[0].primary, "custom-scan-basic");
assert.equal(state.sourceRows[0].secondary, "~/custom-scan-basic · project-root · completed");
assert.equal(state.categoryRows[0].label, "技能");
assert.equal(state.categoryRows[0].count, 2);

const emptyState = buildPersistedLibraryState(fallbackResourceLibrarySummary, [], []);
assert.equal(emptyState.canClear, false);
assert.equal(emptyState.latestJobLabel, "无持久扫描记录");
assert.deepEqual(emptyState.sourceRows, []);

console.log("resourceStore client tests passed");
