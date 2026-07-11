import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntimeAvailable } from "./customDirectoryScan";
import type { ResourceView } from "./filtering";
import type { ResourceCorpusSummary } from "./resourceCorpus";
import type { AiosResource, ResourceStatus, RiskLevel, ToolType, UsagePrompt } from "../types/inventory";

export type SkillStatus = "available" | "needsAttention" | "duplicate" | "broken" | "sourceUnknown" | "unchecked";
export type SkillStatusFilter = "all" | SkillStatus;

export interface SkillLibraryCounts {
  totalSkillCandidates: number;
  dedupedSkillCount: number;
  availableSkillCount: number;
  needsAttentionCount: number;
  duplicateCount: number;
  brokenCount: number;
  sourceUnknownCount: number;
  uncheckedCount: number;
}

export interface SkillLibrarySummary {
  generatedAtMs: number;
  latestScanAtMs: number | null;
  latestSuccessfulScanAtMs: number | null;
  counts: SkillLibraryCounts;
  metadataOnly: boolean;
  contentStorageEnabled: boolean;
}

export interface SkillAttentionReason {
  code: string;
  label: string;
  detail: string;
  severity: string;
}

export type SkillScopeKind = "global" | "project" | "unknown";

export type SkillScopeClassification = "globalOnly" | "projectOnly" | "mixed" | "unknown";

export type SkillScopeSource = "userConfig" | "builtinProfile" | "legacyMigration" | "unknown";

export interface SkillProjectRef {
  projectId: string;
  projectLabel: string;
}

export interface SkillScopeEvidence {
  sourceId: string;
  scopeKind: SkillScopeKind;
  projectId: string | null;
  projectLabel: string | null;
  scopeSource: SkillScopeSource;
  scopeConfirmed: boolean;
}

export interface SkillScopeSummary {
  classification: SkillScopeClassification;
  hasGlobalSource: boolean;
  projects: SkillProjectRef[];
  hasUnknownSource: boolean;
  evidence: SkillScopeEvidence[];
}

export interface SkillListItem {
  id: string;
  displayName: string;
  originalName: string;
  shortPurpose: string;
  status: SkillStatus;
  sourceLabel: string;
  sourceKindLabel: string;
  availableInTools: string[];
  aliases: string[];
  tags: string[];
  capabilities: string[];
  usageText: string | null;
  attentionReasons: SkillAttentionReason[];
  primaryPathHint: string;
  sourceCount: number;
  updatedAt: string | null;
  lastSeenAt: string | null;
  scopeSummary: SkillScopeSummary;
}

export interface SkillSourceSummary {
  id: string;
  sourceLabel: string;
  sourceKindLabel: string;
  availableInTools: string[];
  pathHint: string;
  rootPathHint: string | null;
  lastSeenAt: string | null;
  scanStatus: string | null;
  findingCount: number;
  duplicate: boolean;
}

export interface SkillUsageSummary {
  usageKnown: boolean;
  usageText: string;
  availableInTools: string[];
}

export interface SkillAdvancedMetadataRow {
  label: string;
  value: string;
}

export interface SkillDetail extends SkillListItem {
  whatItDoes: string;
  whenToUse: string | null;
  howToUse: string | null;
  usageSummary: SkillUsageSummary;
  sourceSummaries: SkillSourceSummary[];
  relatedDuplicateSources: SkillSourceSummary[];
  safeAdvancedMetadataSummary: SkillAdvancedMetadataRow[];
  findings: SkillAttentionReason[];
}

export type SkillDetailViewMode = "ready" | "loading" | "unavailable";

export interface SkillDetailRuntimeState {
  resourceId: string;
  skillId: string;
  fallbackItem: SkillListItem | null;
  detail: SkillDetail | null;
  loading: boolean;
  error: string | null;
}

export interface SkillDetailViewInput {
  detail: SkillDetail | null;
  fallbackItem: SkillListItem | null;
  loading: boolean;
  error: string | null;
}

export interface SkillDetailViewModel {
  mode: SkillDetailViewMode;
  title: string;
  originalName: string;
  whatItDoes: string;
  whatItDoesKnown: boolean;
  whenToUse: string;
  whenToUseKnown: boolean;
  aliasesText: string | null;
  tagsText: string | null;
  capabilitiesText: string | null;
  availableInToolsText: string;
  availableInToolsKnown: boolean;
  howToUse: string;
  howToUseKnown: boolean;
  sourceText: string;
  statusText: string;
  usageKnown: boolean;
  attentionReasons: SkillAttentionReason[];
  sourceSummaries: SkillSourceSummary[];
  duplicateSources: SkillSourceSummary[];
  advancedRows: SkillAdvancedMetadataRow[];
  safetyRows: SkillAdvancedMetadataRow[];
  notice: string | null;
  unknownNotice: string | null;
}

