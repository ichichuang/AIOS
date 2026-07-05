import { Box, Typography } from "@mui/material";
import { memo } from "react";
import { getMcpRiskLabels, getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource, McpServerRecord } from "../../types/inventory";
import { AiosTimelineRow, AiosUsageCard, type AiosUsageChip } from "../ui/AiosUiPrimitives";

export type ResourceCardVariant = "default" | "skill" | "mcp" | "script" | "report" | "project-pack" | "policy" | "validator" | "legacy";

interface ResourceCardProps {
  resource: AiosResource;
  selected: boolean;
  variant?: ResourceCardVariant;
  onSelect: (resource: AiosResource) => void;
}

export const ResourceCard = memo(function ResourceCard({ resource, selected, variant = "default", onSelect }: ResourceCardProps) {
  const display = getResourceDisplay(resource);
  const server = getMcpServer(resource);

  if (variant === "report") {
    return (
      <AiosTimelineRow
        chips={getUsageChips(resource, server, variant, display)}
        className={`resource-card ${variant}`}
        filename={display.technicalName}
        meta={<InventoryMetaStrip rows={getInventoryMetaRows(resource, server, variant, display)} />}
        selected={selected}
        summary={display.zhDescription}
        timestamp={formatDate(resource.updatedAt)}
        title={display.zhName}
        onClick={() => onSelect(resource)}
      />
    );
  }

  return (
    <AiosUsageCard
      chips={getUsageChips(resource, server, variant, display)}
      className={`resource-card ${variant}`}
      meta={<InventoryMetaStrip rows={getInventoryMetaRows(resource, server, variant, display)} />}
      purpose={getUsagePurpose(resource, server, variant, display)}
      selected={selected}
      technicalName={display.technicalName}
      title={getUsageTitle(server, variant, display)}
      onClick={() => onSelect(resource)}
    />
  );
});

