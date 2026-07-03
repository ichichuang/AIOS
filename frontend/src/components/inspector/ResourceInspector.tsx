import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { memo } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { getSkillCapabilityConfidenceLabel, type SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import {
  buildSkillDisplayEnrichment,
  ENRICHMENT_SOURCE_LABELS,
  getQualityLevelLabel,
  SUGGESTED_FIELD_LABELS,
  type SkillDisplayEnrichment
} from "../../lib/skillDisplayEnrichment";
import { getDiscoveryBooleanLabel, getMetadataString as getDiscoveryMetadataString, getMetadataStringArray, getSkillSourceBadges } from "../../lib/skillDiscoveryMetadata";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import type { AiosResource, McpServerRecord } from "../../types/inventory";
import { ResourceMetaRow } from "../resources/ResourceMetaRow";

interface ResourceInspectorProps {
  resource: AiosResource | null;
  skillIdentity: SkillIdentityRow | null;
  skillCapability: SkillCapabilityClassification | null;
}

export const ResourceInspector = memo(function ResourceInspector({ resource, skillIdentity, skillCapability }: ResourceInspectorProps) {
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
  const enrichment = buildSkillDisplayEnrichment(skillIdentity ?? resource, display);
  const metadataRows = getMetadataRows(resource);

  return (
    <Box className="inspector-panel">
      <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1, justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography className="caption" component="p">
            {display.zhCategory}
          </Typography>
          <Typography component="h3" variant="h3">
            {enrichment.displayNameZh}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
          <Chip className={`quality-chip quality-${enrichment.qualityLevel}`} label={getQualityLevelLabel(enrichment.qualityLevel)} variant="outlined" />
          {(enrichment.enrichmentSource === "inferred" || enrichment.enrichmentSource === "fallback") && <Chip className="quality-chip quality-inferred" label="自动推断" variant="outlined" />}
          <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
        </Stack>
      </Stack>
      <Typography color="text.secondary" variant="body2">
        {enrichment.displayDescriptionZh}
      </Typography>
      <Divider />
      <CapabilityClassificationSection classification={skillCapability} />
      <MetadataQualitySection enrichment={enrichment} originalName={display.technicalName} />
      <SkillIdentityProvenanceSection identity={skillIdentity} />
      <Box className="inspector-meta-grid">
        {display.technicalName !== enrichment.displayNameZh ? (
          <>
            <ResourceMetaRow label="原始名称" value={display.technicalName} code />
            <ResourceMetaRow label="显示名称" value={enrichment.displayNameZh} />
          </>
        ) : (
          <ResourceMetaRow label={zhCN.app.preservedName} value={display.technicalName} code />
        )}
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

interface MetadataQualitySectionProps {
  enrichment: SkillDisplayEnrichment;
  originalName: string;
}

function MetadataQualitySection({ enrichment, originalName }: MetadataQualitySectionProps) {
  const suggestedFields = enrichment.suggestedFields.map((field) => SUGGESTED_FIELD_LABELS[field]);
  const reasonValues = enrichment.qualityReasons.length > 0 ? enrichment.qualityReasons : ["未记录额外原因。"];
  const inferredTags = enrichment.inferredTags.length > 0 ? enrichment.inferredTags : ["无"];
  const inferredUseCases = enrichment.inferredUseCases.length > 0 ? enrichment.inferredUseCases : ["无"];

  return (
    <Box className="metadata-quality-section">
      <Typography component="h4" variant="h3">
        元数据质量
      </Typography>
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label="质量等级" value={getQualityLevelLabel(enrichment.qualityLevel)} />
        <ResourceMetaRow label="展示说明来源" value={ENRICHMENT_SOURCE_LABELS[enrichment.enrichmentSource]} code />
        {originalName !== enrichment.displayNameZh && <ResourceMetaRow label="显示名称" value={enrichment.displayNameZh} />}
      </Box>
      <CapabilityChipLine label="质量原因" values={reasonValues} />
      <CapabilityChipLine label="推断标签" values={inferredTags} />
      <CapabilityChipLine label="适用场景" values={inferredUseCases} />
      <CapabilityChipLine label="建议补充" values={suggestedFields.length > 0 ? suggestedFields : ["无"]} code={suggestedFields.length > 0} />
    </Box>
  );
}

interface SkillIdentityProvenanceSectionProps {
  identity: SkillIdentityRow | null;
}

function SkillIdentityProvenanceSection({ identity }: SkillIdentityProvenanceSectionProps) {
  if (!identity) return null;
  const provenance = getSkillIdentityProvenance(identity);

  return (
    <Box className="source-provenance-section">
      <Typography component="h4" variant="h3">
        技能身份
      </Typography>
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label="来源" value={provenance.sourceLabels || "未记录"} />
        <ResourceMetaRow label="活跃入口" value={provenance.activeEntrypoints || "无"} code={Boolean(provenance.activeEntrypoints)} />
        <ResourceMetaRow label="索引记录" value={provenance.indexRecords || "无"} code={Boolean(provenance.indexRecords)} />
        <ResourceMetaRow label="Registry 记录" value={provenance.registryRecords || "无"} code={Boolean(provenance.registryRecords)} />
        <ResourceMetaRow label="文件系统发现" value={provenance.filesystemRecords || "无"} code={Boolean(provenance.filesystemRecords)} />
        <ResourceMetaRow label="manifest path" value={provenance.manifestPaths || "无"} code={Boolean(provenance.manifestPaths)} />
        {provenance.canonicalPaths && <ResourceMetaRow label="canonical path" value={provenance.canonicalPaths} code />}
        {provenance.discoveryRoots && <ResourceMetaRow label="discovery root" value={provenance.discoveryRoots} code />}
        <ResourceMetaRow label="merged source count" value={identity.sources.length} />
      </Box>
    </Box>
  );
}

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

interface SkillIdentityProvenance {
  sourceLabels: string;
  activeEntrypoints: string;
  indexRecords: string;
  registryRecords: string;
  filesystemRecords: string;
  manifestPaths: string;
  canonicalPaths: string;
  discoveryRoots: string;
}

function getSkillIdentityProvenance(identity: SkillIdentityRow): SkillIdentityProvenance {
  const sourceLabels = identity.sourceBadges.map((badge) => badge.label).join(" / ");
  const activeEntrypoints = uniqueStrings(identity.sources.filter(isActiveEntrypointSource).map(formatSourcePath)).join("\n");
  const indexRecords = uniqueStrings(identity.sources.filter(isIndexSource).map(formatSourcePath)).join("\n");
  const registryRecords = uniqueStrings(identity.sources.filter(isRegistrySource).map(formatSourcePath)).join("\n");
  const filesystemRecords = uniqueStrings(identity.sources.filter(isFilesystemSource).map(formatSourcePath)).join("\n");
  const manifestPaths = uniqueStrings(identity.sources.flatMap((source) => [getDiscoveryMetadataString(source, "manifestPath"), ...source.paths.filter(isQualifiedSkillManifestPath)])).join("\n");
  const canonicalPaths = uniqueStrings(identity.sources.map((source) => getDiscoveryMetadataString(source, "canonicalPath"))).join("\n");
  const discoveryRoots = uniqueStrings(identity.sources.map((source) => getDiscoveryMetadataString(source, "discoveryRoot"))).join("\n");

  return {
    sourceLabels,
    activeEntrypoints,
    indexRecords,
    registryRecords,
    filesystemRecords,
    manifestPaths,
    canonicalPaths,
    discoveryRoots
  };
}

function isActiveEntrypointSource(resource: AiosResource): boolean {
  return resource.metadata?.activeEntrypoint === true || resource.metadata?.entrypoint === true || getMetadataSourceKinds(resource).includes("active-entrypoint");
}

function isIndexSource(resource: AiosResource): boolean {
  return resource.metadata?.indexed === true || getMetadataSourceKinds(resource).includes("skills-index");
}

function isRegistrySource(resource: AiosResource): boolean {
  return resource.metadata?.registryListed === true || resource.capabilityType === "registry" || getMetadataSourceKinds(resource).includes("custom-registry");
}

function isFilesystemSource(resource: AiosResource): boolean {
  return resource.metadata?.discoveredOnly === true || getMetadataSourceKinds(resource).includes("filesystem");
}

function getMetadataSourceKinds(resource: AiosResource): string[] {
  return uniqueStrings([getDiscoveryMetadataString(resource, "sourceKind"), ...getMetadataStringArray(resource, "sourceKinds")]);
}

function formatSourcePath(resource: AiosResource): string {
  return `${resource.toolType}: ${resource.path ?? resource.paths[0] ?? resource.name}`;
}

function isQualifiedSkillManifestPath(value: string): boolean {
  return value.replace(/\\/g, "/").toLowerCase().endsWith("/skill.md");
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
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