export interface SkillLibraryModuleState {
  summary: SkillLibrarySummary | null;
  items: SkillListItem[];
  loading: boolean;
  error: string | null;
  available: boolean;
}

export interface HomeSkillLibraryStats {
  skillCount: number;
  needsAttentionCount: number;
  latestScanLabel: string;
  usingProductSummary: boolean;
  viewCounts: Record<ResourceView, number>;
}

export const fallbackSkillUsageText = "暂时无法判断使用方法。请在高级信息里查看来源。";

export const skillStatusFilterOptions: ReadonlyArray<{ value: SkillStatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "available", label: "可用" },
  { value: "needsAttention", label: "需要处理" },
  { value: "duplicate", label: "重复" },
  { value: "broken", label: "已损坏" },
  { value: "sourceUnknown", label: "来源不明" },
  { value: "unchecked", label: "未检查" }
];

export const fallbackSkillStatusFilterOptions: ReadonlyArray<{ value: SkillStatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "needsAttention", label: "需要处理" }
];

export function unknownSkillScopeSummary(): SkillScopeSummary {
  return {
    classification: "unknown",
    hasGlobalSource: false,
    projects: [],
    hasUnknownSource: true,
    evidence: []
  };
}

export function skillScopeClassificationLabel(classification: SkillScopeClassification): string {
  switch (classification) {
    case "globalOnly":
      return "全局";
    case "projectOnly":
      return "项目";
    case "mixed":
      return "混合";
    case "unknown":
    default:
      return "范围未整理";
  }
}

export function isSkillScopeKnown(summary: SkillScopeSummary): boolean {
  return summary.classification !== "unknown";
}

export async function getSkillLibrarySummary(): Promise<SkillLibrarySummary | null> {
  if (!isTauriRuntimeAvailable()) return null;
  return invoke<SkillLibrarySummary>("get_skill_library_summary");
}

export async function listSkillLibraryItems(): Promise<SkillListItem[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<SkillListItem[]>("list_skill_library_items");
}

export async function getSkillDetail(skillId: string): Promise<SkillDetail> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error("当前页面不在 Tauri 桌面运行时中，无法读取技能详情。");
  }
  return invoke<SkillDetail>("get_skill_detail", { skillId });
}

export function getSkillLibraryItemIdFromResource(resource: AiosResource): string | null {
  if (resource.metadata?.corpusSource !== "skill-library-product") return null;
  const itemId = resource.metadata.skillLibraryItemId;
  return typeof itemId === "string" && itemId.trim().length > 0 ? itemId : null;
}

export function sanitizeSkillDetailLoadError(_error: unknown): string {
  return "无法读取技能详情。请在高级信息里查看来源。";
}

const PLACEHOLDER_NOTICE_PREFIX = "暂时无法判断";

function isKnownSkillText(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.startsWith(PLACEHOLDER_NOTICE_PREFIX);
}

