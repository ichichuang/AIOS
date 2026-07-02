import { Box, Chip, Stack, Typography } from "@mui/material";
import { memo, useCallback, type CSSProperties, type KeyboardEvent, type ReactElement } from "react";
import type { RowComponentProps } from "react-window";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import { getSkillSourceBadges } from "../../lib/skillDiscoveryMetadata";
import type { AiosResource } from "../../types/inventory";

export interface CompactSkillRowProps {
  resources: AiosResource[];
  selectedId: string | null;
  skillCapabilityById: ReadonlyMap<string, SkillCapabilityClassification>;
  showCapability: boolean;
  onSelect: (resource: AiosResource) => void;
}

function CompactSkillRowComponent({ ariaAttributes, index, style, resources, selectedId, skillCapabilityById, showCapability, onSelect }: RowComponentProps<CompactSkillRowProps>): ReactElement | null {
  const resource = resources[index];
  if (!resource) return null;
  const display = getResourceDisplay(resource);
  const skillCapability = showCapability ? skillCapabilityById.get(resource.id) : undefined;
  const sourceBadges = getSkillSourceBadges(resource);
  const visibleSourceBadges = sourceBadges.slice(0, 3);
  const selected = resource.id === selectedId;
  const handleSelect = useCallback(() => onSelect(resource), [onSelect, resource]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(resource);
    },
    [onSelect, resource]
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
            {display.zhName}
          </Typography>
          <Box className="code-pill resource-technical-name" component="code">
            {display.technicalName}
          </Box>
          <Typography className="resource-description" color="text.secondary" variant="body2">
            {display.zhDescription}
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
          {visibleSourceBadges.map((badge) => (
            <Chip className={`source-chip source-${badge.key}`} key={badge.key} label={badge.label} variant="outlined" />
          ))}
          {sourceBadges.length > visibleSourceBadges.length && <Chip className="source-chip" label={`+${sourceBadges.length - visibleSourceBadges.length}`} variant="outlined" />}
          {skillCapability && <Chip className="capability-chip" label={skillCapability.primaryCategory.title} variant="outlined" />}
          <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
        </Stack>
      </Box>
    </Box>
  );
}

export const CompactSkillRow = memo(CompactSkillRowComponent) as (props: RowComponentProps<CompactSkillRowProps>) => ReactElement | null;
