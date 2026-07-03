import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import { memo } from "react";
import { getMcpRiskLabels, getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource, McpServerRecord } from "../../types/inventory";
import { ResourceChips } from "./ResourceChips";
import { ResourceMetaRow } from "./ResourceMetaRow";

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

  // Compute at most 2 chips systematically
  const chipsToShow: string[] = [];
  if (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available") {
    chipsToShow.push(display.zhStatus);
  }
  if (resource.risk !== "low") {
    chipsToShow.push(display.zhRisk);
  }
  const extras = getExtraChips(resource, server, variant);
  for (const ext of extras) {
    if (chipsToShow.length < 2) {
      chipsToShow.push(ext);
    }
  }
  if (chipsToShow.length < 2) {
    chipsToShow.push(display.zhCapability);
  }
  if (chipsToShow.length < 2 && display.zhToolType) {
    chipsToShow.push(display.zhToolType);
  }
  const finalChips = chipsToShow.slice(0, 2);

  return (
    <Card className={selected ? `resource-card material-card ${variant} selected` : `resource-card material-card ${variant}`} data-motion="resource-card">
      <CardActionArea aria-pressed={selected} data-resource-id={resource.id} onClick={() => onSelect(resource)}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Stack className="resource-card-top" direction="row" sx={{ alignItems: "center", gap: 1.5, justifyContent: "space-between", mb: 1 }}>
            <Box className="resource-card-title" sx={{ minWidth: 0 }}>
              <Typography className="resource-title" component="h3" sx={{ fontSize: "14px", fontWeight: 700, m: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {display.zhName}
              </Typography>
              <Box className="code-pill resource-technical-name" component="code" sx={{ fontSize: "11px", px: 0.75, py: 0.25, backgroundColor: "var(--aios-outline)", borderRadius: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block", mt: 0.5 }}>
                {display.technicalName}
              </Box>
            </Box>
            <Stack className="resource-chip-row" direction="row" sx={{ gap: 0.75, flexShrink: 0, alignItems: "center" }}>
              {finalChips.map((chipText) => {
                const isStatus = chipText === display.zhStatus;
                const isRisk = chipText === display.zhRisk;
                let className = "outlined-chip";
                if (isStatus) className = `status-chip status-${resource.status}`;
                else if (isRisk) className = `risk-chip risk-${resource.risk}`;

                return (
                  <Chip
                    className={className}
                    key={chipText}
                    label={chipText}
                    variant={(isStatus && resource.status !== "ok") || (isRisk && resource.risk !== "low") ? "filled" : "outlined"}
                    size="small"
                    sx={{ height: 22, fontSize: "10px" }}
                  />
                );
              })}
            </Stack>
          </Stack>

          <Typography className="resource-description" color="text.secondary" variant="body2" sx={{ fontSize: "12px", m: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {display.zhDescription}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
});

function getExtraChips(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant): string[] {
  if (variant === "mcp" && server) return [server.transport, zhCN.mcp.localRemoteRisk[server.localRemoteRisk]];
  if (variant === "skill") return [getSkillRuntimeLabel(resource)];
  if (variant === "script") return [getScriptKind(resource)];
  if (variant === "legacy") return ["兼容入口"];
  return [];
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

function getMcpServer(resource: AiosResource): McpServerRecord | null {
  const server = resource.metadata?.server;
  if (!server || typeof server !== "object") return null;
  const candidate = server as Partial<McpServerRecord>;
  if (typeof candidate.name !== "string" || typeof candidate.command !== "string") return null;
  return candidate as McpServerRecord;
}

function getMetadataString(resource: AiosResource, key: string): string | null {
  const value = resource.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function formatDate(value?: string): string {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}
