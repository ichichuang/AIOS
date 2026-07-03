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

  const secondaryChip = getSecondaryChip();
  const visibleChips = [{ label: sourceLabel, className: "source-chip" }, ...(secondaryChip ? [secondaryChip] : [])].slice(0, 2);
  const boundaryLabel = resource.safetyProfile.readOnly && !resource.safetyProfile.writesGlobalState ? "本地只读" : "边界需复核";

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
        <Box className="compact-skill-main">
          <Box className="compact-skill-title-line">
            <Typography className="resource-title compact-skill-title" component="h3" title={enrichment.displayNameZh}>
              {enrichment.displayNameZh}
            </Typography>
            <Box className="code-pill resource-technical-name compact-skill-technical-name" component="code" title={display.technicalName}>
              {display.technicalName}
            </Box>
          </Box>
          <Typography className="resource-description compact-skill-description" color="text.secondary" title={enrichment.shortPurposeZh || enrichment.displayDescriptionZh} variant="body2">
            {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
          </Typography>
          <Box className="compact-skill-meta-line" aria-label="技能资源摘要">
            <Typography component="span" title={`${display.zhToolType} / ${display.zhCapability}`}>
              {display.zhToolType} / {display.zhCapability}
            </Typography>
            <Typography component="span" title={sourceLabel}>
              {sourceLabel}
            </Typography>
            <Typography component="span" title={boundaryLabel}>
              {boundaryLabel}
            </Typography>
          </Box>
        </Box>

        <Box className="compact-skill-state">
          {visibleChips.map((chip) => (
            <Chip className={chip.className} key={chip.label} label={chip.label} title={chip.label} variant="outlined" />
          ))}
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