export function buildSkillDetailViewModel(input: SkillDetailViewInput): SkillDetailViewModel {
  const item = input.detail ?? input.fallbackItem;
  const mode: SkillDetailViewMode = input.detail ? "ready" : input.loading ? "loading" : "unavailable";
  const usageText = input.detail
    ? input.detail.howToUse ?? input.detail.usageSummary.usageText ?? fallbackSkillUsageText
    : mode === "loading"
      ? "正在读取使用方法。"
      : fallbackSkillUsageText;
  const usageKnown = input.detail?.usageSummary.usageKnown ?? false;
  const availableInTools = input.detail?.usageSummary.availableInTools ?? item?.availableInTools ?? [];
  const visibleTools = availableInTools.filter((tool) => tool && tool !== "Unknown");
  const availableInToolsKnown = visibleTools.length > 0;
  const attentionReasons = dedupeSkillAttentionReasons([...(item?.attentionReasons ?? []), ...(input.detail?.findings ?? [])]);
  const title = item?.displayName?.trim() || item?.originalName?.trim() || "未命名技能";

  const whatItDoesRaw = input.detail?.whatItDoes?.trim() || item?.shortPurpose?.trim() || "";
  const whatItDoesKnown = isKnownSkillText(whatItDoesRaw);
  const whenToUseRaw = input.detail?.whenToUse?.trim() || "";
  const whenToUseKnown = isKnownSkillText(whenToUseRaw);
  const howToUseKnown = isKnownSkillText(usageText) && usageText.trim() !== fallbackSkillUsageText;

  const hasUnknownFields = mode === "ready" && (!whatItDoesKnown || !whenToUseKnown || !availableInToolsKnown || !howToUseKnown);

  return {
    mode,
    title,
    originalName: item?.originalName?.trim() || title,
    whatItDoes: whatItDoesKnown ? whatItDoesRaw : "暂时无法判断它能做什么。请在高级信息里查看来源。",
    whatItDoesKnown,
    whenToUse: whenToUseKnown
      ? whenToUseRaw
      : mode === "loading"
        ? "正在读取适用场景。"
        : "暂时无法判断适合什么时候用。请在高级信息里查看来源。",
    whenToUseKnown,
    aliasesText: formatSkillMetadataList(item?.aliases),
    tagsText: formatSkillMetadataList(item?.tags),
    capabilitiesText: formatSkillMetadataList(item?.capabilities),
    availableInToolsText: availableInToolsKnown ? visibleTools.join("、") : "暂时无法判断",
    availableInToolsKnown,
    howToUse: howToUseKnown ? usageText.trim() : fallbackSkillUsageText,
    howToUseKnown,
    sourceText: item?.sourceLabel?.trim() || "来源不明",
    statusText: item?.status ? skillStatusLabels[item.status] : "未检查",
    usageKnown,
    attentionReasons,
    sourceSummaries: input.detail?.sourceSummaries ?? [],
    duplicateSources: input.detail?.relatedDuplicateSources ?? [],
    advancedRows: input.detail?.safeAdvancedMetadataSummary ?? [],
    safetyRows: input.detail?.safeAdvancedMetadataSummary ?? [],
    notice: getSkillDetailNotice(mode, input.error),
    unknownNotice: hasUnknownFields ? "该技能的部分说明暂时无法判断。可在来源与高级信息中查看已记录的线索。" : null
  };
}

export function buildHomeSkillLibraryStats(
  summary: SkillLibrarySummary | null,
  corpusSummary: ResourceCorpusSummary,
  viewCounts: Record<ResourceView, number>
): HomeSkillLibraryStats {
  if (summary) {
    return {
      skillCount: Math.max(0, summary.counts.dedupedSkillCount),
      needsAttentionCount: Math.max(0, summary.counts.needsAttentionCount),
      latestScanLabel: formatScanTime(summary.latestSuccessfulScanAtMs ?? summary.latestScanAtMs),
      usingProductSummary: true,
      viewCounts
    };
  }

  const latestScan = corpusSummary.latestSuccessfulScan ?? corpusSummary.latestScan;
  return {
    skillCount: Math.max(0, viewCounts.skills),
    needsAttentionCount: 0,
    latestScanLabel: latestScan ? formatScanTime(latestScan.finishedAtMs ?? latestScan.startedAtMs) : "还没有查找记录",
    usingProductSummary: false,
    viewCounts
  };
}

export function mapSkillListItemToResource(item: SkillListItem): AiosResource {
  const status = mapSkillStatus(item.status);
  const risk = mapSkillRisk(item.status, item.attentionReasons);
  const usageText = item.usageText ?? fallbackSkillUsageText;
  const prompts = usageText === fallbackSkillUsageText ? [] : buildUsagePrompts(item, usageText);
  return {
    id: `skill-library:${item.id}`,
    name: item.originalName,
    zhName: item.displayName,
    zhDescription: item.shortPurpose,
    zhCategory: `${item.sourceLabel} / 技能`,
    zhStatus: skillStatusLabels[item.status],
    zhRisk: skillRiskLabels[risk],
    zhCapability: "技能",
    zhToolType: item.sourceLabel,
    toolType: mapToolType(item.availableInTools),
    capabilityType: "skill",
    status,
    risk,
    path: item.primaryPathHint,
    paths: [item.primaryPathHint].filter(Boolean),
    description: item.shortPurpose,
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: risk,
      executionRisk: "low",
      notes: [
        "技能库产品聚合只读取 AIOS Desktop 已保存的基本信息。",
        "不读取技能正文，不执行脚本，也不启动 MCP 服务。",
        usageText === fallbackSkillUsageText ? "暂时无法判断使用方法，请查看高级来源。" : usageText
      ]
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "技能库产品聚合元数据"
    },
    prompts,
    metadata: {
      corpusSource: "skill-library-product",
      skillLibraryItemId: item.id,
      skillStatus: item.status,
      sourceLabel: item.sourceLabel,
      sourceKindLabel: item.sourceKindLabel,
      availableInTools: item.availableInTools,
      aliases: item.aliases,
      tags: item.tags,
      capabilities: item.capabilities,
      usageText,
      attentionReasons: item.attentionReasons,
      sourceCount: item.sourceCount
    },
    updatedAt: normalizeTimestamp(item.updatedAt ?? item.lastSeenAt)
  };
}

