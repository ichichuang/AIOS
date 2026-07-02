import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { memo } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { getSkillCapabilityConfidenceLabel, type SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import { getDiscoveryBooleanLabel, getMetadataString as getDiscoveryMetadataString, getSkillSourceBadges } from "../../lib/skillDiscoveryMetadata";
import type { AiosResource, McpServerRecord } from "../../types/inventory";
import { ResourceMetaRow } from "../resources/ResourceMetaRow";

interface ResourceInspectorProps {
  resource: AiosResource | null;
  skillCapability: SkillCapabilityClassification | null;
}

export const ResourceInspector = memo(function ResourceInspector({ resource, skillCapability }: ResourceInspectorProps) {
  if (!resource) {
    return (
      <Box className="inspector-panel inspector-empty-panel">
        <Typography component="h3" variant="h3">
          {zhCN.app.inspectorEmptyTitle}
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
      <CapabilityClassificationSection classification={skillCapability} />
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

interface CapabilityClassificationSectionProps {
  classification: SkillCapabilityClassification | null;
}

function CapabilityClassificationSection({ classification }: CapabilityClassificationSectionProps) {
  if (!classification) return null;
  const secondaryLabels = classification.secondaryCategories.map((category) => category.title);

  return (
    <Box className="capability-inspector-section">
      <Typography component="h4" variant="h3">
        能力分类
      </Typography>
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label="主分类" value={classification.primaryCategory.title} />
        <ResourceMetaRow label="可信度" value={getSkillCapabilityConfidenceLabel(classification.confidence)} />
      </Box>
      <CapabilityChipLine label="关联能力" values={secondaryLabels.length > 0 ? secondaryLabels : ["无"]} />
      <CapabilityChipLine label="匹配依据" values={classification.evidenceKeywords.length > 0 ? classification.evidenceKeywords : ["无"]} code />
    </Box>
  );
}

interface CapabilityChipLineProps {
  label: string;
  values: string[];
  code?: boolean;
}

function CapabilityChipLine({ label, values, code }: CapabilityChipLineProps) {
  return (
    <Box className="capability-chip-line">
      <Typography color="text.secondary" component="span">
        {label}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, minWidth: 0 }}>
        {values.map((value) => (
          <Chip className={code ? "capability-chip evidence" : "capability-chip"} key={value} label={value} variant="outlined" />
        ))}
      </Stack>
    </Box>
  );
}

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

  if (hasDiscoveryMetadata(resource)) {
    const sourceBadges = getSkillSourceBadges(resource);
    if (sourceBadges.length > 0) rows.push({ label: "发现来源", value: sourceBadges.map((badge) => badge.label).join(" / ") });
    rows.push(
      { label: "是否索引内", value: getDiscoveryBooleanLabel(resource, "indexed") },
      { label: "是否活跃入口", value: getDiscoveryBooleanLabel(resource, "activeEntrypoint") },
      { label: "是否 Registry 记录", value: getDiscoveryBooleanLabel(resource, "registryListed") },
      { label: "是否蒸馏相关", value: getDiscoveryBooleanLabel(resource, "distillationRelated") }
    );
    const manifestPath = getDiscoveryMetadataString(resource, "manifestPath");
    if (manifestPath) rows.push({ label: "manifest path", value: manifestPath, code: true });
    const discoveryRoot = getDiscoveryMetadataString(resource, "discoveryRoot");
    if (discoveryRoot) rows.push({ label: "发现根目录", value: discoveryRoot, code: true });
  }

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

function hasDiscoveryMetadata(resource: AiosResource): boolean {
  return Boolean(
    resource.metadata?.sourceKind ||
      resource.metadata?.manifestPath ||
      resource.metadata?.indexed !== undefined ||
      resource.metadata?.registryListed !== undefined ||
      resource.metadata?.activeEntrypoint !== undefined ||
      resource.metadata?.distillationRelated !== undefined
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}
