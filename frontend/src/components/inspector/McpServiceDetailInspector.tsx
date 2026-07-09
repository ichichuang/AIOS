import { Box, Chip, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import {
  buildMcpCompactDetailFields,
  buildMcpServiceDetailViewModel,
  fallbackMcpToolHintsUnavailableText,
  isUnknownMcpValue,
  mcpStaticSourceLabel,
  mcpUnverifiedLabel,
  type McpConfigSourceSummary,
  type McpServiceDetail,
  type McpServiceDetailViewModel,
  type McpServiceItem
} from "../../lib/mcpLibrary";
import { AiosInspectorSection, AiosTechnicalDetails, type AiosTechnicalDetailRow } from "../ui/AiosUiPrimitives";

interface McpServiceDetailInspectorProps {
  detail: McpServiceDetail | null;
  fallbackItem: McpServiceItem | null;
  loading: boolean;
  error: string | null;
}

export const McpServiceDetailInspector = memo(function McpServiceDetailInspector({ detail, fallbackItem, loading, error }: McpServiceDetailInspectorProps) {
  const view = buildMcpServiceDetailViewModel({ detail, fallbackItem, loading, error });
  const compactFields = useMemo(() => buildMcpCompactDetailFields(view), [view]);
  const sourceRows = buildConfigSourceRows(view.configSources);
  const hasAdvancedRows = view.advancedRows.length > 0 || sourceRows.length > 0;
  const showWhatItDoes = !isUnknownMcpValue(view.whatItDoes) && view.whatItDoes !== fallbackMcpToolHintsUnavailableText;
  const showConfigLocation = !isUnknownMcpValue(view.configLocationText);
  const showToolHints = !isUnknownMcpValue(view.toolHintsText) && view.toolHintsText !== fallbackMcpToolHintsUnavailableText;

  return (
    <Box className="inspector-panel-stack mcp-detail-inspector">
      <Box className="inspector-panel primary">
        <Box className="inspector-primary-heading">
          <Box className="inspector-primary-title">
            <Typography className="caption" component="p">
              MCP 服务详情
            </Typography>
            <Typography component="h3" variant="h3">
              {view.title}
            </Typography>
          </Box>
          <Box className="inspector-primary-actions">
            <Chip className={statusChipClassName(view.statusText)} label={view.statusText} size="small" />
            <Chip className="source-chip" label={view.sourceText} size="small" variant="outlined" />
          </Box>
        </Box>

        <Box className="inspector-context-grid" aria-label="MCP 服务摘要">
          <DetailContextItem label="状态" value={view.statusText} />
          <DetailContextItem label="来源" value={`${mcpStaticSourceLabel} · ${view.sourceText}`} />
          <DetailContextItem label="工具线索" value={view.toolHintsText} />
          <DetailContextItem label="验证说明" value={mcpUnverifiedLabel} />
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

        {showWhatItDoes && <DetailTextBlock title="它能做什么" value={view.whatItDoes} />}
        {showConfigLocation && <DetailTextBlock title="配置位置" value={view.configLocationText} code />}
        {showToolHints && <DetailTextBlock title="工具线索" value={view.toolHintsText} />}
        <DetailTextBlock title="安全说明" value={view.safetyText} />
      </Box>

      <Box className="inspector-panel skill-detail-secondary-panel">
        {compactFields.length > 0 && (
          <Box className="inspector-context-grid" aria-label="安全配置线索">
            {compactFields.map((field) => (
              <DetailContextItem key={field.label} label={field.label} value={field.value} />
            ))}
          </Box>
        )}
        <AttentionReasonList view={view} />
        <ManualSuggestionList view={view} />
      </Box>

      {hasAdvancedRows && (
        <Box className="inspector-technical-stack" aria-label="高级来源信息">
          <AiosInspectorSection title="高级来源信息">
            <AiosTechnicalDetails rows={collapseAdvancedRows(view.advancedRows, sourceRows)} />
          </AiosInspectorSection>
        </Box>
      )}
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

function DetailTextBlock({ title, value, code = false, muted = false }: { title: string; value: string; code?: boolean; muted?: boolean }) {
  return (
    <Box className="inspector-summary-block skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        {title}
      </Typography>
      {code ? (
        <Box className="code-pill resource-meta-code" component="code" title={value}>
          {value}
        </Box>
      ) : (
        <Typography className={muted ? "inspector-description muted" : "inspector-description"} color="text.secondary" title={value} variant="body2">
          {value}
        </Typography>
      )}
    </Box>
  );
}

function AttentionReasonList({ view }: { view: McpServiceDetailViewModel }) {
  if (view.attentionReasons.length === 0) return null;

  return (
    <Box className="skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        需要处理的原因
      </Typography>
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
    </Box>
  );
}

function ManualSuggestionList({ view }: { view: McpServiceDetailViewModel }) {
  if (view.manualCheckSuggestions.length === 0) return null;

  return (
    <Box className="skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        人工检查建议
      </Typography>
      <Box className="skill-detail-reason-list" component="ul">
        {view.manualCheckSuggestions.map((suggestion) => (
          <li key={suggestion}>
            <Typography color="text.secondary" variant="body2">
              {suggestion}
            </Typography>
          </li>
        ))}
      </Box>
    </Box>
  );
}

function buildConfigSourceRows(sources: readonly McpConfigSourceSummary[]): AiosTechnicalDetailRow[] {
  return sources.flatMap((source, index) => {
    const prefix = `${index + 1}`;
    const rows: AiosTechnicalDetailRow[] = [];
    rows.push({ label: `${prefix} 标签`, value: source.sourceLabel || "来源不明" });
    rows.push({ label: `${prefix} 类型`, value: source.sourceKindLabel || "来源不明" });
    if (source.pathHint) rows.push({ label: `${prefix} 路径提示`, value: source.pathHint, code: true });
    if (source.rootPathHint) rows.push({ label: `${prefix} 根目录提示`, value: source.rootPathHint, code: true });
    if (source.scanStatus) rows.push({ label: `${prefix} 记录状态`, value: source.scanStatus });
    if (source.findingCount > 0) rows.push({ label: `${prefix} 问题数`, value: source.findingCount });
    return rows;
  });
}

function collapseAdvancedRows(advancedRows: readonly AiosTechnicalDetailRow[], sourceRows: readonly AiosTechnicalDetailRow[]): AiosTechnicalDetailRow[] {
  const rows = [...advancedRows, ...sourceRows.map((row) => ({ ...row, label: `来源 ${row.label}` }))];
  if (rows.length === 0) return [{ label: "详情状态", value: "暂时没有更多来源信息。" }];
  return rows.filter((row) => !isUnknownMcpValue(String(row.value)));
}

function statusChipClassName(statusText: string): string {
  if (statusText === "可见" || statusText === "可能可用") return "status-chip status-available";
  if (statusText === "无法读取") return "status-chip status-missing";
  if (statusText === "来源不明" || statusText === "未检查") return "status-chip status-unknown";
  return "status-chip status-warn";
}
