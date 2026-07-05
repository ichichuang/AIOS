import { invoke } from "@tauri-apps/api/core";
import { getScanProfileById, isTauriRuntimeAvailable, type ScanResourceKind } from "./customDirectoryScan";
import type { AiosResource, CapabilityType, ResourceStatus, RiskLevel, ToolType } from "../types/inventory";
import type { PersistedScanJob, ResourceKindCount } from "./resourceStore";

export type ResourceCorpusScopeKind = "global" | "project" | "source" | "unclassified";
export type ResourceCorpusSourceMode = "dynamic" | "legacy";

export interface ResourceCorpusScope {
  id: string;
  scopeKind: ResourceCorpusScopeKind | string;
  label: string;
  description: string;
  resourceCount: number;
  projectLabel: string | null;
  scanSourceId: string | null;
  rootDisplayPath: string | null;
  profileId: string | null;
  enabled: boolean | null;
}

export interface ResourceScopeCount {
  scopeId: string;
  scopeKind: ResourceCorpusScopeKind | string;
  label: string;
  count: number;
}

export interface ResourceCorpusSummary {
  sourceCount: number;
  enabledSourceCount: number;
  projectScopeCount: number;
  resourceCount: number;
  locationCount: number;
  latestSuccessfulScan: PersistedScanJob | null;
  countsByKind: ResourceKindCount[];
  countsByScope: ResourceScopeCount[];
  skippedEntryTotal: number;
  errorTotal: number;
  metadataOnly: boolean;
  contentStorageEnabled: boolean;
}

export interface ResourceCorpusQuery {
  scopeKind?: ResourceCorpusScopeKind | string;
  scopeId?: string | null;
  projectLabel?: string | null;
  scanSourceId?: string | null;
  resourceKind?: ScanResourceKind | string | null;
  limit?: number;
  offset?: number;
}

export interface ResourceCorpusResource {
  id: string;
  stableKey: string;
  name: string;
  resourceKind: ScanResourceKind | string;
  description: string;
  primaryType: string;
  riskLevel: RiskLevel | string;
  boundaryLabels: string[];
  updatedAtMs: number;
  locationId: string | null;
  scanSourceId: string | null;
  scanSourceName: string | null;
  sourceKind: string | null;
  scanSourceEnabled: boolean | null;
  projectLabel: string | null;
  rootDisplayPath: string | null;
  profileId: string | null;
  scanJobId: string | null;
  scanJobStatus: string | null;
  scanJobStartedAtMs: number | null;
  scanJobFinishedAtMs: number | null;
  relativePath: string | null;
  displayPath: string | null;
  extension: string | null;
  entryType: string | null;
  sizeBytes: number | null;
  modifiedAtMs: number | null;
  classificationReason: string | null;
  sensitivePathRedacted: boolean;
}

export interface ResourceCorpusLocation {
  id: string;
  scanSourceId: string;
  scanSourceName: string;
  projectLabel: string | null;
  rootDisplayPath: string;
  profileId: string;
  scanJobId: string;
  scanJobStatus: string;
  relativePath: string;
  displayPath: string;
  extension: string | null;
  entryType: string;
  sizeBytes: number | null;
  modifiedAtMs: number | null;
  classificationReason: string;
  sensitivePathRedacted: boolean;
}

export interface ResourceCorpusFinding {
  id: string;
  scanJobId: string;
  findingKind: string;
  severity: string;
  message: string;
  safeDetailJson: string;
}

export interface ResourceCorpusDetail {
  resource: ResourceCorpusResource;
  locations: ResourceCorpusLocation[];
  findings: ResourceCorpusFinding[];
  metadataOnly: boolean;
  contentStorageEnabled: boolean;
}

export interface CorpusScopeTabItem {
  id: string;
  label: string;
  description: string;
  count: number;
  scope: ResourceCorpusScope;
}

export const fallbackResourceCorpusSummary: ResourceCorpusSummary = {
  sourceCount: 0,
  enabledSourceCount: 0,
  projectScopeCount: 0,
  resourceCount: 0,
  locationCount: 0,
  latestSuccessfulScan: null,
  countsByKind: [],
  countsByScope: [],
  skippedEntryTotal: 0,
  errorTotal: 0,
  metadataOnly: true,
  contentStorageEnabled: false
};

export const globalCorpusScope: ResourceCorpusScope = {
  id: "global",
  scopeKind: "global",
  label: "全局",
  description: "全部动态资源库元数据。",
  resourceCount: 0,
  projectLabel: null,
  scanSourceId: null,
  rootDisplayPath: null,
  profileId: null,
  enabled: null
};

export async function listResourceCorpusScopes(): Promise<ResourceCorpusScope[]> {
  if (!isTauriRuntimeAvailable()) return [globalCorpusScope];
  return invoke<ResourceCorpusScope[]>("list_resource_corpus_scopes");
}

