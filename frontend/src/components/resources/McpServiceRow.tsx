import { Box, Chip, Typography } from "@mui/material";
import { memo, useCallback, type KeyboardEvent } from "react";
import { fallbackMcpToolHintsUnavailableText, mapMcpServiceItemToResource, mcpStatusLabels, type McpServiceItem } from "../../lib/mcpLibrary";
import type { AiosResource } from "../../types/inventory";
import type { ResourceSelectionContext } from "../modules/moduleUtils";

interface McpServiceRowProps {
  item: McpServiceItem;
  selectedId: string | null;
  showToolHints?: boolean;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

export const McpServiceRow = memo(function McpServiceRow({ item, selectedId, showToolHints = false, onSelect }: McpServiceRowProps) {
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

  const visibleChips = [
    { label: item.sourceLabel || "来源不明", className: "source-chip", variant: "outlined" as const },
    { label: mcpStatusLabels[item.status], className: statusChipClassName(item.status), variant: "filled" as const }
  ];

  return (
    <Box
      aria-pressed={selected}
      className={selected ? "mcp-service-row selected" : "mcp-service-row"}
      data-aios-hover-card
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
          <Box className="compact-skill-chip-line">
            {visibleChips.map((chip, chipIndex) => (
              <Chip key={`${chip.label}-${chipIndex}`} className={chip.className} label={chip.label} size="small" variant={chip.variant} />
            ))}
          </Box>
        </Box>
        {item.configLocationHint && (
          <Box className="resource-secondary-row">
            <Box className="code-pill resource-technical-name mcp-service-row-location" component="code" title={item.configLocationHint}>
              {item.configLocationHint}
            </Box>
          </Box>
        )}
        <Typography className="resource-description mcp-service-row-purpose" color="text.secondary" title={item.shortPurpose} variant="body2">
          {item.shortPurpose}
        </Typography>
        {showToolHints && (
          <Box className="mcp-service-tool-hints">
            {item.toolHints.length > 0 ? (
              item.toolHints.map((hint, index) => <McpToolHintChip key={`${hint.name}-${index}`} hint={hint} />)
            ) : (
              <Typography className="mcp-tool-hints-unavailable" color="text.secondary" variant="body2">
                {fallbackMcpToolHintsUnavailableText}
              </Typography>
            )}
          </Box>
        )}
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
