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

export type McpServiceDetailViewMode = "ready" | "loading" | "unavailable";

export interface McpServiceDetailRuntimeState {
  resourceId: string;
  serviceId: string;
  fallbackItem: McpServiceItem | null;
  detail: McpServiceDetail | null;
  loading: boolean;
  error: string | null;
}

export interface McpServiceDetailViewInput {
  detail: McpServiceDetail | null;
  fallbackItem: McpServiceItem | null;
  loading: boolean;
  error: string | null;
}

export interface McpServiceDetailViewModel {
  mode: McpServiceDetailViewMode;
  title: string;
  whatItDoes: string;
  statusText: string;
  sourceText: string;
  sourceKindText: string;
  configLocationText: string;
  toolHintsText: string;
  safetyText: string;
  commandNameText: string;
  transportText: string;
  requiredEnvNamesText: string;
  remoteHostText: string;
  attentionReasons: McpAttentionReason[];
  manualCheckSuggestions: string[];
  configSources: McpConfigSourceSummary[];
  findings: McpAttentionReason[];
  advancedRows: McpAdvancedMetadataRow[];
  notice: string | null;
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

export const fallbackMcpToolHintsUnavailableText = "暂时无法读取工具列表。AIOS Desktop 不会启动服务来获取更多内容。";
export const mcpSafetyText = "AIOS Desktop 只显示已保存的本机 MCP 基本信息；不启动服务、不连接端点、不调用 MCP 工具。";
export const mcpStaticSourceLabel = "来自本地配置记录";
export const mcpUnverifiedLabel = "未进行实时连接验证";
export const mcpUnknownValue = "暂时无法判断";
export const mcpNotRecordedValue = "未记录";

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

export function sanitizeMcpDetailLoadError(_error: unknown): string {
  return "无法读取 MCP 服务详情。请在高级信息里查看来源。";
}

export function buildMcpServiceDetailViewModel(input: McpServiceDetailViewInput): McpServiceDetailViewModel {
  const item = input.detail ?? input.fallbackItem;
  const mode: McpServiceDetailViewMode = input.detail ? "ready" : input.loading ? "loading" : "unavailable";
  const title = safeMcpDisplayText(item?.displayName, "未命名 MCP 服务");
  const toolHints = sanitizeMcpToolHints(input.detail?.toolHints ?? item?.toolHints ?? []);
  const attentionReasons = sanitizeMcpAttentionReasons(dedupeMcpAttentionReasons([...(item?.attentionReasons ?? []), ...(input.detail?.findings ?? [])]));
  const manualCheckSuggestions = (input.detail?.manualCheckSuggestions ?? [])
    .map((suggestion) => safeMcpDisplayText(suggestion, "请在对应 AI 工具的 MCP 配置里人工查看来源。"))
    .filter(Boolean);
  const configSources = sanitizeMcpConfigSources(input.detail?.configSources ?? []);
  const findings = sanitizeMcpAttentionReasons(input.detail?.findings ?? []);
  const advancedRows = sanitizeMcpAdvancedRows(input.detail?.safeAdvancedMetadataSummary ?? []);

  return {
    mode,
    title,
    whatItDoes:
      safeMcpDisplayText(input.detail?.whatItDoes, "") ||
      safeMcpDisplayText(item?.shortPurpose, "") ||
      (mode === "loading" ? "正在读取服务详情。" : "AIOS Desktop 未启动服务，暂时无法判断这个服务具体提供哪些工具。"),
    statusText: item?.status ? mcpStatusLabels[item.status] : "未检查",
    sourceText: safeMcpDisplayText(item?.sourceLabel, "来源不明"),
    sourceKindText: safeMcpDisplayText(item?.sourceKindLabel, "来源不明"),
    configLocationText: safeMcpPathHint(item?.configLocationHint) || "暂时无法判断",
    toolHintsText: formatMcpToolHints(toolHints, input.detail?.toolHintsUnavailableExplanation),
    safetyText: safeMcpDisplayText(input.detail?.safetySummary.text, "") || safeMcpDisplayText(item?.safetyText, "") || mcpSafetyText,
    commandNameText: safeMcpCommandName(item?.commandName) || "暂时无法判断",
    transportText: item?.transport && item.transport !== "unknown" ? item.transport : "暂时无法判断",
    requiredEnvNamesText: sanitizeMcpEnvNames(item?.requiredEnvNames ?? []).join("、") || "暂时无法判断",
    remoteHostText: safeMcpRemoteHost(item?.remoteHostHint) || "暂时无法判断",
    attentionReasons,
    manualCheckSuggestions,
    configSources,
    findings,
    advancedRows,
    notice: getMcpDetailNotice(mode, input.error)
  };
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
  const displayName = safeMcpDisplayText(item.displayName, "未命名 MCP 服务");
  const shortPurpose = safeMcpDisplayText(item.shortPurpose, "显示本机已保存的 MCP 服务配置线索。");
  const sourceLabel = safeMcpDisplayText(item.sourceLabel, "来源不明");
  const sourceKindLabel = safeMcpDisplayText(item.sourceKindLabel, "来源不明");
  const configLocationHint = safeMcpPathHint(item.configLocationHint);
  const toolHints = sanitizeMcpToolHints(item.toolHints);
  const attentionReasons = sanitizeMcpAttentionReasons(item.attentionReasons);
  const commandName = safeMcpCommandName(item.commandName);
  const requiredEnvNames = sanitizeMcpEnvNames(item.requiredEnvNames);
  const remoteHostHint = safeMcpRemoteHost(item.remoteHostHint);
  const safetyText = safeMcpDisplayText(item.safetyText, mcpSafetyText);
  const toolHintText = toolHints.length > 0 ? toolHints.map((tool) => tool.name).join("、") : fallbackMcpToolHintsUnavailableText;
  return {
    id: `mcp-library:${item.id}`,
    name: displayName,
    zhName: displayName,
    zhDescription: shortPurpose,
    zhCategory: `${sourceLabel} / MCP 服务`,
    zhStatus: mcpStatusLabels[item.status],
    zhRisk: mcpRiskLabels[risk],
    zhCapability: "MCP 服务",
    zhToolType: "MCP",
    toolType: "mcp",
    capabilityType: "mcp-server",
    status,
    risk,
    path: configLocationHint,
    paths: [configLocationHint].filter(Boolean),
    description: shortPurpose,
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: risk === "high" ? "medium" : "low",
      executionRisk: "low",
      notes: [
        safetyText || mcpSafetyText,
        "只显示环境变量名称，不读取或保存环境变量值。",
        toolHints.length > 0 ? `已保存的工具名称线索：${toolHintText}` : fallbackMcpToolHintsUnavailableText
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
      sourceLabel,
      sourceKindLabel,
      configLocationHint,
      toolHintCount: toolHints.length,
      toolHints: toolHints.map((tool) => tool.name),
      toolHintsUnavailableExplanation: toolHints.length > 0 ? null : fallbackMcpToolHintsUnavailableText,
      safetyText,
      attentionReasons,
      commandName,
      transport: item.transport,
      requiredEnvNames,
      remoteHostHint
    },
    updatedAt: normalizeTimestamp(item.updatedAt ?? item.lastSeenAt)
  };
}

export function mapMcpServiceItemToResources(item: McpServiceItem): AiosResource[] {
  const serviceResource = mapMcpServiceItemToResource(item);
  const toolResources = sanitizeMcpToolHints(item.toolHints).map((tool, index) => mapMcpToolHintToResource(item, tool, index));
  return [serviceResource, ...toolResources];
}

function mapMcpToolHintToResource(item: McpServiceItem, tool: McpToolHint, index: number): AiosResource {
  const parent = mapMcpServiceItemToResource(item);
  const safeToolName = safeMcpToolName(tool.name) || `tool-${index + 1}`;
  const safePurpose = safeMcpDisplayText(tool.purpose, "已保存的工具名称线索。");
  const safeServiceLabel = safeMcpDisplayText(tool.serviceLabel, parent.name);
  const toolId = safeMcpReasonCode(`${item.id}:tool:${safeToolName}`);

  return {
    ...parent,
    id: `mcp-library-tool:${toolId}`,
    name: safeToolName,
    zhName: safeToolName,
    zhDescription: safePurpose,
    zhCategory: `${safeServiceLabel} / MCP 工具线索`,
    zhCapability: "MCP 工具线索",
    capabilityType: "mcp-client",
    description: safePurpose,
    safetyProfile: {
      ...parent.safetyProfile,
      notes: [
        safePurpose,
        "这是已保存的工具名称线索；AIOS Desktop 不启动服务、不连接端点、不调用工具。"
      ]
    },
    metadata: {
      ...parent.metadata,
      mcpToolHintName: safeToolName,
      mcpToolHintPurpose: safePurpose,
      mcpToolHintStatus: safeMcpDisplayText(tool.status, "unverified"),
      toolHintCount: 1,
      toolHints: [safeToolName],
      toolHintsUnavailableExplanation: null
    }
  };
}

export function filterMcpServiceItems(items: readonly McpServiceItem[], query: string): McpServiceItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...items];
  return items.filter((item) => mcpItemSearchText(item).includes(normalized));
}