export async function listProjectScopes(): Promise<ResourceCorpusScope[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<ResourceCorpusScope[]>("list_project_scopes");
}

export async function getActiveResourceCorpusSummary(): Promise<ResourceCorpusSummary> {
  if (!isTauriRuntimeAvailable()) return fallbackResourceCorpusSummary;
  return invoke<ResourceCorpusSummary>("get_active_resource_corpus_summary");
}

export async function listResourcesByScope(query: ResourceCorpusQuery = {}): Promise<ResourceCorpusResource[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<ResourceCorpusResource[]>("list_resources_by_scope", { query });
}

export async function listResourcesByKind(resourceKind: ScanResourceKind | string, limit = 100, offset = 0): Promise<ResourceCorpusResource[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<ResourceCorpusResource[]>("list_resources_by_kind", { resourceKind, limit, offset });
}

export async function getResourceDetail(resourceId: string): Promise<ResourceCorpusDetail> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error("当前页面不在 Tauri 桌面运行时中，无法读取动态资源详情。");
  }
  return invoke<ResourceCorpusDetail>("get_resource_detail", { resourceId });
}

export async function getResourceCountsByScope(): Promise<ResourceScopeCount[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<ResourceScopeCount[]>("get_resource_counts_by_scope");
}

export function hasDynamicCorpus(summary: ResourceCorpusSummary): boolean {
  return summary.resourceCount > 0;
}

export function getCorpusSourceMode(summary: ResourceCorpusSummary): ResourceCorpusSourceMode {
  return hasDynamicCorpus(summary) ? "dynamic" : "legacy";
}

export function getCorpusSourceLabel(mode: ResourceCorpusSourceMode): string {
  return mode === "dynamic" ? "动态资源库" : "示例/Legacy snapshot";
}

export function getCorpusEmptyMessage(mode: ResourceCorpusSourceMode): string {
  return mode === "dynamic" ? "当前 scope 下没有匹配的动态资源。" : "尚未扫描任何目录；请到扫描管理添加目录并手动开始扫描.";
}

export function buildCorpusScopeTabs(scopes: ResourceCorpusScope[], summary: ResourceCorpusSummary): CorpusScopeTabItem[] {
  const knownScopes = scopes.length > 0 ? scopes : [globalCorpusScope];
  const dynamic = hasDynamicCorpus(summary);
  return knownScopes
    .filter((scope) => dynamic || scope.scopeKind === "global")
    .map((scope) => ({
      id: scope.id,
      label: scope.label,
      description: scope.description,
      count: scope.resourceCount,
      scope
    }));
}

export function scopeToResourceQuery(scope: ResourceCorpusScope, limit = 300, offset = 0): ResourceCorpusQuery {
  return {
    scopeKind: scope.scopeKind,
    scopeId: scope.id,
    projectLabel: scope.projectLabel,
    scanSourceId: scope.scanSourceId,
    limit,
    offset
  };
}

export function mapCorpusResourcesToAiosResources(resources: ResourceCorpusResource[]): AiosResource[] {
  return resources.map((resource) => mapCorpusResourceToAiosResource(resource));
}

