import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntimeAvailable } from "./customDirectoryScan";
import type { ResourceView } from "./filtering";
import type { ResourceCorpusSummary } from "./resourceCorpus";
import type { AiosResource, ResourceStatus, RiskLevel, ToolType, UsagePrompt } from "../types/inventory";

export type SkillStatus = "available" | "needsAttention" | "duplicate" | "broken" | "sourceUnknown" | "unchecked";

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

export interface SkillListItem {
  id: string;
  displayName: string;
  originalName: string;
  shortPurpose: string;
  status: SkillStatus;
  sourceLabel: string;
  sourceKindLabel: string;
  availableInTools: string[];
  usageText: string | null;
  attentionReasons: SkillAttentionReason[];
  primaryPathHint: string;
  sourceCount: number;
  updatedAt: string | null;
  lastSeenAt: string | null;
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
      usageText,
      attentionReasons: item.attentionReasons,
      sourceCount: item.sourceCount
    },
    updatedAt: normalizeTimestamp(item.updatedAt ?? item.lastSeenAt)
  };
}

export function filterSkillLibraryItems(items: readonly SkillListItem[], query: string): SkillListItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...items];
  return items.filter((item) => skillItemSearchText(item).includes(normalized));
}

export function skillItemNeedsAttention(item: SkillListItem): boolean {
  return item.status !== "available";
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
    item.usageText ?? fallbackSkillUsageText,
    ...item.attentionReasons.flatMap((reason) => [reason.code, reason.label, reason.detail]),
    item.primaryPathHint
  ]
    .join(" ")
    .toLowerCase();
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

const skillStatusLabels: Record<SkillStatus, string> = {
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
