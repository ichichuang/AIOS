import { Box, Chip, Typography } from "@mui/material";
import { memo } from "react";
import {
  buildMcpServiceDetailViewModel,
  fallbackMcpToolHintsUnavailableText,
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
  const sourceRows = buildConfigSourceRows(view.configSources);
  const advancedRows = [
    ...view.advancedRows,
    ...sourceRows.map((row) => ({ ...row, label: `来源 ${row.label}` }))
  ];

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
            <Box className="code-pill inspector-code" component="code" title={view.title}>
              {view.title}
            </Box>
          </Box>
          <Box className="inspector-primary-actions">
            <Chip className={statusChipClassName(view.statusText)} label={view.statusText} size="small" />
            <Chip className="source-chip" label={view.sourceText} size="small" variant="outlined" />
          </Box>
        </Box>

        <Box className="inspector-context-grid" aria-label="MCP 服务摘要">
          <DetailContextItem label="服务名称" value={view.title} />
          <DetailContextItem label="状态" value={view.statusText} />
          <DetailContextItem label="来源" value={view.sourceText} />
          <DetailContextItem label="工具线索" value={view.toolHintsText} />
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

        <DetailTextBlock title="它能做什么" value={view.whatItDoes} muted={view.whatItDoes === fallbackMcpToolHintsUnavailableText} />
        <DetailTextBlock title="配置位置" value={view.configLocationText} code />
        <DetailTextBlock title="工具线索" value={view.toolHintsText} muted={view.toolHintsText === fallbackMcpToolHintsUnavailableText} />
        <DetailTextBlock title="安全说明" value={view.safetyText} />
      </Box>

      <Box className="inspector-panel skill-detail-secondary-panel">
        <Box className="inspector-context-grid" aria-label="安全配置线索">
          <DetailContextItem label="命令名称" value={view.commandNameText} />
          <DetailContextItem label="传输方式" value={view.transportText} />
          <DetailContextItem label="环境变量名" value={view.requiredEnvNamesText} />
          <DetailContextItem label="远程主机" value={view.remoteHostText} />
        </Box>
        <AttentionReasonList view={view} />
        <ManualSuggestionList view={view} />
      </Box>

      <Box className="inspector-technical-stack" aria-label="高级来源信息">
        <AiosInspectorSection title="高级来源信息">
          <AiosTechnicalDetails rows={advancedRows.length > 0 ? advancedRows : [{ label: "详情状态", value: "暂时没有更多来源信息。" }]} />
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

function ManualSuggestionList({ view }: { view: McpServiceDetailViewModel }) {
  return (
    <Box className="skill-detail-section">
      <Typography className="inspector-field-label" component="p">
        人工检查建议
      </Typography>
      {view.manualCheckSuggestions.length > 0 ? (
        <Box className="skill-detail-reason-list" component="ul">
          {view.manualCheckSuggestions.map((suggestion) => (
            <li key={suggestion}>
              <Typography color="text.secondary" variant="body2">
                {suggestion}
              </Typography>
            </li>
          ))}
        </Box>
      ) : (
        <Typography color="text.secondary" variant="body2">
          请在对应 AI 工具的 MCP 配置里人工查看来源。
        </Typography>
      )}
    </Box>
  );
}

function buildConfigSourceRows(sources: readonly McpConfigSourceSummary[]): AiosTechnicalDetailRow[] {
  return sources.flatMap((source, index) => {
    const prefix = `${index + 1}`;
    return [
      { label: `${prefix} 标签`, value: source.sourceLabel || "来源不明" },
      { label: `${prefix} 类型`, value: source.sourceKindLabel || "来源不明" },
      { label: `${prefix} 路径提示`, value: source.pathHint || "未记录", code: Boolean(source.pathHint) },
      { label: `${prefix} 根目录提示`, value: source.rootPathHint || "未记录", code: Boolean(source.rootPathHint) },
      { label: `${prefix} 记录状态`, value: source.scanStatus || "未记录" },
      { label: `${prefix} 问题数`, value: source.findingCount }
    ];
  });
}

function statusChipClassName(statusText: string): string {
  if (statusText === "可见" || statusText === "可能可用") return "status-chip status-available";
  if (statusText === "无法读取") return "status-chip status-missing";
  if (statusText === "来源不明" || statusText === "未检查") return "status-chip status-unknown";
  return "status-chip status-warn";
}