function InventoryMetaStrip({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <Box className="inventory-meta-strip" aria-label="资源清单摘要">
      {rows.map((row) => (
        <Box className="inventory-meta-item" key={row.label}>
          <Typography component="span">{row.label}</Typography>
          <Typography component="strong" title={row.value}>
            {row.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function getInventoryMetaRows(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant, display: ReturnType<typeof getResourceDisplay>): Array<{ label: string; value: string }> {
  return [
    { label: "类型", value: `${display.zhToolType} / ${display.zhCapability}` },
    { label: "来源", value: getInventorySourceLabel(resource, server, variant) },
    { label: "边界", value: getBoundaryLabel(resource, variant) }
  ];
}

function getUsageChips(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant, display: ReturnType<typeof getResourceDisplay>): AiosUsageChip[] {
  const chips: AiosUsageChip[] = [];
  if (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available") {
    chips.push({ label: display.zhStatus, className: `status-chip status-${resource.status}`, variant: "filled" });
  }
  if (resource.risk !== "low") {
    chips.push({ label: display.zhRisk, className: `risk-chip risk-${resource.risk}`, variant: "filled" });
  }
  const boundaryChip = getBoundaryChip(resource, variant);
  if (boundaryChip) chips.push(boundaryChip);

  const extras = getExtraChips(resource, server, variant);
  for (const label of extras) {
    if (chips.length >= 2) break;
    chips.push({ label, variant: "outlined" });
  }

  if (chips.length < 2) chips.push({ label: display.zhCapability, variant: "outlined" });
  if (chips.length < 2 && display.zhToolType) chips.push({ label: display.zhToolType, variant: "outlined" });
  return dedupeChips(chips).slice(0, 2);
}

function getExtraChips(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant): string[] {
  if (isDynamicCorpusResource(resource)) return ["动态资源库", getMetadataString(resource, "projectLabel") ?? getMetadataString(resource, "scanSourceName") ?? "未归类"];
  if (variant === "mcp" && server) return [server.transport, ...getMcpRiskLabels(server)];
  if (variant === "skill") return [getSkillRuntimeLabel(resource)];
  if (variant === "script") return [getScriptKind(resource), "只读清单"];
  if (variant === "report") return ["只读"];
  if (variant === "project-pack") return [getProjectPackArea(resource)];
  if (variant === "policy") return ["守卫"];
  if (variant === "validator") return ["观察"];
  if (variant === "legacy") return ["兼容入口"];
  return [];
}

function getBoundaryChip(resource: AiosResource, variant: ResourceCardVariant): AiosUsageChip | null {
  if (resource.safetyProfile.writesGlobalState) return { label: "写入需复核", className: "status-chip status-warn", variant: "filled" };
  if (variant === "legacy" || resource.toolType === "legacy" || resource.capabilityType === "usage-prompt") return { label: "兼容", className: "status-chip status-warn" };
  if (variant === "mcp" || resource.capabilityType === "mcp-server" || resource.capabilityType === "mcp-client") return { label: "仅元数据", className: "status-chip status-disabled" };
  if (resource.safetyProfile.readOnly) return { label: "只读", className: "status-chip status-ok" };
  return { label: "需复核", className: "status-chip status-warn" };
}

function dedupeChips(chips: AiosUsageChip[]): AiosUsageChip[] {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    if (seen.has(chip.label)) return false;
    seen.add(chip.label);
    return true;
  });
}

function getInventorySourceLabel(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant): string {
  if (isDynamicCorpusResource(resource)) {
    return getMetadataString(resource, "projectLabel") ?? getMetadataString(resource, "scanSourceName") ?? "动态资源库";
  }
  if (server) return `${server.transport} · ${zhCN.mcp.localRemoteRisk[server.localRemoteRisk]}`;
  if (variant === "report") return "本地报告";
  if (variant === "project-pack") return getProjectPackArea(resource);
  if (variant === "policy") return "策略守卫";
  if (variant === "validator") return "观察验证器";
  if (variant === "legacy" || resource.toolType === "legacy") return "兼容入口";

  const sourceKind = getMetadataString(resource, "sourceKind");
  if (sourceKind) return sourceKind;
  if (resource.path || resource.paths.length > 0) return "本地清单";
  return "未记录";
}

function getBoundaryLabel(resource: AiosResource, variant: ResourceCardVariant): string {
  if (isDynamicCorpusResource(resource)) return "SQLite 元数据";
  if (resource.safetyProfile.writesGlobalState) return "写入需复核";
  if (variant === "mcp") return "只读元数据";
  if (variant === "legacy" || resource.toolType === "legacy") return "兼容只读";
  if (resource.safetyProfile.readOnly) return "本地只读";
  return "边界需复核";
}

function getUsageTitle(server: McpServerRecord | null, variant: ResourceCardVariant, display: ReturnType<typeof getResourceDisplay>): string {
  if (variant === "mcp" && server) return server.name;
  return display.zhName;
}

function getUsagePurpose(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant, display: ReturnType<typeof getResourceDisplay>): string {
  if (isDynamicCorpusResource(resource)) return `${display.zhDescription} 来源：${getMetadataString(resource, "scanSourceName") ?? "动态资源库"}；详情只使用已持久化元数据。`;
  if (variant === "mcp" && server) return `MCP ${server.transport} 服务；${getMcpRiskLabels(server)[0]}，仅查看用途与风险摘要，不启动或连接。`;
  if (variant === "script") return `本地只读工具；${display.zhDescription} 执行需要用户显式命令。`;
  if (variant === "report") return `${formatDate(resource.updatedAt)} · ${display.zhDescription}`;
  if (variant === "project-pack") return `${getProjectPackArea(resource)}资源包；查看用途和归属，完整源路径在检查器中。`;
  if (variant === "policy") return `保护本地 AIOS 边界；仅展示守卫元数据，不读取或修改策略内容。`;
  if (variant === "validator") return `观察型检查项；查看状态和用途，运行需要用户显式命令。`;
  if (variant === "legacy") return `兼容入口说明；用于识别迁移边界，不作为主要工作流。`;
  return display.zhDescription;
}

function getSkillRuntimeLabel(resource: AiosResource): string {
  if (resource.capabilityType === "registry") return "注册表";
  if (resource.capabilityType === "runtime-view") return `${resource.toolType} 入口`;
  if (resource.toolType === "aios-root") return "规范技能";
  return resource.toolType;
}

function getScriptKind(resource: AiosResource): string {
  const kind = getMetadataString(resource, "kind");
  if (kind === "validator") return "验证";
  if (kind === "builder") return "构建/生成";
  if (kind === "router") return "路由";
  if (kind === "report") return "报告";
  if (kind === "sync") return "同步";
  const haystack = `${resource.name} ${resource.path ?? ""}`.toLowerCase();
  if (haystack.includes("validate") || haystack.includes("doctor") || haystack.includes("check")) return "验证";
  if (haystack.includes("inventory") || haystack.includes("generate") || haystack.includes("build")) return "构建/生成";
  if (haystack.includes("router") || haystack.includes("route")) return "路由";
  if (haystack.includes("report")) return "报告";
  return "本地脚本";
}

function getProjectPackArea(resource: AiosResource): string {
  const root = getMetadataString(resource, "root") ?? resource.path ?? "";
  if (root.includes("/AIOS")) return "AIOS 应用";
  if (root.includes("/.ai")) return "本地 AI";
  return "项目本地";
}

function getMcpServer(resource: AiosResource): McpServerRecord | null {
  const server = resource.metadata?.server;
  if (!server || typeof server !== "object") return null;
  const candidate = server as Partial<McpServerRecord>;
  if (typeof candidate.name !== "string" || typeof candidate.command !== "string") return null;
  return candidate as McpServerRecord;
}

function isDynamicCorpusResource(resource: AiosResource): boolean {
  return getMetadataString(resource, "corpusSource") === "dynamic-resource-corpus";
}

function getMetadataString(resource: AiosResource, key: string): string | null {
  const value = resource.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function formatDate(value?: string): string {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}
