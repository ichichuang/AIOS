import { Box, Chip, Typography } from "@mui/material";
import { memo, useCallback, type CSSProperties, type KeyboardEvent, type ReactElement } from "react";
import type { RowComponentProps } from "react-window";
import { getResourceDisplay } from "../../i18n/resourceText";
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

  const sourceLabel = sourceBadges.length > 1 ? "多来源" : sourceBadges[0]?.label ?? "本地";
  const secondaryChip = getSecondaryChip();
  const visibleChips = [{ label: sourceLabel, className: "source-chip" }, ...(secondaryChip ? [secondaryChip] : [])].slice(0, 2);

  return (
    <Box {...ariaAttributes} className="compact-skill-row" style={style as CSSProperties} data-aios-list-row>
      <Box
        aria-pressed={selected}
        className={selected ? "compact-skill-row-inner selected" : "compact-skill-row-inner"}
        data-aios-hover-card
        data-resource-id={resource.id}
        data-aios-selected-surface={selected ? "true" : undefined}
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
      >
        <Box className="compact-skill-main">
          <Box className="resource-header-row">
            <Typography className="resource-title compact-skill-title" component="h3" title={enrichment.displayNameZh}>
              {enrichment.displayNameZh}
            </Typography>
            <Box className="compact-skill-chip-line">
              {visibleChips.map((chip, i) => (
                <Chip key={`${chip.label}-${i}`} className={chip.className} label={chip.label} size="small" variant={i === 0 ? "outlined" : "filled"} />
              ))}
            </Box>
          </Box>
          {display.technicalName && (
            <Box className="resource-secondary-row">
              <Box className="code-pill resource-technical-name compact-skill-technical-name" component="code" title={display.technicalName}>
                {display.technicalName}
              </Box>
            </Box>
          )}
          <Typography className="resource-description compact-skill-description" color="text.secondary" title={enrichment.shortPurposeZh || enrichment.displayDescriptionZh} variant="body2">
            {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  function getSecondaryChip(): { label: string; className: string } | null {
    if (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available") {
      return { label: display.zhStatus, className: `status-chip status-${resource.status}` };
    }
    if (resource.risk !== "low") return { label: display.zhRisk, className: `risk-chip risk-${resource.risk}` };
    if (shouldShowSkillQualityChip(enrichment)) {
      return { label: getSkillQualityChipLabel(enrichment), className: `quality-chip quality-${enrichment.qualityLevel}` };
    }
    if (enrichment.inferredUseCases.length > 0) return { label: enrichment.inferredUseCases[0], className: "capability-chip" };
    if (skillCapability) return { label: skillCapability.primaryCategory.title, className: "capability-chip" };
    return { label: display.zhCapability, className: "capability-chip" };
  }
}

export const CompactSkillRow = memo(CompactSkillRowComponent) as (props: RowComponentProps<CompactSkillRowProps>) => ReactElement | null;