export function filterSkillLibraryItems(items: readonly SkillListItem[], query: string, statusFilter: SkillStatusFilter = "all"): SkillListItem[] {
  const normalized = query.trim().toLowerCase();
  return items.filter((item) => skillItemMatchesStatusFilter(item, statusFilter) && (!normalized || skillItemSearchText(item).includes(normalized)));
}

export function skillItemNeedsAttention(item: SkillListItem): boolean {
  return item.status !== "available";
}

function skillItemMatchesStatusFilter(item: SkillListItem, statusFilter: SkillStatusFilter): boolean {
  if (statusFilter === "all") return true;
  if (statusFilter === "needsAttention") return skillItemNeedsAttention(item);
  return item.status === statusFilter;
}

function skillItemSearchText(item: SkillListItem): string {
  return [
    item.id,
    item.displayName,
    item.originalName,
    item.shortPurpose,
    item.status,
    skillStatusLabels[item.status],
    item.sourceLabel,
    item.sourceKindLabel,
    ...item.availableInTools,
    ...item.aliases,
    ...item.tags,
    ...item.capabilities,
    item.usageText ?? fallbackSkillUsageText,
    ...item.attentionReasons.flatMap((reason) => [reason.code, reason.label, reason.detail]),
    item.primaryPathHint
  ]
    .join(" ")
    .toLowerCase();
}

function formatSkillTools(tools: readonly string[]): string {
  const visible = tools.filter((tool) => tool && tool !== "Unknown");
  return visible.length > 0 ? visible.join("、") : "暂时无法判断";
}

function formatSkillMetadataList(values: readonly string[] | null | undefined): string | null {
  const visible = (values ?? []).map((value) => value.trim()).filter(Boolean);
  return visible.length > 0 ? visible.join("、") : null;
}

function dedupeSkillAttentionReasons(reasons: readonly SkillAttentionReason[]): SkillAttentionReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = reason.code || `${reason.label}:${reason.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getSkillDetailNotice(mode: SkillDetailViewMode, error: string | null): string | null {
  if (mode === "loading") return "正在读取 AIOS Desktop 已保存的技能基本信息。";
  if (mode === "unavailable") return error ?? "暂时无法读取完整技能详情。请在高级信息里查看来源。";
  return null;
}

function buildUsagePrompts(item: SkillListItem, usageText: string): UsagePrompt[] {
  const prompts: UsagePrompt[] = [];
  if (item.availableInTools.includes("Codex")) {
    prompts.push({
      target: "codex",
      title: `使用 ${item.displayName}`,
      prompt: usageText
    });
  }
  if (item.availableInTools.includes("Claude")) {
    prompts.push({
      target: "claude",
      title: `使用 ${item.displayName}`,
      prompt: usageText
    });
  }
  return prompts;
}

function mapSkillStatus(status: SkillStatus): ResourceStatus {
  if (status === "available") return "available";
  if (status === "broken") return "missing";
  if (status === "unchecked") return "unknown";
  return "warn";
}

function mapSkillRisk(status: SkillStatus, reasons: readonly SkillAttentionReason[]): RiskLevel {
  if (status === "available") return "low";
  if (status === "broken" || reasons.some((reason) => reason.severity === "high")) return "high";
  return "medium";
}

function mapToolType(tools: readonly string[]): ToolType {
  if (tools.includes("Codex")) return "codex";
  if (tools.includes("Claude")) return "claude";
  if (tools.includes("Agents")) return "agents";
  return "project-local";
}

function normalizeTimestamp(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (/^\d+$/.test(value)) {
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatScanTime(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "还没有查找记录";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false
  }).format(new Date(value));
}

export const skillStatusLabels: Record<SkillStatus, string> = {
  available: "可用",
  needsAttention: "需要处理",
  duplicate: "重复",
  broken: "已损坏",
  sourceUnknown: "来源不明",
  unchecked: "未检查"
};

const skillRiskLabels: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};
