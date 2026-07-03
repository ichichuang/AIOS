import { Box, Chip, Divider, Stack, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { memo } from "react";
import { getResourceDisplay, translateSafetyNote, translateTokenReason } from "../../i18n/resourceText";
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
import { PromptCopyButton } from "../PromptCopyButton";

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

  // Prompt actions
  const codexPrompt = resource.prompts.find((prompt) => prompt.target === "codex");
  const claudePrompt = resource.prompts.find((prompt) => prompt.target === "claude");

  return (
    <Box className="inspector-panel" sx={{ border: "none", backgroundColor: "transparent", p: 0, display: "flex", flexDirection: "column", gap: 1.5 }}>
      {/* Top Section: Usage First */}
      <Box className="inspector-panel" sx={{ p: 1.5 }}>
        <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1, justifyContent: "space-between", mb: 0.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography className="caption" component="p" sx={{ fontSize: "11px", color: "text.secondary", m: 0 }}>
              {display.zhCategory}
            </Typography>
            <Typography component="h3" variant="h3" sx={{ fontSize: "16px", fontWeight: 700, mt: 0.25, mb: 0.5 }}>
              {enrichment.displayNameZh}
            </Typography>
            <Box className="code-pill inspector-code" component="code" sx={{ fontSize: "11px", px: 0.75, py: 0.25, backgroundColor: "var(--aios-outline)", borderRadius: "4px" }}>
              {display.technicalName}
            </Box>
          </Box>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
            <Chip className={`quality-chip quality-${enrichment.qualityLevel}`} label={getQualityLevelLabel(enrichment.qualityLevel)} variant="outlined" size="small" />
            <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} size="small" />
          </Stack>
        </Stack>

        <Typography color="text.secondary" variant="body2" sx={{ fontSize: "13px", my: 1 }}>
          {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
        </Typography>

        {enrichment.inferredUseCases.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, fontSize: "12px" }}>适合用于</Typography>
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
              {enrichment.inferredUseCases.map((useCase) => (
                <Chip key={useCase} label={useCase} size="small" variant="outlined" sx={{ fontSize: "11px" }} />
              ))}
            </Stack>
          </Box>
        )}
      </Box>

      {/* Accordions */}
      <Stack spacing={1} sx={{ width: "100%" }}>
        {/* 如何使用 (Default Expanded - Only if prompts exist) */}
        {resource.prompts.length > 0 && (
          <Accordion defaultExpanded disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 38, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>如何使用</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 1.5, display: "grid", gap: 1 }}>
              <Stack spacing={1}>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                  <PromptCopyButton prompt={codexPrompt} target="codex" />
                  <PromptCopyButton prompt={claudePrompt} target="claude" />
                </Stack>
                <Typography color="text.secondary" variant="body2" sx={{ fontSize: "11px" }}>
                  {zhCN.app.promptBodyEnglish}
                </Typography>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* 概览 (Default Expanded) */}
        <Accordion defaultExpanded disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 38, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>概览</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5 }}>
            <Box className="inspector-meta-grid" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <ResourceMetaRow label="工具类型" value={display.zhToolType} />
              <ResourceMetaRow label="能力类型" value={display.zhCapability} />
              <ResourceMetaRow label="风险等级" value={display.zhRisk} />
              <ResourceMetaRow label="风险解释" value={display.zhRiskDescription} />
              {skillCapability && (
                <>
                  <ResourceMetaRow label="主分类" value={skillCapability.primaryCategory.title} />
                  <ResourceMetaRow label="可信度" value={getSkillCapabilityConfidenceLabel(skillCapability.confidence)} />
                </>
              )}
              <ResourceMetaRow label={zhCN.safetyFields.readOnly} value={resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no} />
              <ResourceMetaRow label={zhCN.safetyFields.writesGlobalState} value={resource.safetyProfile.writesGlobalState ? zhCN.booleans.yes : zhCN.booleans.no} />
              <ResourceMetaRow label={zhCN.tokenFields.estimatedTokens} value={resource.tokenPressure.estimatedTokens} />
              {metadataRows.map((row) => (
                <ResourceMetaRow key={row.label} label={row.label} value={row.value} code={row.code} />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* 元数据质量 (Default Collapsed) */}
        <Accordion disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 38, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>元数据质量</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, display: "grid", gap: 1.5 }}>
            <Box className="inspector-meta-grid" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <ResourceMetaRow label="质量等级" value={getQualityLevelLabel(enrichment.qualityLevel)} />
              <ResourceMetaRow label="展示说明来源" value={ENRICHMENT_SOURCE_LABELS[enrichment.enrichmentSource]} code />
            </Box>
            <CapabilityChipLine label="质量原因" values={enrichment.qualityReasons.length > 0 ? enrichment.qualityReasons : ["未记录额外原因。"]} />
            <CapabilityChipLine label="推断标签" values={enrichment.inferredTags.length > 0 ? enrichment.inferredTags : ["无"]} />
            <CapabilityChipLine label="建议补充" values={enrichment.suggestedFields.map((field) => SUGGESTED_FIELD_LABELS[field]).length > 0 ? enrichment.suggestedFields.map((field) => SUGGESTED_FIELD_LABELS[field]) : ["无"]} code={enrichment.suggestedFields.length > 0} />
          </AccordionDetails>
        </Accordion>

        {/* 来源与路径 (Default Collapsed) */}
        <Accordion disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 38, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>来源与路径</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, display: "grid", gap: 1.5 }}>
            {skillIdentity && (
              <Box className="inspector-meta-grid" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
                <ResourceMetaRow label="来源" value={getSkillIdentityProvenance(skillIdentity).sourceLabels || "未记录"} />
                <ResourceMetaRow label="活跃入口" value={getSkillIdentityProvenance(skillIdentity).activeEntrypoints || "无"} code={Boolean(getSkillIdentityProvenance(skillIdentity).activeEntrypoints)} />
                <ResourceMetaRow label="Registry 记录" value={getSkillIdentityProvenance(skillIdentity).registryRecords || "无"} code={Boolean(getSkillIdentityProvenance(skillIdentity).registryRecords)} />
                <ResourceMetaRow label="文件系统发现" value={getSkillIdentityProvenance(skillIdentity).filesystemRecords || "无"} code={Boolean(getSkillIdentityProvenance(skillIdentity).filesystemRecords)} />
                {getSkillIdentityProvenance(skillIdentity).canonicalPaths && <ResourceMetaRow label="canonical path" value={getSkillIdentityProvenance(skillIdentity).canonicalPaths} code />}
              </Box>
            )}
            <Box className="inspector-path-list">
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, fontSize: "12px" }}>路径详情</Typography>
              {resource.paths.length > 0 ? (
                resource.paths.slice(0, 3).map((path) => (
                  <Box className="code-pill path-detail" component="code" key={path} sx={{ display: "block", fontSize: "11px", p: 0.75, backgroundColor: "var(--aios-outline)", borderRadius: "4px", overflowWrap: "anywhere", whiteSpace: "normal" }}>
                    {path}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">{zhCN.app.noPath}</Typography>
              )}
              {resource.paths.length > 3 && (
                <Typography color="text.secondary" variant="body2" sx={{ fontSize: "11px", fontStyle: "italic" }}>
                  还有 {resource.paths.length - 3} 个路径已省略...
                </Typography>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* 安全与风险 (Default Collapsed) */}
        <Accordion disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 38, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>安全与风险</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, display: "grid", gap: 1 }}>
            <Box className="inspector-meta-grid" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <ResourceMetaRow label={zhCN.safetyFields.readOnly} value={resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no} />
              <ResourceMetaRow label={zhCN.safetyFields.writesGlobalState} value={resource.safetyProfile.writesGlobalState ? zhCN.booleans.yes : zhCN.booleans.no} />
              <ResourceMetaRow label={zhCN.safetyFields.secretExposureRisk} value={zhCN.risks[resource.safetyProfile.secretExposureRisk]} />
              <ResourceMetaRow label={zhCN.safetyFields.executionRisk} value={zhCN.risks[resource.safetyProfile.executionRisk]} />
            </Box>
            {resource.safetyProfile.notes.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5, fontSize: "12px" }}>安全说明</Typography>
                <Box className="note-list" component="ul" sx={{ pl: 2, m: 0 }}>
                  {resource.safetyProfile.notes.map((note) => (
                    <li key={note} style={{ fontSize: "12px" }}>{translateSafetyNote(note)}</li>
                  ))}
                </Box>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>

        {/* Token 压力 (Default Collapsed) */}
        <Accordion disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 38, "& .MuiAccordionSummary-content": { my: 0.75 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>Token 压力</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, display: "grid", gap: 1 }}>
            <Box className="inspector-meta-grid" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <ResourceMetaRow label={zhCN.tokenFields.level} value={zhCN.risks[resource.tokenPressure.level]} />
              <ResourceMetaRow label={zhCN.tokenFields.estimatedTokens} value={resource.tokenPressure.estimatedTokens} />
            </Box>
            {resource.tokenPressure.reason && (
              <Typography color="text.secondary" variant="body2" sx={{ fontSize: "12px", mt: 0.5 }}>
                {translateTokenReason(resource.tokenPressure.reason)}
              </Typography>
            )}
          </AccordionDetails>
        </Accordion>
      </Stack>
    </Box>
  );
});

interface CapabilityChipLineProps {
  label: string;
  values: string[];
  code?: boolean;
}

function CapabilityChipLine({ label, values, code }: CapabilityChipLineProps) {
  return (
    <Box className="capability-chip-line" sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography color="text.secondary" component="span" sx={{ fontSize: "12px", fontWeight: 700 }}>
        {label}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, minWidth: 0 }}>
        {values.map((value) => (
          <Chip className={code ? "capability-chip evidence" : "capability-chip"} key={value} label={value} variant="outlined" size="small" sx={{ fontSize: "11px" }} />
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