export function mcpServiceNeedsAttention(item: McpServiceItem): boolean {
  return (item.status !== "visible" && item.status !== "likelyAvailable") || item.attentionReasons.length > 0;
}

function formatMcpToolHints(toolHints: readonly McpToolHint[], unavailableExplanation?: string): string {
  const names = sanitizeMcpToolHints(toolHints).map((tool) => tool.name);
  if (names.length > 0) return names.join("、");
  return safeMcpDisplayText(unavailableExplanation, fallbackMcpToolHintsUnavailableText);
}

function dedupeMcpAttentionReasons(reasons: readonly McpAttentionReason[]): McpAttentionReason[] {
  const seen = new Set<string>();
  return reasons.filter((reason) => {
    const key = reason.code || `${reason.label}:${reason.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getMcpDetailNotice(mode: McpServiceDetailViewMode, error: string | null): string | null {
  if (mode === "loading") return "正在读取 AIOS Desktop 已保存的 MCP 基本信息。";
  if (mode === "unavailable") return error ?? "暂时无法读取完整 MCP 服务详情。请在高级信息里查看来源。";
  return null;
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

function sanitizeMcpToolHints(toolHints: readonly McpToolHint[]): McpToolHint[] {
  const seen = new Set<string>();
  const output: McpToolHint[] = [];
  for (const tool of toolHints) {
    const name = safeMcpToolName(tool.name);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    output.push({
      name,
      purpose: safeMcpDisplayText(tool.purpose, "已保存的工具名称线索。"),
      serviceLabel: safeMcpDisplayText(tool.serviceLabel, "MCP 服务"),
      status: safeMcpDisplayText(tool.status, "unverified")
    });
  }
  return output;
}

function sanitizeMcpAttentionReasons(reasons: readonly McpAttentionReason[]): McpAttentionReason[] {
  return reasons.map((reason) => ({
    code: safeMcpReasonCode(reason.code),
    label: safeMcpDisplayText(reason.label, "需要查看"),
    detail: safeMcpFindingDetail(reason.detail),
    severity: safeMcpDisplayText(reason.severity, "medium")
  }));
}

function sanitizeMcpConfigSources(sources: readonly McpConfigSourceSummary[]): McpConfigSourceSummary[] {
  return sources.map((source) => ({
    ...source,
    id: safeMcpReasonCode(source.id),
    sourceLabel: safeMcpDisplayText(source.sourceLabel, "来源不明"),
    sourceKindLabel: safeMcpDisplayText(source.sourceKindLabel, "来源不明"),
    pathHint: safeMcpPathHint(source.pathHint),
    rootPathHint: source.rootPathHint ? safeMcpPathHint(source.rootPathHint) : null,
    scanStatus: source.scanStatus ? safeMcpDisplayText(source.scanStatus, "未记录") : null
  }));
}

function sanitizeMcpAdvancedRows(rows: readonly McpAdvancedMetadataRow[]): McpAdvancedMetadataRow[] {
  return rows.map((row) => ({
    label: safeMcpDisplayText(row.label, "高级信息"),
    value: safeMcpDisplayText(row.value, "已隐藏敏感内容。")
  }));
}

function sanitizeMcpEnvNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of names) {
    const name = String(value).split("=")[0]?.trim() ?? "";
    if (!isSafeMcpEnvName(name) || seen.has(name)) continue;
    seen.add(name);
    output.push(name);
  }
  return output;
}

function safeMcpDisplayText(value: string | null | undefined, fallback: string): string {
  const text = value?.trim() ?? "";
  if (!text) return fallback;
  if (containsUnsafeMcpText(text) || containsUrl(text)) return fallback;
  return text;
}

function safeMcpFindingDetail(value: string): string {
  return safeMcpDisplayText(value, "已隐藏敏感内容。");
}

function safeMcpPathHint(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text) return "未记录";
  if (containsUrl(text)) return safeMcpRemoteHost(text) ?? "[sensitive]";
  if (containsRawMcpLogHint(text)) return "已隐藏敏感内容。";
  return text
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => (isSecretLikeMcpSegment(segment) ? "[sensitive]" : segment))
    .join("/");
}

function safeMcpCommandName(value: string | null | undefined): string {
  const text = value?.trim() ?? "";
  if (!text) return "";
  const token = text.split(/\s+/)[0]?.replace(/\\/g, "/").split("/").at(-1)?.trim().replace(/^[`'",;(]+|[`'",;).]+$/g, "") ?? "";
  if (!token || containsUnsafeMcpText(token) || containsUrl(token)) return "";
  return token;
}

function safeMcpRemoteHost(value: string | null | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) return null;
  let host = "";
  if (containsUrl(text)) {
    try {
      const match = text.match(/https?:\/\/[^\s"',;)]+/i);
      host = match ? new URL(match[0]).hostname : "";
    } catch {
      host = "";
    }
  }
  if (!host) {
    host = text
      .replace(/^[`'",;(]+|[`'",;).]+$/g, "")
      .split("/")[0]
      ?.split("@")
      .at(-1)
      ?.split(":")[0]
      ?.trim() ?? "";
  }
  if (!host || containsUnsafeMcpText(host) || !/^[a-z0-9.-]+$/i.test(host)) return null;
  return host;
}

function safeMcpToolName(value: string): string {
  const text = value.trim();
  if (!text || text.length > 80 || containsUnsafeMcpText(text)) return "";
  return /^[A-Za-z0-9_.-]+$/.test(text) ? text : "";
}

function safeMcpReasonCode(value: string): string {
  const text = value.trim();
  if (!text || containsUnsafeMcpText(text)) return "redacted";
  return text.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 120) || "redacted";
}

function isSafeMcpEnvName(value: string): boolean {
  return /^[_A-Za-z][_A-Za-z0-9]{0,95}$/.test(value);
}

function containsUnsafeMcpText(value: string): boolean {
  return containsRawMcpLogHint(value) || containsSecretLikeMcpText(value);
}

function containsRawMcpLogHint(value: string): boolean {
  return /raw log|stdout|stderr|stack trace/i.test(value);
}

function containsSecretLikeMcpText(value: string): boolean {
  return value
    .replace(/\\/g, "/")
    .split(/[/"'\s=:;,{}[\]()]+/)
    .some(isSecretLikeMcpSegment);
}

function isSecretLikeMcpSegment(value: string): boolean {
  const lower = value.trim().toLowerCase();
  if (!lower || lower === "[sensitive]") return false;
  return (
    lower === ".env" ||
    lower.endsWith(".env") ||
    lower.includes("secret") ||
    lower.includes("token") ||
    lower.includes("credential") ||
    lower.includes("password") ||
    lower.includes("passwd") ||
    lower.includes("private_key") ||
    lower.includes("api_key") ||
    lower.includes("apikey") ||
    lower.includes("auth") ||
    lower.includes("session") ||
    lower.includes("cookie")
  );
}

function containsUrl(value: string): boolean {
  return /https?:\/\//i.test(value);
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

export function isUnknownMcpValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const text = String(value).trim();
  return text.length === 0 || text === mcpUnknownValue || text === mcpNotRecordedValue;
}

export function formatMcpToolHintSummary(toolHints: readonly McpToolHint[], unavailableExplanation?: string): string {
  const hints = sanitizeMcpToolHints(toolHints);
  if (hints.length === 0) {
    return safeMcpDisplayText(unavailableExplanation, fallbackMcpToolHintsUnavailableText);
  }
  return `${hints.length} 个工具线索：${hints.map((hint) => hint.name).join("、")}`;
}

export function buildMcpCompactDetailFields(view: McpServiceDetailViewModel): Array<{ label: string; value: string }> {
  const fields: Array<{ label: string; value: string }> = [];
  if (!isUnknownMcpValue(view.commandNameText)) fields.push({ label: "命令名称", value: view.commandNameText });
  if (!isUnknownMcpValue(view.transportText)) fields.push({ label: "传输方式", value: view.transportText });
  if (!isUnknownMcpValue(view.requiredEnvNamesText)) fields.push({ label: "环境变量名", value: view.requiredEnvNamesText });
  if (!isUnknownMcpValue(view.remoteHostText)) fields.push({ label: "远程主机", value: view.remoteHostText });
  return fields;
}

export const mcpStatusLabels: Record<McpServiceStatus, string> = {
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
