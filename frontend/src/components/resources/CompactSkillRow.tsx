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
  const visibleSourceBadges = sourceBadges.slice(0, 3);
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
          <Typography className="resource-title" component="h3">
            {enrichment.displayNameZh}
          </Typography>
          <Box className="code-pill resource-technical-name" component="code">
            {display.technicalName}
          </Box>
          <Typography className="resource-description" color="text.secondary" variant="body2">
            {enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
          </Typography>
        </Box>

        <Box className="compact-skill-path">
          <Typography className="caption" component="p">
            {zhCN.app.pathPreview}
          </Typography>
          <Box className="code-pill compact-path-code" component="code">
            {display.pathPreview}
          </Box>
        </Box>

        <Stack className="compact-skill-state" direction="row" sx={{ alignItems: "center", gap: 0.75, justifyContent: "flex-end" }}>
          {row.mode === "source" && <Chip className="source-chip source-view-mode" label={resource.capabilityType === "runtime-view" ? "入口视图" : "来源视图"} variant="outlined" />}
          {visibleSourceBadges.map((badge) => (
            <Chip className={`source-chip source-${badge.key}`} key={badge.key} label={badge.label} variant="outlined" />
          ))}
          {sourceBadges.length > visibleSourceBadges.length && <Chip className="source-chip" label={`+${sourceBadges.length - visibleSourceBadges.length}`} variant="outlined" />}
          {shouldShowSkillQualityChip(enrichment) && <Chip className={`quality-chip quality-${enrichment.qualityLevel}`} label={getSkillQualityChipLabel(enrichment)} variant="outlined" />}
          {skillCapability && <Chip className="capability-chip" label={skillCapability.primaryCategory.title} variant="outlined" />}
          <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
        </Stack>
      </Box>
    </Box>
  );
}

export const CompactSkillRow = memo(CompactSkillRowComponent) as (props: RowComponentProps<CompactSkillRowProps>) => ReactElement | null;
