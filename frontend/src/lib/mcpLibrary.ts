import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntimeAvailable } from "./customDirectoryScan";
import type { ResourceView } from "./filtering";
import type { AiosResource, ResourceStatus, RiskLevel } from "../types/inventory";

export type McpServiceStatus = "visible" | "likelyAvailable" | "needsAttention" | "sourceUnknown" | "unreadable" | "unchecked";

export interface McpLibraryCounts {
  mcpConfigCount: number;
  serviceCount: number;
  verifiedServiceCount: number;
  unverifiedServiceCount: number;
  toolHintCount: number;
  needsAttentionCount: number;
  sourceUnknownCount: number;
  configUnreadableCount: number;
}

export interface McpLibrarySummary {
  generatedAtMs: number;
  latestSearchOrScanTime: number | null;
  counts: McpLibraryCounts;
  metadataOnly: boolean;
  contentStorageEnabled: boolean;
}

export interface McpAttentionReason {
  code: string;
  label: string;
  detail: string;
  severity: string;
}

export interface McpToolHint {
  name: string;
  purpose: string;
  serviceLabel: string;
  status: string;
}

export interface McpServiceItem {
  id: string;
  displayName: string;
  shortPurpose: string;
  status: McpServiceStatus;
  sourceLabel: string;
  sourceKindLabel: string;
  configLocationHint: string;
  toolHintCount: number;
  toolHints: McpToolHint[];
  safetyText: string;
  attentionReasons: McpAttentionReason[];
  commandName: string | null;
  transport: string;
  requiredEnvNames: string[];
  remoteHostHint: string | null;
  updatedAt: string | null;
  lastSeenAt: string | null;
}

export interface McpConfigSourceSummary {
  id: string;
  sourceLabel: string;
  sourceKindLabel: string;
  pathHint: string;
  rootPathHint: string | null;
  lastSeenAt: string | null;
  scanStatus: string | null;
  findingCount: number;
  verified: boolean;
  configUnreadable: boolean;
}

export interface McpSafetySummary {
  readOnly: boolean;
  startsServices: boolean;
  connectsEndpoints: boolean;
  callsTools: boolean;
  readsEnvValues: boolean;
  storesEnvValues: boolean;
  text: string;
}

export interface McpAdvancedMetadataRow {
  label: string;
  value: string;
}

export interface McpServiceDetail extends McpServiceItem {
  whatItDoes: string;
  configSources: McpConfigSourceSummary[];
  toolHintsUnavailableExplanation: string;
  manualCheckSuggestions: string[];
  safetySummary: McpSafetySummary;
  findings: McpAttentionReason[];
  safeAdvancedMetadataSummary: McpAdvancedMetadataRow[];
}

export interface McpLibraryModuleState {
  summary: McpLibrarySummary | null;
  items: McpServiceItem[];
  loading: boolean;
  error: string | null;
  available: boolean;
}

export interface HomeMcpLibraryStats {
  serviceCount: number;
  toolHintCount: number;
  needsAttentionCount: number;
  latestSearchOrScanLabel: string;
  usingProductSummary: boolean;
  viewCounts: Record<ResourceView, number>;
}

export const fallbackMcpToolHintsUnavailableText = "暂时无法判断工具列表。AIOS Desktop 不会启动服务来获取更多内容。";
export const mcpSafetyText = "AIOS Desktop 只显示已保存的本机 MCP 基本信息；不启动服务、不连接端点、不调用 MCP 工具。";

export async function getMcpLibrarySummary(): Promise<McpLibrarySummary | null> {
  if (!isTauriRuntimeAvailable()) return null;
  return invoke<McpLibrarySummary>("get_mcp_library_summary");
}

export async function listMcpServiceItems(): Promise<McpServiceItem[]> {
  if (!isTauriRuntimeAvailable()) return [];
  return invoke<McpServiceItem[]>("list_mcp_service_items");
}

export async function getMcpServiceDetail(serviceId: string): Promise<McpServiceDetail> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error("当前页面不在 Tauri 桌面运行时中，无法读取 MCP 服务详情。");
  }
  return invoke<McpServiceDetail>("get_mcp_service_detail", { serviceId });
}

export function buildHomeMcpLibraryStats(summary: McpLibrarySummary | null, viewCounts: Record<ResourceView, number>): HomeMcpLibraryStats {
  if (summary) {
    return {
      serviceCount: Math.max(0, summary.counts.serviceCount),
      toolHintCount: Math.max(0, summary.counts.toolHintCount),
      needsAttentionCount: Math.max(0, summary.counts.needsAttentionCount),
      latestSearchOrScanLabel: formatScanTime(summary.latestSearchOrScanTime),
      usingProductSummary: true,
      viewCounts
    };
  }

  return {
    serviceCount: Math.max(0, viewCounts.mcp),
    toolHintCount: 0,
    needsAttentionCount: 0,
    latestSearchOrScanLabel: "还没有查找记录",
    usingProductSummary: false,
    viewCounts
  };
}

