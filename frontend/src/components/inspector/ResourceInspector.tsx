import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { memo } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource, McpServerRecord } from "../../types/inventory";
import { ResourceMetaRow } from "../resources/ResourceMetaRow";

interface ResourceInspectorProps {
  resource: AiosResource | null;
}

export const ResourceInspector = memo(function ResourceInspector({ resource }: ResourceInspectorProps) {
  if (!resource) {
    return (
      <Box className="inspector-panel">
        <Typography component="h3" variant="h3">
          {zhCN.app.detailPanel}
        </Typography>
        <Typography color="text.secondary">{zhCN.app.inspectorEmpty}</Typography>
      </Box>
    );
  }

  const display = getResourceDisplay(resource);
  const metadataRows = getMetadataRows(resource);

  return (
    <Box className="inspector-panel">
      <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1, justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography className="caption" component="p">
            {display.zhCategory}
          </Typography>
          <Typography component="h3" variant="h3">
            {display.zhName}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
          <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
        </Stack>
      </Stack>
      <Typography color="text.secondary" variant="body2">
        {display.zhDescription}
      </Typography>
      <Divider />
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label={zhCN.app.preservedName} value={display.technicalName} code />
        <ResourceMetaRow label="工具类型" value={display.zhToolType} />
        <ResourceMetaRow label="能力类型" value={display.zhCapability} />
        <ResourceMetaRow label="风险解释" value={display.zhRiskDescription} />
        <ResourceMetaRow label={zhCN.safetyFields.readOnly} value={resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no} />
        <ResourceMetaRow label={zhCN.safetyFields.executionRisk} value={zhCN.risks[resource.safetyProfile.executionRisk]} />
        <ResourceMetaRow label={zhCN.tokenFields.estimatedTokens} value={resource.tokenPressure.estimatedTokens} />
        {metadataRows.map((row) => (
          <ResourceMetaRow key={row.label} label={row.label} value={row.value} code={row.code} />
        ))}
      </Box>
      <Box className="inspector-path-list">
        <Typography component="h4" variant="h3">
          {zhCN.app.pathPreview}
        </Typography>
        {resource.paths.length > 0 ? (
          resource.paths.map((path) => (
            <Box className="code-pill path-detail" component="code" key={path}>
              {path}
            </Box>
          ))
        ) : (
          <Typography color="text.secondary">{zhCN.app.noPath}</Typography>
        )}
      </Box>
    </Box>
  );
});

interface MetadataRow {
  label: string;
  value: string | number;
  code?: boolean;
}

function getMetadataRows(resource: AiosResource): MetadataRow[] {
  const rows: MetadataRow[] = [];
  const server = getMcpServer(resource);
  if (server) {
    rows.push(
      { label: zhCN.mcp.command, value: server.command, code: true },
      { label: zhCN.mcp.transport, value: server.transport },
      { label: "环境变量名", value: `${server.envVarNames.length} 个` },
      { label: zhCN.mcp.source, value: server.sourcePath, code: true }
    );
  }

  const kind = getMetadataString(resource, "kind");
  if (kind) rows.push({ label: "清单类型", value: kind });

  const root = getMetadataString(resource, "root");
  if (root) rows.push({ label: "资源根", value: root, code: true });

  if (resource.updatedAt) rows.push({ label: "更新时间", value: formatDate(resource.updatedAt) });
  return rows;
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}
