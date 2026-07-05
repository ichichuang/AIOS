import { Box, Chip, Typography } from "@mui/material";
import { memo } from "react";
import { getResourceDisplay, translateSafetyNote, translateTokenReason } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { getResourceInspectorProvenanceSummary } from "../../lib/resourceCorpus";
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
  const primaryMetaRows = getPrimaryMetaRows(resource, display, provenance);
  const boundaryChips = getBoundaryChips(resource);
  const detailNotice = getInspectorDetailNotice(resource, metadataRows, provenance);

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
            <Box className="code-pill inspector-code" component="code" title={display.technicalName}>
              {display.technicalName}
            </Box>
          </Box>
          <Box className="inspector-primary-actions">
            <Chip className={`quality-chip quality-${enrichment.qualityLevel}`} label={getQualityLevelLabel(enrichment.qualityLevel)} variant="outlined" size="small" />
            <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} size="small" />
          </Box>
        </Box>

        <Box className="inspector-boundary-chip-row" aria-label="资源安全边界">
          {boundaryChips.map((chip) => (
            <Chip className={chip.className} key={chip.label} label={chip.label} size="small" variant={chip.variant ?? "outlined"} />
          ))}
        </Box>

        <Box className="inspector-context-grid" aria-label="资源摘要">
          {primaryMetaRows.map((row) => (
            <Box className="inspector-context-item" key={row.label}>
              <Typography component="span">{row.label}</Typography>
              <Typography component="strong" title={row.value}>
                {row.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box className="inspector-summary-block">
          <Typography className="inspector-field-label" component="p">
            是什么
          </Typography>
          <Typography className="inspector-description" color="text.secondary" variant="body2" title={enrichment.displayDescriptionZh}>
            {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
          </Typography>
        </Box>

        {detailNotice && (
          <Box className={`inspector-boundary-callout ${detailNotice.tone}`}>
            <Box className="inspector-boundary-callout-copy">
              <Typography component="strong">{detailNotice.title}</Typography>
              <Typography color="text.secondary" variant="body2">
                {detailNotice.body}
              </Typography>
            </Box>
            <Chip className={detailNotice.chipClassName} label={detailNotice.chipLabel} size="small" variant="outlined" />
          </Box>
        )}

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
        <AiosInspectorSection title="来源与路径" defaultExpanded>
          <AiosTechnicalDetails rows={sourceRows}>
            <Box className="inspector-path-list">
              <Typography variant="body2">路径详情</Typography>
              {resource.paths.length > 0 ? (
                resource.paths.slice(0, 6).map((path) => (
                  <Box className="code-pill path-detail" component="code" key={path} title={path}>
                    {path}
                  </Box>
                ))
              ) : (
                <Box className="inspector-empty-detail">
                  <Typography component="strong">未记录路径</Typography>
                  <Typography color="text.secondary" variant="body2">
                    当前资源只提供清单级元数据，未暴露可打开的文件路径。
                  </Typography>
                </Box>
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
      hints: ["点击能力卡会切换到技能库并填入搜索词。", "点击近期报告可在这里查看报告详情。", "检查器只展示本地只读元数据，不执行脚本、MCP 或扫描。"],
      badge: "总览"
    };
  }

  if (activeView === "custom-scan") {
    return {
      title: "选择扫描结果查看详情",
      summary: "扫描管理结果只包含路径、大小、扩展名、修改时间、分类原因和安全标签。",
      hints: ["先添加用户授权目录，再手动运行所选来源。", "敏感路径段会显示为 [sensitive]。", "此模块不提供全盘扫描、内容读取或执行入口。"],
      badge: "扫描管理"
    };
  }

  const moduleName = VIEW_LABELS[activeView];
  if (activeView === "legacy") {
    return {
      title: "正在查看 Legacy 示例数据",
      summary: "这是内置示例/兼容快照，不代表当前电脑扫描结果。",
      hints: [`Legacy 示例上下文中有 ${visibleCount} 项可见资源。`, "选择资源可查看示例 provenance。", "这些数据不会写入 SQLite 动态资源库，也不参与默认模块计数。"],
      badge: "Legacy 示例"
    };
  }
  if (visibleCount === 0) {
    return {
      title: `${moduleName} 为空`,
      summary: "尚未扫描任何目录；当前模块只读取 SQLite 动态资源库。",
      hints: ["请到扫描管理添加项目目录或运行智能发现。", "Legacy 示例数据只在旧入口查看。", "此面板不会触发扫描、脚本执行或 MCP 启动。"],
      badge: "空资源库"
    };
  }
  const promptCopyHint =
    activeView === "skills"
      ? "选中含提示词的资源后，可复制 Codex / Claude 调用。"
      : "此模块默认不提供提示词复制，仅展示只读详情。";

  return {
    title: `${moduleName} 使用指南`,
    summary: zhCN.moduleSummaries[activeView],
    hints: [`当前筛选下有 ${visibleCount} 项可见资源。`, "点击列表中的资源查看用途、来源、路径和安全边界。", promptCopyHint, "详情面板不会触发全盘扫描或后台执行。"],
    badge: moduleName
  };
}

function getPrimaryMetaRows(resource: AiosResource, display: ReturnType<typeof getResourceDisplay>, provenance: SkillIdentityProvenance | null): Array<{ label: string; value: string }> {
  return [
    { label: "类型", value: `${display.zhToolType} / ${display.zhCapability}` },
    { label: "来源", value: getPrimarySourceLabel(resource, provenance) },
    { label: "边界", value: getBoundaryLabel(resource) },
    { label: "更新", value: resource.updatedAt ? formatDate(resource.updatedAt) : "未记录" }
  ];
}

function getBoundaryChips(resource: AiosResource): Array<{ label: string; className?: string; variant?: "filled" | "outlined" }> {
  if (isLegacySnapshotResource(resource)) {
    return [
      { label: "Legacy 示例", className: "status-chip status-warn", variant: "filled" },
      { label: "非本机扫描" },
      { label: "仅元数据" },
      { label: "UI 不执行" },
      { label: "不写入 SQLite", className: "status-chip status-disabled" }
    ];
  }
  return [
    { label: resource.safetyProfile.readOnly ? "本地只读" : "只读需复核", className: resource.safetyProfile.readOnly ? "status-chip status-ok" : "status-chip status-warn", variant: "filled" },
    { label: "仅元数据" },
    { label: "敏感值隐藏" },
    { label: "UI 不执行" },
    { label: "不启动扫描", className: "status-chip status-disabled" }
  ];
}

function getInspectorDetailNotice(resource: AiosResource, metadataRows: AiosTechnicalDetailRow[], provenance: SkillIdentityProvenance | null): { title: string; body: string; chipLabel: string; chipClassName?: string; tone: "info" | "warn" } | null {
  if (isDynamicCorpusResource(resource)) {
    return {
      title: "动态资源库元数据",
      body: "详情来自 Rust-owned SQLite 中的扫描元数据，不重新读取文件、不执行脚本或 MCP。",
      chipLabel: "动态资源库",
      chipClassName: "status-chip status-ok",
      tone: "info"
    };
  }

  if (isLegacySnapshotResource(resource)) {
    return {
      title: "Legacy 示例数据",
      body: "这是内置示例/兼容快照，不代表当前电脑扫描结果，不写入动态资源库。",
      chipLabel: "Legacy 示例",
      chipClassName: "status-chip status-warn",
      tone: "warn"
    };
  }

  if (resource.toolType === "legacy" || resource.capabilityType === "usage-prompt") {
    return {
      title: "兼容资源",
      body: "此资源用于识别迁移边界，不恢复旧入口、不写回全局配置。",
      chipLabel: "兼容",
      tone: "warn"
    };
  }

  const hasDetail = Boolean(provenance || metadataRows.length > 0 || resource.paths.length > 0 || resource.updatedAt);
  if (!hasDetail) {
    return {
      title: "可用元数据有限",
      body: "当前清单只记录名称、类型和安全边界；未补充路径、来源或更新时间。",
      chipLabel: "元数据不足",
      chipClassName: "status-chip status-warn",
      tone: "warn"
    };
  }

  if (resource.prompts.length === 0) {
    return {
      title: "只读详情",
      body: "此资源未提供可复制提示词；页面只展示清单、安全画像和来源信息。",
      chipLabel: "无执行入口",
      tone: "info"
    };
  }

  return null;
}

function getPrimarySourceLabel(resource: AiosResource, provenance: SkillIdentityProvenance | null): string {
  if (provenance?.sourceLabels) return provenance.sourceLabels;
  if (isDynamicCorpusResource(resource)) {
    return getMetadataString(resource, "projectLabel") ?? getMetadataString(resource, "scanSourceName") ?? "动态资源库";
  }
  if (isLegacySnapshotResource(resource)) return "Legacy 示例数据 / 非当前电脑扫描";

  const server = getMcpServer(resource);
  if (server) return `${server.transport} · ${zhCN.mcp.localRemoteRisk[server.localRemoteRisk]}`;

  const sourceBadges = getSkillSourceBadges(resource);
  if (sourceBadges.length > 0) return sourceBadges.map((badge) => badge.label).join(" / ");

  const scanProfileName = getDiscoveryMetadataString(resource, "scanProfileName");
  if (scanProfileName) return `目录扫描 · ${scanProfileName}`;

  const sourceKind = getDiscoveryMetadataString(resource, "sourceKind");
  if (sourceKind) return sourceKind;

  if (resource.path || resource.paths.length > 0) return "本地清单";
  if (resource.toolType === "legacy") return "兼容入口";
  return "未记录";
}

function getBoundaryLabel(resource: AiosResource): string {
  if (isLegacySnapshotResource(resource)) return "示例快照，只读";
  if (resource.safetyProfile.readOnly && !resource.safetyProfile.writesGlobalState) return "本地只读";
  if (resource.safetyProfile.writesGlobalState) return "写入风险需复核";
  return "只读状态需复核";
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
  if (isDynamicCorpusResource(resource)) {
    const provenance = getResourceInspectorProvenanceSummary(resource);
    const rootDisplayPath = getMetadataString(resource, "rootDisplayPath") ?? getMetadataString(resource, "root");
    const scanJobId = getMetadataString(resource, "scanJobId");
    const scanJobStatus = getMetadataString(resource, "scanJobStatus");
    const classificationReason = getMetadataString(resource, "classificationReason");
    rows.push(
      { label: "数据来源类型", value: provenance.dataSourceType },
      { label: "项目 / scope", value: provenance.projectLabel },
      { label: "扫描来源", value: provenance.scanSourceName },
      { label: "扫描来源目录", value: provenance.scanSourceDirectory, code: provenance.scanSourceDirectory !== "未记录" },
      { label: "授权根目录", value: rootDisplayPath ?? "未记录", code: Boolean(rootDisplayPath) },
      { label: "相对路径", value: provenance.relativePath, code: provenance.relativePath !== "未记录" },
      { label: "Profile", value: provenance.profileLabel },
      { label: "最近扫描", value: provenance.lastScanLabel, code: provenance.lastScanLabel.includes("·") },
      { label: "元数据边界", value: provenance.metadataBoundary }
    );
    if (scanJobId) rows.push({ label: "最近扫描任务", value: scanJobId, code: true });
    if (scanJobStatus) rows.push({ label: "任务状态", value: scanJobStatus });
    if (classificationReason) rows.push({ label: "分类原因", value: classificationReason });
    const detailLocations = resource.metadata?.corpusDetailLocations;
    if (Array.isArray(detailLocations)) rows.push({ label: "记录位置", value: detailLocations.length });
    const findings = resource.metadata?.corpusFindings;
    if (Array.isArray(findings)) rows.push({ label: "安全发现", value: findings.length });
  }
  if (isLegacySnapshotResource(resource)) {
    const provenance = getResourceInspectorProvenanceSummary(resource);
    rows.push(
      { label: "数据来源类型", value: provenance.dataSourceType },
      { label: "当前电脑扫描结果", value: "否" },
      { label: "动态资源库", value: "不计入" },
      { label: "元数据边界", value: provenance.metadataBoundary }
    );
    const snapshotGeneratedAt = getMetadataString(resource, "snapshotGeneratedAt");
    if (snapshotGeneratedAt) rows.push({ label: "示例快照时间", value: formatDate(snapshotGeneratedAt) });
  }

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

  const scanProfileName = getMetadataString(resource, "scanProfileName");
  if (scanProfileName) rows.push({ label: "扫描模板", value: scanProfileName });

  const scanProfileId = getMetadataString(resource, "scanProfileId");
  if (scanProfileId) rows.push({ label: "模板 ID", value: scanProfileId, code: true });

  const scanProfileBoundary = getMetadataString(resource, "scanProfileBoundary");
  if (scanProfileBoundary) rows.push({ label: "模板边界", value: scanProfileBoundary });

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

function isDynamicCorpusResource(resource: AiosResource): boolean {
  return getMetadataString(resource, "corpusSource") === "dynamic-resource-corpus";
}

function isLegacySnapshotResource(resource: AiosResource): boolean {
  return getMetadataString(resource, "corpusSource") === "legacy-snapshot" || resource.metadata?.legacySnapshot === true;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}
