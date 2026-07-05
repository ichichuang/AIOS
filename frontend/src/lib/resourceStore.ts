import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntimeAvailable, type ScanResourceKind } from "./customDirectoryScan";

export interface ResourceStoreStatus {
  databaseReady: boolean;
  schemaVersion: number;
  sourceCount: number;
  jobCount: number;
  resourceCount: number;
  metadataOnly: boolean;
  contentStorageEnabled: boolean;
}

export interface PersistedScanSource {
  id: string;
  displayName: string;
  rootDisplayPath: string;
  profileId: string;
  sourceKind: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  lastScanJobId: string | null;
  lastScanStatus: string | null;
  lastScanFinishedAtMs: number | null;
}

export interface PersistedScanJob {
  id: string;
  status: string;
  profileId: string;
  startedAtMs: number;
  finishedAtMs: number | null;
  elapsedMs: number;
  requestedBy: string;
  totalEntries: number;
  matchedResources: number;
  skippedEntries: number;
  errorCount: number;
  cancelled: boolean;
  rootDisplayPath: string;
}

export interface ResourceKindCount {
  resourceKind: ScanResourceKind | string;
  count: number;
}

export interface ResourceLibrarySummary {
  sourceCount: number;
  jobCount: number;
  resourceCount: number;
  locationCount: number;
  latestJob: PersistedScanJob | null;
  countsByKind: ResourceKindCount[];
  metadataOnly: boolean;
  contentStorageEnabled: boolean;
}

export interface PersistedResource {
  id: string;
  stableKey: string;
  name: string;
  resourceKind: ScanResourceKind | string;
  description: string;
  primaryType: string;
  riskLevel: string;
  displayPath: string;
  extension: string | null;
  entryType: string;
  sizeBytes: number | null;
  modifiedAtMs: number | null;
  classificationReason: string;
  sensitivePathRedacted: boolean;
  scanSourceId: string | null;
  scanJobId: string | null;
}

export interface PersistedLibraryState {
  canClear: boolean;
  latestJobLabel: string;
  categoryRows: Array<{ label: string; count: number; resourceKind: string }>;
  sourceRows: Array<{ id: string; primary: string; secondary: string; status: string }>;
}

export const fallbackResourceStoreStatus: ResourceStoreStatus = {
  databaseReady: false,
  schemaVersion: 0,
  sourceCount: 0,
  jobCount: 0,
  resourceCount: 0,
  metadataOnly: true,
  contentStorageEnabled: false
};

export const fallbackResourceLibrarySummary: ResourceLibrarySummary = {
  sourceCount: 0,
  jobCount: 0,
  resourceCount: 0,
  locationCount: 0,
  latestJob: null,
  countsByKind: [],
  metadataOnly: true,
  contentStorageEnabled: false
};

export async function getResourceStoreStatus(): Promise<ResourceStoreStatus> {
  if (!isTauriRuntimeAvailable()) return fallbackResourceStoreStatus;
  return invoke<ResourceStoreStatus>("get_resource_store_status");
}

export async function listScanSources(): Promise<PersistedScanSource[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<PersistedScanSource[]>("list_scan_sources");
}

export async function listPersistedScanJobs(limit = 8): Promise<PersistedScanJob[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<PersistedScanJob[]>("list_persisted_scan_jobs", { limit });
}

export async function getResourceLibrarySummary(): Promise<ResourceLibrarySummary> {
  if (!isTauriRuntimeAvailable()) return fallbackResourceLibrarySummary;
  return invoke<ResourceLibrarySummary>("get_resource_library_summary");
}

export async function listPersistedResources(limit = 100): Promise<PersistedResource[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<PersistedResource[]>("list_persisted_resources", { limit });
}

export async function clearResourceLibrary(): Promise<ResourceLibrarySummary> {
  if (!isTauriRuntimeAvailable()) return fallbackResourceLibrarySummary;
  return invoke<ResourceLibrarySummary>("clear_resource_library");
}

export function buildPersistedLibraryState(summary: ResourceLibrarySummary, sources: PersistedScanSource[], jobs: PersistedScanJob[]): PersistedLibraryState {
  const latestJob = summary.latestJob ?? jobs[0] ?? null;
  const latestJobLabel = latestJob ? `${latestJob.status} · ${latestJob.rootDisplayPath || "未记录根目录"}` : "无持久扫描记录";
  const categoryRows = normalizeResourceKindCounts(summary.countsByKind).map((item) => ({
    label: resourceKindLabels[item.resourceKind] ?? item.resourceKind,
    count: item.count,
    resourceKind: item.resourceKind
  }));
  const sourceRows = sources.slice(0, 4).map((source) => ({
    id: source.id,
    primary: source.displayName || source.rootDisplayPath,
    secondary: `${source.rootDisplayPath} · ${source.profileId} · ${source.lastScanStatus ?? "未扫描"}`,
    status: source.enabled ? (source.lastScanStatus ?? "enabled") : "disabled"
  }));

  return {
    canClear: summary.sourceCount + summary.jobCount + summary.resourceCount + summary.locationCount > 0,
    latestJobLabel,
    categoryRows,
    sourceRows
  };
}

export function normalizeResourceKindCounts(counts: ResourceKindCount[]): Array<{ resourceKind: string; count: number }> {
  const merged = new Map<string, number>();
  for (const item of counts) {
    const resourceKind = String(item.resourceKind);
    const safeCount = Number.isFinite(item.count) ? Math.max(0, item.count) : 0;
    merged.set(resourceKind, (merged.get(resourceKind) ?? 0) + safeCount);
  }

  return [...merged.entries()]
    .map(([resourceKind, count]) => ({ resourceKind, count }))
    .sort((left, right) => resourceKindSortIndex(left.resourceKind) - resourceKindSortIndex(right.resourceKind) || left.resourceKind.localeCompare(right.resourceKind));
}

const resourceKindOrder: string[] = [
  "skill",
  "prompt",
  "mcp-config",
  "script",
  "validator",
  "report-doc",
  "project-pack",
  "policy-governance",
  "package-manifest",
  "unknown-local-resource"
];

const resourceKindLabels: Record<string, string> = {
  skill: "技能",
  prompt: "提示词",
  "mcp-config": "MCP / 配置元数据",
  script: "脚本",
  validator: "验证器",
  "report-doc": "报告与文档",
  "project-pack": "项目包",
  "policy-governance": "策略治理",
  "package-manifest": "包清单",
  "unknown-local-resource": "未知本地资源"
};

function resourceKindSortIndex(resourceKind: string): number {
  const index = resourceKindOrder.indexOf(resourceKind);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
