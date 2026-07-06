import { Box, Chip, Typography } from "@mui/material";
import { memo } from "react";
import {
  buildSkillDetailViewModel,
  fallbackSkillUsageText,
  type SkillDetail,
  type SkillDetailViewModel,
  type SkillListItem,
  type SkillSourceSummary
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
  const sourceRows = buildSourceRows(view.sourceSummaries);
  const duplicateRows = buildSourceRows(view.duplicateSources);
  const advancedRows = [
    ...view.advancedRows,
    ...sourceRows.map((row) => ({ ...row, label: `来源 ${row.label}` }))
  ];

  return (
    <Box className="inspector-panel-stack skill-detail-inspector">
      <Box className="inspector-panel primary">
        <Box className="inspector-primary-heading">
          <Box className="inspector-primary-title">
            <Typography className="caption" component="p">
              技能详情
            </Typography>
            <Typography component="h3" variant="h3">
              {view.title}
            </Typography>
            <Box className="code-pill inspector-code" component="code" title={view.originalName}>
              {view.originalName}
            </Box>
          </Box>
          <Box className="inspector-primary-actions">
            <Chip className={statusChipClassName(view.statusText)} label={view.statusText} size="small" />
            <Chip className="source-chip" label={view.sourceText} size="small" variant="outlined" />
          </Box>
        </Box>

        <Box className="inspector-context-grid" aria-label="技能摘要">
          <DetailContextItem label="技能名称" value={view.title} />
          <DetailContextItem label="来源" value={view.sourceText} />
          <DetailContextItem label="状态" value={view.statusText} />
          <DetailContextItem label="可用工具" value={view.availableInToolsText} />
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

        <DetailTextBlock title="它能做什么" value={view.whatItDoes} />
        <DetailTextBlock title="适合什么时候用" value={view.whenToUse} />
        <DetailTextBlock title="可在哪些 AI 工具中使用" value={view.availableInToolsText} />
        <DetailTextBlock title="如何使用" value={view.howToUse || fallbackSkillUsageText} muted={!view.usageKnown} />
      </Box>

      <Box className="inspector-panel skill-detail-secondary-panel">
        <DetailTextBlock title="来源" value={formatSourceSummary(view)} />
        <AttentionReasonList view={view} />
        {view.duplicateSources.length > 0 && (
          <Box className="skill-detail-section">
            <Typography className="inspector-field-label" component="p">
              重复来源
            </Typography>
            <Box className="skill-detail-source-list">
              {view.duplicateSources.map((source) => (
                <SourceSummaryLine key={source.id} source={source} />
              ))}
            </Box>
          </Box>
        )}
      </Box>

      <Box className="inspector-technical-stack" aria-label="高级来源信息">
        <AiosInspectorSection title="高级来源信息">
          <AiosTechnicalDetails rows={advancedRows.length > 0 ? advancedRows : [{ label: "详情状态", value: "暂时没有更多来源信息。" }]}>
            {duplicateRows.length > 0 && (
              <Box className="skill-detail-advanced-duplicates">
                <Typography variant="body2">重复来源路径提示</Typography>
                <AiosTechnicalDetails rows={duplicateRows} />
              </Box>
            )}
          </AiosTechnicalDetails>
        </AiosInspectorSection>
      </Box>
    </Box>
  );
});

function DetailContextItem({ label, value }: { label: string; value: string }) {
  return (
    <Box className="inspector-context-item">
      <Typography component="span">{label}</Typography>
      <Typography component="strong" title={value}>
        {value}
      </Typography>
    </Box>
  );
}

function DetailTextBlock({ title, value, muted = false }: { title: string; value: string; muted?: boolean }) {
  return (
    <Box className="inspector-summary-block skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        {title}
      </Typography>
      <Typography className={muted ? "inspector-description muted" : "inspector-description"} color="text.secondary" title={value} variant="body2">
        {value}
      </Typography>
    </Box>
  );
}

function AttentionReasonList({ view }: { view: SkillDetailViewModel }) {
  return (
    <Box className="skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        需要处理的原因
      </Typography>
      {view.attentionReasons.length > 0 ? (
        <Box className="skill-detail-reason-list" component="ul">
          {view.attentionReasons.map((reason) => (
            <li key={reason.code || reason.label}>
              <Typography component="strong">{reason.label}</Typography>
              <Typography color="text.secondary" variant="body2">
                {reason.detail}
              </Typography>
            </li>
          ))}
        </Box>
      ) : (
        <Typography color="text.secondary" variant="body2">
          当前没有需要处理的原因。
        </Typography>
      )}
    </Box>
  );
}

function SourceSummaryLine({ source }: { source: SkillSourceSummary }) {
  const tools = source.availableInTools.filter((tool) => tool !== "Unknown").join("、") || "工具未知";
  return (
    <Box className="skill-detail-source-line">
      <Typography component="strong">{source.sourceLabel || "来源不明"}</Typography>
      <Typography color="text.secondary" variant="body2">
        {source.sourceKindLabel || "来源类型未知"} · {tools}
      </Typography>
    </Box>
  );
}

function formatSourceSummary(view: SkillDetailViewModel): string {
  const count = view.sourceSummaries.length;
  if (count > 1) return `${view.sourceText}，共 ${count} 个来源。`;
  return view.sourceText;
}

function buildSourceRows(sources: readonly SkillSourceSummary[]): AiosTechnicalDetailRow[] {
  return sources.flatMap((source, index) => {
    const prefix = `${index + 1}`;
    return [
      { label: `${prefix} 标签`, value: source.sourceLabel || "来源不明" },
      { label: `${prefix} 类型`, value: source.sourceKindLabel || "来源不明" },
      { label: `${prefix} 可用工具`, value: source.availableInTools.filter((tool) => tool !== "Unknown").join("、") || "暂时无法判断" },
      { label: `${prefix} 路径提示`, value: source.pathHint || "未记录", code: Boolean(source.pathHint) },
      { label: `${prefix} 记录状态`, value: source.scanStatus || "未记录" },
      { label: `${prefix} 问题数`, value: source.findingCount }
    ];
  });
}

function statusChipClassName(statusText: string): string {
  if (statusText === "可用") return "status-chip status-available";
  if (statusText === "已损坏") return "status-chip status-missing";
  if (statusText === "来源不明" || statusText === "未检查") return "status-chip status-unknown";
  return "status-chip status-warn";
}
