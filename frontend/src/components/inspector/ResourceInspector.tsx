import { Box, Chip, Typography } from "@mui/material";
import { memo } from "react";
import { getResourceDisplay, translateSafetyNote, translateTokenReason } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
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
import { PromptCopyButton } from "../PromptCopyButton";
import { AiosInspectorEmptyGuide, AiosInspectorSection, AiosInspectorUsagePanel, AiosTechnicalDetails, type AiosTechnicalDetailRow } from "../ui/AiosUiPrimitives";

interface ResourceInspectorProps {
  activeView: ResourceView;
  resource: AiosResource | null;
  skillIdentity: SkillIdentityRow | null;
  skillCapability: SkillCapabilityClassification | null;
  visibleCount: number;
}

export const ResourceInspector = memo(function ResourceInspector({ activeView, resource, skillIdentity, skillCapability, visibleCount }: ResourceInspectorProps) {
  if (!resource) {
    const guide = getEmptyInspectorGuide(activeView, visibleCount);
    return <AiosInspectorEmptyGuide badge={guide.badge} hints={guide.hints} summary={guide.summary} title={guide.title} />;
  }

  const display = getResourceDisplay(resource);
  const enrichment = buildSkillDisplayEnrichment(skillIdentity ?? resource, display);
  const metadataRows = getMetadataRows(resource);
  const provenance = skillIdentity ? getSkillIdentityProvenance(skillIdentity) : null;
  const sourceRows = getSourceRows(resource, provenance, display, metadataRows);
  const safetyRows = getSafetyRows(resource, display);
  const qualityRows = getQualityRows(enrichment, skillCapability);
  const tokenRows = getTokenRows(resource);
  const codexPrompt = resource.prompts.find((prompt) => prompt.target === "codex");
  const claudePrompt = resource.prompts.find((prompt) => prompt.target === "claude");

  return (
    <Box className="inspector-panel-stack">
      <Box className="inspector-panel primary">
        <Box className="inspector-primary-heading">
          <Box className="inspector-primary-title">
            <Typography className="caption" component="p">
              {display.zhCategory}
            </Typography>
            <Typography component="h3" variant="h3">
              {enrichment.displayNameZh}
            </Typography>
            <Box className="code-pill inspector-code" component="code">
              {display.technicalName}
            </Box>
          </Box>
          <Box className="inspector-primary-actions">
            <Chip className={`quality-chip quality-${enrichment.qualityLevel}`} label={getQualityLevelLabel(enrichment.qualityLevel)} variant="outlined" size="small" />
            <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} size="small" />
          </Box>
        </Box>

        <Box className="inspector-summary-block">
          <Typography className="inspector-field-label" component="p">
            是什么
          </Typography>
          <Typography className="inspector-description" color="text.secondary" variant="body2">
            {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
          </Typography>
        </Box>

        {enrichment.inferredUseCases.length > 0 && (
          <Box className="inspector-use-cases" aria-label="适合场景">
            <Typography component="span" variant="body2">
              适合用于
            </Typography>
            <Box className="inspector-use-case-chips">
              {enrichment.inferredUseCases.slice(0, 3).map((useCase) => (
                <Chip key={useCase} label={useCase} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {resource.prompts.length > 0 && (
        <AiosInspectorUsagePanel title="如何使用" summary={zhCN.app.promptBodyEnglish}>
          {codexPrompt && <PromptCopyButton prompt={codexPrompt} target="codex" compact />}
          {claudePrompt && <PromptCopyButton prompt={claudePrompt} target="claude" compact />}
        </AiosInspectorUsagePanel>
      )}

      <Box className="inspector-technical-stack" aria-label="技术细节">
        <AiosInspectorSection title="来源与路径">
          <AiosTechnicalDetails rows={sourceRows}>
            <Box className="inspector-path-list">
              <Typography variant="body2">路径详情</Typography>
              {resource.paths.length > 0 ? (
                resource.paths.slice(0, 6).map((path) => (
                  <Box className="code-pill path-detail" component="code" key={path}>
                    {path}
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">{zhCN.app.noPath}</Typography>
              )}
              {resource.paths.length > 6 && (
                <Typography color="text.secondary" variant="body2">
                  还有 {resource.paths.length - 6} 个路径已省略。
                </Typography>
              )}
            </Box>
          </AiosTechnicalDetails>
        </AiosInspectorSection>

        <AiosInspectorSection title="安全与风险">
          <AiosTechnicalDetails rows={safetyRows}>
            {resource.safetyProfile.notes.length > 0 && (
              <Box className="note-list" component="ul">
                {resource.safetyProfile.notes.map((note) => (
                  <li key={note}>{translateSafetyNote(note)}</li>
                ))}
              </Box>
            )}
          </AiosTechnicalDetails>
        </AiosInspectorSection>

        <AiosInspectorSection title="元数据质量">
          <AiosTechnicalDetails rows={qualityRows}>
            <CapabilityChipLine label="质量原因" values={enrichment.qualityReasons.length > 0 ? enrichment.qualityReasons : ["未记录额外原因。"]} />
            <CapabilityChipLine label="推断标签" values={enrichment.inferredTags.length > 0 ? enrichment.inferredTags : ["无"]} />
            <CapabilityChipLine label="建议补充" values={enrichment.suggestedFields.map((field) => SUGGESTED_FIELD_LABELS[field]).length > 0 ? enrichment.suggestedFields.map((field) => SUGGESTED_FIELD_LABELS[field]) : ["无"]} code={enrichment.suggestedFields.length > 0} />
          </AiosTechnicalDetails>
        </AiosInspectorSection>

        <AiosInspectorSection title="Token 压力">
          <AiosTechnicalDetails rows={tokenRows}>
            {resource.tokenPressure.reason && (
              <Typography color="text.secondary" variant="body2">
                {translateTokenReason(resource.tokenPressure.reason)}
              </Typography>
            )}
          </AiosTechnicalDetails>
        </AiosInspectorSection>
      </Box>
    </Box>
  );
});

function getEmptyInspectorGuide(activeView: ResourceView, visibleCount: number): { title: string; summary: string; hints: string[]; badge: string } {
  if (activeView === "dashboard") {
    return {
      title: "选择能力入口或资源查看详情",
      summary: "总览用于快速进入常用能力库、查看系统边界和近期报告。",
      hints: ["点击能力卡会切换到技能库并填入搜索词。", "点击近期报告可在这里查看报告详情。", "此面板只展示本地只读信息。"],
      badge: "总览"
    };
  }

  const moduleName = VIEW_LABELS[activeView];
  const promptCopyHint =
    activeView === "skills" || activeView === "legacy"
      ? "选中含提示词的资源后，可复制 Codex / Claude 调用。"
      : "此模块默认不提供提示词复制，仅展示只读详情。";

  return {
    title: `${moduleName} 使用指南`,
    summary: zhCN.moduleSummaries[activeView],
    hints: [`当前筛选下有 ${visibleCount} 项可见资源。`, "点击列表中的资源查看用途、路径和安全信息。", promptCopyHint],
    badge: moduleName
  };
}

function getSourceRows(
  resource: AiosResource,
  provenance: SkillIdentityProvenance | null,
  display: ReturnType<typeof getResourceDisplay>,
  metadataRows: AiosTechnicalDetailRow[]
): AiosTechnicalDetailRow[] {
  const rows: AiosTechnicalDetailRow[] = [
    { label: "工具类型", value: display.zhToolType },
    { label: "能力类型", value: display.zhCapability },
    { label: "状态", value: display.zhStatus }
  ];

  if (provenance) {
    rows.push(
      { label: "来源", value: provenance.sourceLabels || "未记录" },
      { label: "活跃入口", value: provenance.activeEntrypoints || "无", code: Boolean(provenance.activeEntrypoints) },
      { label: "Registry 记录", value: provenance.registryRecords || "无", code: Boolean(provenance.registryRecords) },
      { label: "文件系统发现", value: provenance.filesystemRecords || "无", code: Boolean(provenance.filesystemRecords) }
    );
    if (provenance.indexRecords) rows.push({ label: "索引记录", value: provenance.indexRecords, code: true });
    if (provenance.manifestPaths) rows.push({ label: "Manifest 路径", value: provenance.manifestPaths, code: true });
    if (provenance.canonicalPaths) rows.push({ label: "Canonical 路径", value: provenance.canonicalPaths, code: true });
    if (provenance.discoveryRoots) rows.push({ label: "发现根目录", value: provenance.discoveryRoots, code: true });
  }

  rows.push(...metadataRows);
  if (resource.updatedAt && !rows.some((row) => row.label === "更新时间")) rows.push({ label: "更新时间", value: formatDate(resource.updatedAt) });
  return rows;
}

function getSafetyRows(resource: AiosResource, display: ReturnType<typeof getResourceDisplay>): AiosTechnicalDetailRow[] {
  return [
    { label: "风险等级", value: display.zhRisk },
    { label: "风险解释", value: display.zhRiskDescription },
    { label: zhCN.safetyFields.readOnly, value: resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no },
    { label: zhCN.safetyFields.writesGlobalState, value: resource.safetyProfile.writesGlobalState ? zhCN.booleans.yes : zhCN.booleans.no },
    { label: zhCN.safetyFields.secretExposureRisk, value: zhCN.risks[resource.safetyProfile.secretExposureRisk] },
    { label: zhCN.safetyFields.executionRisk, value: zhCN.risks[resource.safetyProfile.executionRisk] }
  ];
}

function getQualityRows(enrichment: SkillDisplayEnrichment, skillCapability: SkillCapabilityClassification | null): AiosTechnicalDetailRow[] {
  const rows: AiosTechnicalDetailRow[] = [
    { label: "质量等级", value: getQualityLevelLabel(enrichment.qualityLevel) },
    { label: "展示说明来源", value: ENRICHMENT_SOURCE_LABELS[enrichment.enrichmentSource], code: true }
  ];
  if (skillCapability) {
    rows.push(
      { label: "主分类", value: skillCapability.primaryCategory.title },
      { label: "可信度", value: getSkillCapabilityConfidenceLabel(skillCapability.confidence) }
    );
  }
  return rows;
}

function getTokenRows(resource: AiosResource): AiosTechnicalDetailRow[] {
  return [
    { label: zhCN.tokenFields.level, value: zhCN.risks[resource.tokenPressure.level] },
    { label: zhCN.tokenFields.estimatedTokens, value: resource.tokenPressure.estimatedTokens }
  ];
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
      <Box className="capability-chip-values">
        {values.map((value) => (
          <Chip className={code ? "capability-chip evidence" : "capability-chip"} key={value} label={value} variant="outlined" size="small" />
        ))}
      </Box>
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
      { label: "命令参数", value: server.args.length > 0 ? server.args.join(" ") : "无", code: server.args.length > 0 },
      { label: "环境变量名", value: server.envVarNames.length > 0 ? server.envVarNames.join(", ") : "0 个", code: server.envVarNames.length > 0 },
      { label: zhCN.mcp.transport, value: server.transport },
      { label: "来源配置", value: server.sourcePath, code: true }
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
    if (manifestPath) rows.push({ label: "Manifest 路径", value: manifestPath, code: true });
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