export function mapCorpusResourceToAiosResource(resource: ResourceCorpusResource): AiosResource {
  const mapping = kindMapping[String(resource.resourceKind)] ?? kindMapping["unknown-local-resource"];
  const risk = normalizeRisk(resource.riskLevel, resource.sensitivePathRedacted, String(resource.resourceKind));
  const status: ResourceStatus = resource.sensitivePathRedacted ? "warn" : "available";
  const profile = getScanProfileById(resource.profileId);
  const displayPath = resource.displayPath ?? resource.relativePath ?? resource.name;
  const updatedAt = formatIsoTime(resource.modifiedAtMs ?? resource.scanJobFinishedAtMs ?? resource.updatedAtMs);
  const sourceLabel = resource.projectLabel || resource.scanSourceName || "未归类";
  const description = resource.classificationReason || resource.description || "SQLite 动态资源库元数据。";

  return {
    id: `corpus:${resource.id}`,
    name: resource.name || displayNameForPath(displayPath),
    zhName: `${mapping.zhLabel} · ${resource.name || displayNameForPath(displayPath)}`,
    zhDescription: `${description} 动态资源库仅展示持久化元数据。`,
    zhCategory: `${sourceLabel} / ${mapping.zhLabel}`,
    zhStatus: resource.sensitivePathRedacted ? "敏感路径已隐藏" : undefined,
    zhRisk: risk === "medium" ? "中风险" : undefined,
    toolType: mapping.toolType,
    capabilityType: mapping.capabilityType,
    status,
    risk,
    path: displayPath,
    paths: [displayPath].filter(Boolean),
    description: `${resource.resourceKind} metadata from SQLite resource corpus`,
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: resource.sensitivePathRedacted ? "medium" : "low",
      executionRisk: executionRiskForKind(String(resource.resourceKind)),
      notes: [
        "SQLite dynamic resource corpus",
        "metadata-only persistence",
        "no file contents read",
        "no scripts or MCP executed",
        `scan profile: ${profile.id}`,
        ...(resource.sensitivePathRedacted ? ["sensitive path segment redacted"] : [])
      ]
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "metadata-only SQLite resource corpus"
    },
    prompts: [],
    metadata: {
      sourceKind: resource.sourceKind ?? "custom-directory-scan",
      sourceKinds: ["dynamic-resource-corpus", resource.sourceKind ?? "custom-directory-scan"],
      corpusSource: "dynamic-resource-corpus",
      corpusResourceId: resource.id,
      corpusLocationId: resource.locationId,
      stableKey: resource.stableKey,
      projectLabel: resource.projectLabel,
      scanSourceId: resource.scanSourceId,
      scanSourceName: resource.scanSourceName,
      scanSourceEnabled: resource.scanSourceEnabled,
      root: resource.rootDisplayPath,
      rootDisplayPath: resource.rootDisplayPath,
      scanJobId: resource.scanJobId,
      scanJobStatus: resource.scanJobStatus,
      scanJobStartedAtMs: resource.scanJobStartedAtMs,
      scanJobFinishedAtMs: resource.scanJobFinishedAtMs,
      scanProfileId: profile.id,
      scanProfileName: profile.displayName,
      scanProfileSummary: profile.shortDescription,
      scanProfileBoundary: profile.safetyBoundary,
      scanProfileResultGroupLabel: profile.resultGroupLabel,
      scanResourceKind: resource.resourceKind,
      entryType: resource.entryType,
      extension: resource.extension,
      sizeBytes: resource.sizeBytes,
      modifiedAtMs: resource.modifiedAtMs,
      boundaryLabels: resource.boundaryLabels,
      classificationReason: resource.classificationReason,
      sensitive: resource.sensitivePathRedacted,
      relativePath: resource.relativePath,
      displayPath
    },
    updatedAt
  };
}

export function mergeResourceWithCorpusDetail(resource: AiosResource, detail: ResourceCorpusDetail): AiosResource {
  const detailPaths = detail.locations.map((location) => location.displayPath).filter(Boolean);
  return {
    ...resource,
    paths: uniqueStrings([...resource.paths, ...detailPaths]),
    metadata: {
      ...resource.metadata,
      corpusDetailLoaded: true,
      corpusDetailMetadataOnly: detail.metadataOnly,
      corpusDetailLocations: detail.locations,
      corpusFindings: detail.findings
    }
  };
}

export function isDynamicCorpusResource(resource: AiosResource | null): boolean {
  return resource?.metadata?.corpusSource === "dynamic-resource-corpus" && typeof resource.metadata?.corpusResourceId === "string";
}

export function getDynamicCorpusResourceId(resource: AiosResource): string | null {
  const value = resource.metadata?.corpusResourceId;
  return typeof value === "string" ? value : null;
}

const kindMapping: Record<string, { zhLabel: string; capabilityType: CapabilityType; toolType: ToolType }> = {
  skill: { zhLabel: "技能", capabilityType: "skill", toolType: "project-local" },
  prompt: { zhLabel: "提示词", capabilityType: "usage-prompt", toolType: "project-local" },
  "mcp-config": { zhLabel: "MCP 配置元数据", capabilityType: "mcp-client", toolType: "mcp" },
  script: { zhLabel: "脚本", capabilityType: "script", toolType: "script" },
  "report-doc": { zhLabel: "报告 / 文档", capabilityType: "report", toolType: "report" },
  "project-pack": { zhLabel: "项目包", capabilityType: "project-pack", toolType: "project-local" },
  "policy-governance": { zhLabel: "策略治理", capabilityType: "policy", toolType: "aios-root" },
  validator: { zhLabel: "验证器", capabilityType: "validator", toolType: "validator" },
  "package-manifest": { zhLabel: "包清单", capabilityType: "project-pack", toolType: "project-local" },
  "unknown-local-resource": { zhLabel: "未知本地资源", capabilityType: "project-pack", toolType: "project-local" }
};

function normalizeRisk(value: string, sensitive: boolean, resourceKind: string): RiskLevel {
  if (sensitive) return "medium";
  if (value === "low" || value === "medium" || value === "high") return value;
  if (resourceKind === "script" || resourceKind === "validator" || resourceKind === "mcp-config") return "medium";
  return "low";
}

function executionRiskForKind(resourceKind: string): RiskLevel {
  return resourceKind === "script" || resourceKind === "validator" ? "medium" : "low";
}

function displayNameForPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments.at(-1) ?? path;
}

function formatIsoTime(value: number | null | undefined): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}
