import { Box, Chip, Typography } from "@mui/material";
import { memo, useCallback, type KeyboardEvent } from "react";
import {
  fallbackMcpToolHintsUnavailableText,
  formatMcpToolHintSummary,
  mapMcpServiceItemToResource,
  mcpStaticSourceLabel,
  mcpStatusLabels,
  type McpServiceItem
} from "../../lib/mcpLibrary";
import type { AiosResource } from "../../types/inventory";
import type { ResourceSelectionContext } from "../modules/moduleUtils";

interface McpServiceRowProps {
  item: McpServiceItem;
  selectedId: string | null;
  showToolHints?: boolean;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

export const McpServiceRow = memo(function McpServiceRow({ item, selectedId, showToolHints = true, onSelect }: McpServiceRowProps) {
  const resource = mapMcpServiceItemToResource(item);
  const selected = resource.id === selectedId;
  const handleSelect = useCallback(() => onSelect(resource, {}), [onSelect, resource]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      handleSelect();
    },
    [handleSelect]
  );

  const statusChip = { label: mcpStatusLabels[item.status], className: statusChipClassName(item.status) };
  const sourceLabel = item.sourceLabel?.trim() || "来源不明";
  const hasToolHints = item.toolHints.length > 0;
  const toolHintSummary = hasToolHints ? formatMcpToolHintSummary(item.toolHints) : "未读取工具线索";

  return (
    <Box
      aria-pressed={selected}
      className={selected ? "mcp-service-row selected" : "mcp-service-row"}
      data-aios-list-row
      data-aios-selected-surface={selected ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      <Box className="mcp-service-row-main">
        <Box className="resource-header-row">
          <Typography className="resource-title mcp-service-row-title" component="h3" title={item.displayName}>
            {item.displayName}
          </Typography>
          <Chip className={statusChip.className} label={statusChip.label} size="small" />
        </Box>
        <Typography className="resource-description mcp-service-row-purpose" color="text.secondary" title={item.shortPurpose} variant="body2">
          {item.shortPurpose}
        </Typography>
        {showToolHints && (
          <Box className="mcp-service-tool-hints" aria-label={`${item.displayName} 工具线索`}>
            {hasToolHints ? (
              <>
                {item.toolHints.slice(0, 6).map((hint, index) => (
                  <McpToolHintChip key={`${hint.name}-${index}`} hint={hint} />
                ))}
                {item.toolHints.length > 6 && (
                  <Typography className="mcp-tool-hints-more" color="text.secondary" component="span" variant="caption">
                    +{item.toolHints.length - 6}
                  </Typography>
                )}
              </>
            ) : (
              <Typography className="mcp-tool-hints-unavailable" color="text.secondary" variant="body2">
                {fallbackMcpToolHintsUnavailableText}
              </Typography>
            )}
          </Box>
        )}
        <Box className="mcp-service-row-meta">
          <Typography className="mcp-service-row-source" color="text.secondary" component="span" variant="caption">
            {mcpStaticSourceLabel} · {sourceLabel}
          </Typography>
          <Typography className="mcp-service-row-tool-count" color="text.secondary" component="span" variant="caption">
            {toolHintSummary}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

function McpToolHintChip({ hint }: { hint: { name: string; purpose: string; serviceLabel: string } }) {
  return (
    <Box className="mcp-tool-hint-chip" title={`${hint.name}: ${hint.purpose}`}>
      <Typography component="span">{hint.name}</Typography>
    </Box>
  );
}

function statusChipClassName(status: McpServiceItem["status"]): string {
  if (status === "visible" || status === "likelyAvailable") return "status-chip status-available";
  if (status === "unreadable") return "status-chip status-missing";
  if (status === "sourceUnknown" || status === "unchecked") return "status-chip status-unknown";
  return "status-chip status-warn";
}
