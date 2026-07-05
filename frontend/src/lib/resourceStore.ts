import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_SCAN_PROFILE_ID, getScanProfileById, isTauriRuntimeAvailable, type ScanModeId, type ScanProfileId, type ScanResourceKind } from "./customDirectoryScan";

export const FIRST_RUN_ONBOARDING_DISMISSED_SETTING_KEY = "firstRunOnboardingDismissed";
export const LOCAL_DATA_RESET_WARNING_COPY = "清空只删除 AIOS 应用记录，不会删除用户文件。";
export const WHAT_AIOS_STORES_COPY = "保存资源名称、类型、相对路径、大小、修改时间、来源、扫描模板和安全发现摘要。";
export const WHAT_AIOS_NEVER_STORES_COPY = "不保存文件内容、原始密钥、令牌值、认证/会话值、供应商密钥、Cookie 或环境变量值。";

export interface AppSettingRecord {
  key: string;
  valueJson: string;
  updatedAtMs: number;
}

export interface SetAppSettingInput {
  key: string;
  valueJson: string;
}

export interface ResourceStoreStatus {
  databaseReady: boolean;
  schemaVersion: number;
  sourceCount: number;
  enabledSourceCount: number;
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
  projectLabel: string | null;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  lastScanJobId: string | null;
  lastScanStatus: string | null;
  lastScanFinishedAtMs: number | null;
  resourceCount: number;
  skippedEntries: number;
  errorCount: number;
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

export interface ScanSkipReasonCount {
  reason: string;
  count: number;
}

export interface DiscoveryResourceKindStat {
  resourceKind: string;
  label: string;
  count: number;
}

export interface ResourceLibrarySummary {
  sourceCount: number;
  enabledSourceCount: number;
  jobCount: number;
  resourceCount: number;
  locationCount: number;
  latestJob: PersistedScanJob | null;
  latestSuccessfulScan: PersistedScanJob | null;
  countsByKind: ResourceKindCount[];
  skipCountsByReason: ScanSkipReasonCount[];
  skippedEntryTotal: number;
  errorTotal: number;
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
  latestSuccessfulScanLabel: string;
  categoryRows: Array<{ label: string; count: number; resourceKind: string }>;
  sourceRows: ScanSourceDisplayRow[];
}

export interface PrivacyDataControlSummary {
  localBoundaryLabel: string;
  databaseStatus: string;
  sourceCountLabel: string;
  persistedResourceCountLabel: string;
  lastScanLabel: string;
  lastScanTimeLabel: string;
  metadataPolicyLabel: string;
  contentPolicyLabel: string;
  executionPolicyLabel: string;
  resetWarning: string;
  storesCopy: string;
  neverStoresCopy: string;
}

export interface ScanSourceDisplayRow {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  statusLabel: string;
  projectLabel: string;
  enabled: boolean;
  selected: boolean;
  resourceCount: number;
  skippedEntries: number;
  errorCount: number;
  profileId: string;
}

export interface UpdateScanSourceInput {
  id: string;
  displayName?: string;
  profileId?: string;
  projectLabel?: string;
  enabled?: boolean;
}

export interface AddScanSourcesResult {
  sources: PersistedScanSource[];
  selectedCount: number;
}

export interface StartScanSourcesBatchOptions {
  advancedConfirmationAccepted?: boolean;
}

export interface DiscoveryResultStats {
  totalResources: number;
  resourcesByKind: DiscoveryResourceKindStat[];
  scannedSources: number;
  skippedEntries: number;
  permissionDeniedCount: number;
  excludedCount: number;
  errors: number;
  elapsedSeconds: number;
  storedLibraryCount: number;
}

export type ScanBatchStatus = "queued" | "running" | "cancelling" | "completed" | "cancelled" | "failed";
export type ScanBatchSourceStatus = "idle" | "queued" | "running" | "completed" | "cancelled" | "failed";

export interface ScanBatchProgress {
  completedSources: number;
  totalSources: number;
  activeVisitedEntries: number;
  activeMatchedResources: number;
  activeSkippedEntries: number;
  elapsedMs: number;
  cancellationRequested: boolean;
}

export interface ScanBatchSourceSnapshot {
  scanSourceId: string;
  displayName: string;
  rootDisplayPath: string;
  profileId: string;
  projectLabel: string | null;
  status: ScanBatchSourceStatus;
  jobId: string | null;
  resourcesFound: number;
  skippedEntries: number;
  errorCount: number;
  lastScannedAtMs: number | null;
  message: string | null;
}

export interface ScanBatchSnapshot {
  batchId: string;
  status: ScanBatchStatus;
  startedAtMs: number;
  updatedAtMs: number;
  completedAtMs: number | null;
  totalSources: number;
  completedSources: number;
  cancelledSources: number;
  failedSources: number;
  activeSourceId: string | null;
  progress: ScanBatchProgress;
  sources: ScanBatchSourceSnapshot[];
  error: { code: string; message: string } | null;
}

export interface ScanBatchStarted {
  batchId: string;
  snapshot: ScanBatchSnapshot;
}

export const fallbackResourceStoreStatus: ResourceStoreStatus = {
  databaseReady: false,
  schemaVersion: 0,
  sourceCount: 0,
  enabledSourceCount: 0,
  jobCount: 0,
  resourceCount: 0,
  metadataOnly: true,
  contentStorageEnabled: false
};

export const fallbackResourceLibrarySummary: ResourceLibrarySummary = {
  sourceCount: 0,
  enabledSourceCount: 0,
  jobCount: 0,
  resourceCount: 0,
  locationCount: 0,
  latestJob: null,
  latestSuccessfulScan: null,
  countsByKind: [],
  skipCountsByReason: [],
  skippedEntryTotal: 0,
  errorTotal: 0,
  metadataOnly: true,
  contentStorageEnabled: false
};

export async function getAppSetting(key: string): Promise<AppSettingRecord | null> {
  if (!isTauriRuntimeAvailable()) return null;
  return invoke<AppSettingRecord | null>("get_app_setting", { key });
}

export async function setAppSetting(input: SetAppSettingInput): Promise<AppSettingRecord> {
  if (!isTauriRuntimeAvailable()) {
    return {
      key: input.key,
      valueJson: input.valueJson,
      updatedAtMs: Date.now()
    };
  }
  return invoke<AppSettingRecord>("set_app_setting", { input });
}

export async function getFirstRunOnboardingDismissed(): Promise<boolean> {
  const setting = await getAppSetting(FIRST_RUN_ONBOARDING_DISMISSED_SETTING_KEY);
  if (!setting) return false;
  try {
    return JSON.parse(setting.valueJson) === true;
  } catch {
    return false;
  }
}

export async function setFirstRunOnboardingDismissed(dismissed: boolean): Promise<AppSettingRecord> {
  return setAppSetting({
    key: FIRST_RUN_ONBOARDING_DISMISSED_SETTING_KEY,
    valueJson: JSON.stringify(dismissed)
  });
}

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

export async function addScanSources(profileId: ScanProfileId | string = DEFAULT_SCAN_PROFILE_ID, projectLabel?: string): Promise<AddScanSourcesResult> {
  if (!isTauriRuntimeAvailable()) return { sources: [], selectedCount: 0 };
  return invoke<AddScanSourcesResult>("add_scan_sources", { profileId, projectLabel: projectLabel?.trim() || null });
}

export async function addDiscoveryScanSources(mode: ScanModeId, advancedConfirmationAccepted: boolean, projectLabel?: string): Promise<AddScanSourcesResult> {
  if (!isTauriRuntimeAvailable()) return { sources: [], selectedCount: 0 };
  return invoke<AddScanSourcesResult>("add_discovery_scan_sources", {
    input: {
      mode,
      advancedConfirmationAccepted,
      projectLabel: projectLabel?.trim() || null
    }
  });
}

export async function updateScanSource(input: UpdateScanSourceInput): Promise<PersistedScanSource> {
  assertTauriResourceStore();
  return invoke<PersistedScanSource>("update_scan_source", { input });
}

export async function removeScanSource(sourceId: string): Promise<ResourceLibrarySummary> {
  assertTauriResourceStore();
  return invoke<ResourceLibrarySummary>("remove_scan_source", { sourceId });
}

export async function startScanSourcesBatch(sourceIds: string[], options: StartScanSourcesBatchOptions = {}): Promise<ScanBatchStarted> {
  assertTauriResourceStore();
  return invoke<ScanBatchStarted>("start_scan_sources_batch", { sourceIds, advancedConfirmationAccepted: options.advancedConfirmationAccepted ?? false });
}

export async function cancelScanBatch(batchId: string): Promise<ScanBatchSnapshot> {
  assertTauriResourceStore();
  return invoke<ScanBatchSnapshot>("cancel_scan_batch", { batchId });
}

export async function getScanBatchSnapshot(batchId: string): Promise<ScanBatchSnapshot> {
  assertTauriResourceStore();
  return invoke<ScanBatchSnapshot>("get_scan_batch_snapshot", { batchId });
}

export function buildPersistedLibraryState(summary: ResourceLibrarySummary, sources: PersistedScanSource[], jobs: PersistedScanJob[], selectedSourceIds: string[] = []): PersistedLibraryState {
  const latestJob = summary.latestJob ?? jobs[0] ?? null;
  const latestJobLabel = latestJob ? `${latestJob.status} · ${latestJob.rootDisplayPath || "未记录根目录"}` : "无持久扫描记录";
  const latestSuccessfulScanLabel = summary.latestSuccessfulScan ? formatDateTime(summary.latestSuccessfulScan.finishedAtMs ?? summary.latestSuccessfulScan.startedAtMs) : "暂无成功扫描";
  const categoryRows = normalizeResourceKindCounts(summary.countsByKind).map((item) => ({
    label: resourceKindLabels[item.resourceKind] ?? item.resourceKind,
    count: item.count,
    resourceKind: item.resourceKind
  }));
  const selected = new Set(selectedSourceIds);
  const sourceRows = sources.map((source) => ({
    id: source.id,
    primary: source.displayName || source.rootDisplayPath,
    secondary: `${source.rootDisplayPath} · ${source.projectLabel || "未标注项目"} · ${getScanProfileById(source.profileId).displayName}`,
    status: source.enabled ? (source.lastScanStatus ?? "enabled") : "disabled",
    statusLabel: source.enabled ? scanStatusLabels[source.lastScanStatus ?? "enabled"] ?? (source.lastScanStatus ?? "已启用") : "已停用",
    projectLabel: source.projectLabel ?? "",
    enabled: source.enabled,
    selected: selected.has(source.id),
    resourceCount: source.resourceCount,
    skippedEntries: source.skippedEntries,
    errorCount: source.errorCount,
    profileId: source.profileId
  }));

  return {
    canClear: summary.sourceCount + summary.jobCount + summary.resourceCount + summary.locationCount > 0,
    latestJobLabel,
    latestSuccessfulScanLabel,
    categoryRows,
    sourceRows
  };
}

export function buildPrivacyDataControlSummary(status: ResourceStoreStatus, summary: ResourceLibrarySummary, sources: PersistedScanSource[]): PrivacyDataControlSummary {
  const latestJob = summary.latestJob ?? null;
  return {
    localBoundaryLabel: "本机 app-owned SQLite",
    databaseStatus: status.databaseReady ? `SQLite 已就绪 · schema ${status.schemaVersion}` : "未连接本地库",
    sourceCountLabel: `${summary.sourceCount || sources.length} 个来源`,
    persistedResourceCountLabel: `${summary.resourceCount} 项资源`,
    lastScanLabel: latestJob ? `${latestJob.status} · ${latestJob.rootDisplayPath || "未记录根目录"}` : "暂无扫描任务",
    lastScanTimeLabel: latestJob ? formatDateTime(latestJob.finishedAtMs ?? latestJob.startedAtMs) : "暂无扫描时间",
    metadataPolicyLabel: summary.metadataOnly && status.metadataOnly ? "仅保存元数据" : "元数据策略需复核",
    contentPolicyLabel: summary.contentStorageEnabled || status.contentStorageEnabled ? "内容存储需复核" : "不保存文件内容",
    executionPolicyLabel: "不执行脚本或 MCP",
    resetWarning: LOCAL_DATA_RESET_WARNING_COPY,
    storesCopy: WHAT_AIOS_STORES_COPY,
    neverStoresCopy: WHAT_AIOS_NEVER_STORES_COPY
  };
}

export function buildSelectedBatchSourceIds(sources: PersistedScanSource[], selectedSourceIds: string[]): string[] {
  const selected = new Set(selectedSourceIds);
  return sources.filter((source) => source.enabled && selected.has(source.id)).map((source) => source.id);
}

export function patchSourceInList(sources: PersistedScanSource[], updated: PersistedScanSource): PersistedScanSource[] {
  return sources.map((source) => (source.id === updated.id ? updated : source));
}

export function isTerminalScanBatchStatus(status: ScanBatchStatus | ScanBatchSourceStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "failed";
}

export function scanBatchProgressPercent(snapshot: ScanBatchSnapshot | null): number {
  if (!snapshot || snapshot.totalSources <= 0) return 0;
  return Math.max(0, Math.min(100, (snapshot.completedSources / snapshot.totalSources) * 100));
}

export function scanBatchStatusLabel(status: ScanBatchStatus | ScanBatchSourceStatus | string | null | undefined): string {
  return scanStatusLabels[status ?? ""] ?? "未扫描";
}

export function buildDiscoveryResultStats(summary: ResourceLibrarySummary, sources: PersistedScanSource[], batch: ScanBatchSnapshot | null): DiscoveryResultStats {
  const batchSources = batch?.sources ?? [];
  const scannedSourceIds = new Set(batchSources.filter((source) => isTerminalScanBatchStatus(source.status)).map((source) => source.scanSourceId));
  const scannedSources = scannedSourceIds.size || sources.filter((source) => source.lastScanStatus === "completed").length;
  const skippedEntries = batchSources.reduce((total, source) => total + source.skippedEntries, 0) || summary.skippedEntryTotal;
  const errors = batchSources.reduce((total, source) => total + source.errorCount, 0) || summary.errorTotal;
  const elapsedMs = batch ? (batch.completedAtMs ?? batch.updatedAtMs) - batch.startedAtMs : summary.latestJob?.elapsedMs ?? 0;

  return {
    totalResources: summary.resourceCount,
    resourcesByKind: normalizeResourceKindCounts(summary.countsByKind).map((item) => ({
      ...item,
      label: resourceKindLabels[item.resourceKind] ?? item.resourceKind
    })),
    scannedSources,
    skippedEntries,
    permissionDeniedCount: skipReasonCount(summary, "permission_denied"),
    excludedCount: skipReasonCount(summary, "excluded_directory"),
    errors,
    elapsedSeconds: Math.max(0, Math.round(elapsedMs / 1000)),
    storedLibraryCount: summary.resourceCount
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

function skipReasonCount(summary: ResourceLibrarySummary, reason: string): number {
  return summary.skipCountsByReason.find((item) => item.reason === reason)?.count ?? 0;
}

function assertTauriResourceStore(): void {
  if (!isTauriRuntimeAvailable()) {
    throw new Error("当前页面不在 Tauri 桌面运行时中，无法管理本地扫描来源。");
  }
}

function formatDateTime(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}

const scanStatusLabels: Record<string, string> = {
  enabled: "已启用",
  queued: "排队中",
  running: "扫描中",
  cancelling: "取消中",
  completed: "已完成",
  cancelled: "已取消",
  failed: "失败",
  idle: "空闲",
  disabled: "已停用"
};