export function getMcpLibraryItemIdFromResource(resource: AiosResource): string | null {
  if (resource.metadata?.corpusSource !== "mcp-library-product") return null;
  const itemId = resource.metadata.mcpLibraryItemId;
  return typeof itemId === "string" && itemId.trim().length > 0 ? itemId : null;
}

export function mapMcpServiceItemToResource(item: McpServiceItem): AiosResource {
  const status = mapMcpStatus(item.status);
  const risk = mapMcpRisk(item.status, item.attentionReasons);
  const toolHintText = item.toolHints.length > 0 ? item.toolHints.map((tool) => tool.name).join("、") : fallbackMcpToolHintsUnavailableText;
  return {
    id: `mcp-library:${item.id}`,
    name: item.displayName,
    zhName: item.displayName,
    zhDescription: item.shortPurpose,
    zhCategory: `${item.sourceLabel} / MCP 服务`,
    zhStatus: mcpStatusLabels[item.status],
    zhRisk: mcpRiskLabels[risk],
    zhCapability: "MCP 服务",
    zhToolType: "MCP",
    toolType: "mcp",
    capabilityType: "mcp-server",
    status,
    risk,
    path: item.configLocationHint,
    paths: [item.configLocationHint].filter(Boolean),
    description: item.shortPurpose,
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: risk === "high" ? "medium" : "low",
      executionRisk: "low",
      notes: [
        item.safetyText || mcpSafetyText,
        "只显示环境变量名称，不读取或保存环境变量值。",
        item.toolHints.length > 0 ? `已保存的工具名称线索：${toolHintText}` : fallbackMcpToolHintsUnavailableText
      ]
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "MCP 工具库产品聚合元数据"
    },
    prompts: [],
    metadata: {
      corpusSource: "mcp-library-product",
      mcpLibraryItemId: item.id,
      mcpStatus: item.status,
      sourceLabel: item.sourceLabel,
      sourceKindLabel: item.sourceKindLabel,
      configLocationHint: item.configLocationHint,
      toolHintCount: item.toolHintCount,
      toolHints: item.toolHints.map((tool) => tool.name),
      toolHintsUnavailableExplanation: item.toolHints.length > 0 ? null : fallbackMcpToolHintsUnavailableText,
      safetyText: item.safetyText,
      attentionReasons: item.attentionReasons,
      commandName: item.commandName,
      transport: item.transport,
      requiredEnvNames: item.requiredEnvNames,
      remoteHostHint: item.remoteHostHint
    },
    updatedAt: normalizeTimestamp(item.updatedAt ?? item.lastSeenAt)
  };
}

export function filterMcpServiceItems(items: readonly McpServiceItem[], query: string): McpServiceItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...items];
  return items.filter((item) => mcpItemSearchText(item).includes(normalized));
}

export function mcpServiceNeedsAttention(item: McpServiceItem): boolean {
  return item.status !== "visible" && item.status !== "likelyAvailable";
}

function mcpItemSearchText(item: McpServiceItem): string {
  return [
    item.id,
    item.displayName,
    item.shortPurpose,
    item.status,
    mcpStatusLabels[item.status],
    item.sourceLabel,
    item.sourceKindLabel,
    item.configLocationHint,
    item.commandName,
    item.transport,
    item.remoteHostHint,
    ...item.requiredEnvNames,
    ...item.toolHints.flatMap((tool) => [tool.name, tool.purpose, tool.serviceLabel, tool.status]),
    ...item.attentionReasons.flatMap((reason) => [reason.code, reason.label, reason.detail])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function mapMcpStatus(status: McpServiceStatus): ResourceStatus {
  if (status === "visible" || status === "likelyAvailable") return "available";
  if (status === "unreadable") return "missing";
  if (status === "sourceUnknown" || status === "unchecked") return "unknown";
  return "warn";
}

function mapMcpRisk(status: McpServiceStatus, reasons: readonly McpAttentionReason[]): RiskLevel {
  if (status === "visible" || status === "likelyAvailable") return "low";
  if (status === "unreadable" || reasons.some((reason) => reason.severity === "high")) return "high";
  return "medium";
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

const mcpStatusLabels: Record<McpServiceStatus, string> = {
  visible: "可见",
  likelyAvailable: "可能可用",
  needsAttention: "需要处理",
  sourceUnknown: "来源不明",
  unreadable: "无法读取",
  unchecked: "未检查"
};

const mcpRiskLabels: Record<RiskLevel, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险"
};
