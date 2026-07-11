import { Box, Chip, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { classifySkillListItem, type SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import {
  buildSkillDetailViewModel,
  type SkillDetail,
  type SkillDetailViewModel,
  type SkillListItem,
  type SkillSourceSummary,
  type SkillStatus
} from "../../lib/skillLibrary";
import { AiosInspectorSection, AiosTechnicalDetails, type AiosTechnicalDetailRow } from "../ui/AiosUiPrimitives";

interface SkillDetailInspectorProps {
  detail: SkillDetail | null;
  fallbackItem: SkillListItem | null;
  loading: boolean;
  error: string | null;
}

export const SkillDetailInspector = memo(function SkillDetailInspector({ detail, fallbackItem, loading, error }: SkillDetailInspectorProps) {
  const view = buildSkillDetailViewModel({ detail, fallbackItem, loading, error });
  const item = detail ?? fallbackItem;
  const capability = useMemo(() => (item ? classifySkillListItem(item) : null), [item]);
  const scopeDetail = useMemo(() => (item ? buildScopeDetail(item.scopeSummary) : null), [item]);
  const tools = useMemo(() => buildVisibleTools(item, detail), [item, detail]);
  const sourceRows = useMemo(() => buildSourceRows(view.sourceSummaries), [view.sourceSummaries]);
  const duplicateRows = useMemo(() => buildSourceRows(view.duplicateSources), [view.duplicateSources]);
  const advancedRows = useMemo(() => buildAdvancedRows(view, item), [view, item]);
  const attentionRows = useMemo(() => buildAttentionRows(view.attentionReasons), [view.attentionReasons]);
  const missingFields = useMemo(() => collectMissingFields(view, tools), [view, tools]);
  const hasSourceContent = view.sourceSummaries.length > 0 || duplicateRows.length > 0;
  const hasAdvancedContent = advancedRows.length > 0;
  const hasAttentionContent = view.attentionReasons.length > 0;

  return (
    <Box className="inspector-panel-stack skill-detail-inspector">
      <Box className="inspector-panel primary">
        <Box className="inspector-primary-heading skill-detail-primary-heading">
          <Box className="inspector-primary-title">
            <Typography className="caption" component="p">
              {capability?.primaryCategory.title ?? "技能"}
            </Typography>
            <Typography component="h3" variant="h3">
              {view.title}
            </Typography>
            {scopeDetail && (
              <Box className="inspector-scope-line">
                <Chip className="scope-chip" label={scopeDetail.summary} size="small" variant="outlined" />
                {scopeDetail.hasUnknownSource && <Chip className="status-chip status-unknown" label="另有来源尚未整理范围" size="small" variant="outlined" />}
              </Box>
            )}
          </Box>
          <Box className="inspector-primary-actions">
            {item && item.status !== "available" && (
              <Chip
                className={statusChipClassName(item.status)}
                label={inspectorStatusLabel(item.status)}
                size="small"
              />
            )}
          </Box>
        </Box>

        {view.notice && (
          <Box className={`inspector-boundary-callout ${view.mode === "loading" ? "info" : "warn"}`}>
            <Box className="inspector-boundary-callout-copy">
              <Typography component="strong">{view.mode === "loading" ? "正在读取详情" : "详情暂不可用"}</Typography>
              <Typography color="text.secondary" variant="body2">
                {view.notice}
              </Typography>
            </Box>
          </Box>
        )}

        {missingFields.length > 1 && !view.notice && (
          <Box className="inspector-boundary-callout info">
            <Box className="inspector-boundary-callout-copy">
              <Typography component="strong">说明还不完整</Typography>
              <Typography color="text.secondary" variant="body2">
                这个技能的详细说明还不完整，AIOS 只展示当前已记录的信息。
              </Typography>
            </Box>
          </Box>
        )}

        {view.whatItDoesKnown && <DetailTextBlock title="它能做什么" value={view.whatItDoes} />}
        {view.whenToUseKnown && <DetailTextBlock title="适合什么时候用" value={view.whenToUse} />}
        {view.howToUseKnown && <DetailTextBlock title="如何使用" value={view.howToUse} />}
        {tools.length > 0 && <DetailToolBlock title="可在哪些 AI 工具中使用" tools={tools} />}

        <Box className="inspector-summary-block skill-detail-section">
          <Typography className="inspector-field-label" component="p">
            归属范围
          </Typography>
          {scopeDetail ? (
            <Box className="skill-scope-detail">
              {scopeDetail.parts.map((part, index) => (
                <Typography key={index} color="text.secondary" variant="body2">
                  {part}
                </Typography>
              ))}
              {scopeDetail.hasUnknownSource && (
                <Typography color="text.secondary" variant="body2">
                  另有来源尚未整理范围。
                </Typography>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary" variant="body2">
              AIOS 还不能判断这个技能属于全局范围还是某个项目。
            </Typography>
          )}
        </Box>
      </Box>

      {hasSourceContent && (
        <Box className="inspector-panel skill-detail-secondary-panel">
          <AiosInspectorSection className="skill-detail-disclosure" title="来源与记录" defaultExpanded={false}>
            {sourceRows.length > 0 && <AiosTechnicalDetails rows={sourceRows} />}
            {duplicateRows.length > 0 && (
              <Box className="skill-detail-advanced-duplicates">
                <Typography className="inspector-field-label" component="p">
                  重复来源
                </Typography>
                <AiosTechnicalDetails rows={duplicateRows} />
              </Box>
            )}
          </AiosInspectorSection>
        </Box>
      )}

      {hasAttentionContent && (
        <Box className="inspector-panel skill-detail-secondary-panel">
          <AiosInspectorSection className="skill-detail-disclosure" title="检查信息" defaultExpanded={false}>
            <AiosTechnicalDetails rows={attentionRows} />
          </AiosInspectorSection>
        </Box>
      )}

      {hasAdvancedContent && (
        <Box className="inspector-panel skill-detail-secondary-panel">
          <AiosInspectorSection className="skill-detail-disclosure" title="高级信息" defaultExpanded={false}>
            <AiosTechnicalDetails rows={advancedRows} />
          </AiosInspectorSection>
        </Box>
      )}
    </Box>
  );
});

function DetailTextBlock({ title, value }: { title: string; value: string }) {
  return (
    <Box className="inspector-summary-block skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        {title}
      </Typography>
      <Typography className="inspector-description" color="text.secondary" variant="body2">
        {value}
      </Typography>
    </Box>
  );
}

function DetailToolBlock({ title, tools }: { title: string; tools: string[] }) {
  return (
    <Box className="inspector-summary-block skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        {title}
      </Typography>
      <Box className="skill-detail-tool-list">
        {tools.map((tool) => (
          <Chip key={tool} className="tool-chip" label={tool} size="small" variant="outlined" />
        ))}
      </Box>
    </Box>
  );
}

function buildVisibleTools(item: SkillListItem | null, detail: SkillDetail | null): string[] {
  const raw = detail?.usageSummary?.availableInTools ?? item?.availableInTools ?? [];
  return raw.filter((tool) => tool && tool !== "Unknown");
}

interface ScopeDetail {
  summary: string;
  hasUnknownSource: boolean;
  parts: string[];
}

function buildScopeDetail(scopeSummary: SkillListItem["scopeSummary"]): ScopeDetail | null {
  const { classification, hasGlobalSource, projects, hasUnknownSource } = scopeSummary;

  if (classification === "unknown") {
    return {
      summary: "范围未整理",
      hasUnknownSource,
      parts: ["AIOS 还不能判断这个技能属于全局范围还是某个项目。"]
    };
  }

  const parts: string[] = [];

  if (classification === "globalOnly") {
    parts.push("全局技能");
  } else if (classification === "projectOnly") {
    projects.forEach((project) => parts.push(project.projectLabel));
  } else if (classification === "mixed") {
    if (hasGlobalSource) parts.push("全局");
    projects.forEach((project) => parts.push(project.projectLabel));
  }

  let summary = parts.join(" · ");
  if (classification === "mixed" && hasGlobalSource && projects.length > 0) {
    summary = `全局 + ${projects.length} 个项目`;
  } else if (classification === "projectOnly" && projects.length > 1) {
    summary = `${projects.length} 个项目`;
  }

  return { summary, hasUnknownSource, parts };
}

function collectMissingFields(view: SkillDetailViewModel, tools: string[]): string[] {
  const missing: string[] = [];
  if (!view.whatItDoesKnown) missing.push("它能做什么");
  if (!view.whenToUseKnown) missing.push("适合什么时候用");
  if (!view.howToUseKnown) missing.push("如何使用");
  if (tools.length === 0) missing.push("可用于哪些 AI 工具");
  return missing;
}

function buildSourceRows(sources: readonly SkillSourceSummary[]): AiosTechnicalDetailRow[] {
  return sources.flatMap((source, index) => {
    const prefix = `${index + 1}`;
    const knownTools = source.availableInTools.filter((tool) => tool !== "Unknown").join("、") || null;
    const rows: AiosTechnicalDetailRow[] = [
      { label: `${prefix} 来源标签`, value: source.sourceLabel || "未记录" },
      { label: `${prefix} 来源类型`, value: source.sourceKindLabel || "未记录" }
    ];
    if (knownTools) rows.push({ label: `${prefix} 可用工具`, value: knownTools });
    rows.push({ label: `${prefix} 记录时间`, value: source.lastSeenAt || "未记录" });
    return rows;
  });
}

function buildAdvancedRows(view: SkillDetailViewModel, item: SkillListItem | null): AiosTechnicalDetailRow[] {
  const rows: AiosTechnicalDetailRow[] = [];
  if (item) {
    rows.push({ label: "原始技术名", value: item.originalName, code: true, codeClassName: "inspector-code--secondary" });
  }
  if (view.aliasesText) rows.push({ label: "别名", value: view.aliasesText });
  if (view.tagsText) rows.push({ label: "标签", value: view.tagsText });
  if (view.capabilitiesText) rows.push({ label: "能力", value: view.capabilitiesText });
  if (item && item.sourceCount > 1) rows.push({ label: "来源数", value: item.sourceCount });
  rows.push({ label: "安全边界", value: "不展示私有路径、凭据或扫描器内部状态。" });
  return rows;
}

function buildAttentionRows(reasons: SkillDetailViewModel["attentionReasons"]): AiosTechnicalDetailRow[] {
  return reasons.map((reason, index) => ({
    label: reason.label || `问题 ${index + 1}`,
    value: reason.detail
  }));
}

function inspectorStatusLabel(status: SkillStatus): string {
  if (status === "broken") return "不可用";
  if (status === "needsAttention") return "需要检查";
  if (status === "duplicate") return "重复";
  if (status === "sourceUnknown") return "来源不明";
  if (status === "unchecked") return "未检查";
  return "可用";
}

function statusChipClassName(status: SkillStatus): string {
  if (status === "available") return "status-chip status-available";
  if (status === "broken") return "status-chip status-missing";
  if (status === "sourceUnknown" || status === "unchecked") return "status-chip status-unknown";
  return "status-chip status-warn";
}
