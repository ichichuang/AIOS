import { Box, Chip, Stack, Typography } from "@mui/material";
import { memo, useCallback, type CSSProperties, type KeyboardEvent, type ReactElement } from "react";
import type { RowComponentProps } from "react-window";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import { buildSkillDisplayEnrichment, getSkillQualityChipLabel, shouldShowSkillQualityChip } from "../../lib/skillDisplayEnrichment";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import type { AiosResource } from "../../types/inventory";
import type { ResourceSelectionContext } from "../modules/moduleUtils";

export interface CompactSkillRowProps {
  rows: SkillIdentityRow[];
  selectedId: string | null;
  skillCapabilityById: ReadonlyMap<string, SkillCapabilityClassification>;
  showCapability: boolean;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

function CompactSkillRowComponent({ ariaAttributes, index, style, rows, selectedId, skillCapabilityById, showCapability, onSelect }: RowComponentProps<CompactSkillRowProps>): ReactElement | null {
  const row = rows[index];
  if (!row) return null;
  const resource = row.primaryResource;
  const display = getResourceDisplay(resource);
  const enrichment = buildSkillDisplayEnrichment(row, display);
  const skillCapability = showCapability ? skillCapabilityById.get(resource.id) : undefined;
  const sourceBadges = row.sourceBadges;
  const selected = resource.id === selectedId;
  const handleSelect = useCallback(() => onSelect(resource, { skillIdentity: row }), [onSelect, resource, row]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(resource, { skillIdentity: row });
    },
    [onSelect, resource, row]
  );

  // Compute compact source summary badge
  let sourceLabel = "本地";
  if (sourceBadges.length > 1) {
    sourceLabel = "多来源";
  } else if (sourceBadges.length === 1) {
    const key = sourceBadges[0].key;
    if (["codex", "agents", "claude"].includes(key)) {
      sourceLabel = "入口";
    } else if (key === "filesystem") {
      sourceLabel = "本地";
    } else {
      sourceLabel = sourceBadges[0].label;
    }
  }

  // Use-case/capability chips (limit to 2 use cases or 1 capability)
  const chipsToShow: string[] = [];
  if (enrichment.inferredUseCases && enrichment.inferredUseCases.length > 0) {
    chipsToShow.push(...enrichment.inferredUseCases.slice(0, 2));
  } else if (skillCapability) {
    chipsToShow.push(skillCapability.primaryCategory.title);
  }

  if (selected) {
    chipsToShow.push(display.zhToolType || resource.toolType);
  }

  return (
    <Box {...ariaAttributes} className="compact-skill-row" style={style as CSSProperties}>
      <Box
        aria-pressed={selected}
        className={selected ? "compact-skill-row-inner selected" : "compact-skill-row-inner"}
        data-resource-id={resource.id}
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <Box className="compact-skill-main" sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, flexGrow: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
            <Typography className="resource-title" component="h3" sx={{ fontSize: "14px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", m: 0 }}>
              {enrichment.displayNameZh}
            </Typography>
            <Box className="code-pill resource-technical-name" component="code" sx={{ fontSize: "11px", px: 0.75, py: 0.25, backgroundColor: "var(--aios-outline)", borderRadius: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>
              {display.technicalName}
            </Box>
          </Box>
          <Typography className="resource-description" color="text.secondary" variant="body2" sx={{ fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", m: 0 }}>
            {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
          </Typography>
        </Box>

        <Stack className="compact-skill-state" direction="row" sx={{ alignItems: "center", gap: 0.75, justifyContent: "flex-end", flexShrink: 0 }}>
          <Chip className="source-chip" label={sourceLabel} variant="outlined" />
          {chipsToShow.slice(0, selected ? 3 : 2).map((chipText) => (
            <Chip className="capability-chip" key={chipText} label={chipText} variant="outlined" />
          ))}
          {shouldShowSkillQualityChip(enrichment) && (
            <Chip className={`quality-chip quality-${enrichment.qualityLevel}`} label={getSkillQualityChipLabel(enrichment)} variant="outlined" color="warning" />
          )}
          {resource.status !== "ok" && resource.status !== "active" && resource.status !== "available" && (
            <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          )}
          {resource.risk !== "low" && (
            <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
          )}
        </Stack>
      </Box>
    </Box>
  );
}

export const CompactSkillRow = memo(CompactSkillRowComponent) as (props: RowComponentProps<CompactSkillRowProps>) => ReactElement | null;
