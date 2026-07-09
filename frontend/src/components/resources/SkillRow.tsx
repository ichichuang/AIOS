import { Box, Chip, Typography } from "@mui/material";
import { memo, useCallback, type KeyboardEvent } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { fallbackSkillUsageText, mapSkillListItemToResource, skillStatusLabels, type SkillListItem, type SkillStatus } from "../../lib/skillLibrary";
import type { AiosResource } from "../../types/inventory";
import type { ResourceSelectionContext } from "../modules/moduleUtils";

interface ProductSkillRowProps {
  item: SkillListItem;
  selectedId: string | null;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

export const ProductSkillRow = memo(function ProductSkillRow({ item, selectedId, onSelect }: ProductSkillRowProps) {
  const resource = mapSkillListItemToResource(item);
  return <SkillRowContent selected={resource.id === selectedId} subtitle={item.shortPurpose || item.usageText || fallbackSkillUsageText} title={item.displayName} status={item.status} sourceLabel={item.sourceLabel || "来源不明"} technicalName={item.originalName || item.primaryPathHint} onSelect={() => onSelect(resource, { skillListItem: item })} />;
});

interface LegacySkillRowProps {
  row: SkillIdentityRow;
  selectedId: string | null;
  skillCapabilityById: ReadonlyMap<string, { primaryCategory: { title: string } }>;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

export const LegacySkillRow = memo(function LegacySkillRow({ row, selectedId, skillCapabilityById, onSelect }: LegacySkillRowProps) {
  const resource = row.primaryResource;
  const display = getResourceDisplay(resource);
  const enrichment = buildSkillDisplayEnrichment(row, display);
  const skillCapability = skillCapabilityById.get(resource.id);
  const secondaryLabel = enrichment.inferredUseCases[0] ?? skillCapability?.primaryCategory.title ?? display.zhCapability;
  const selected = resource.id === selectedId;

  return (
    <SkillRowContent
      selected={selected}
      subtitle={enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
      title={enrichment.displayNameZh}
      status={mapResourceStatusToSkillStatus(resource.status)}
      sourceLabel={row.sourceBadges.length > 1 ? "多来源" : row.sourceBadges[0]?.label ?? "本地"}
      technicalName={display.technicalName}
      extraChip={{ label: secondaryLabel, className: "capability-chip" }}
      onSelect={() => onSelect(resource, { skillIdentity: row })}
    />
  );
});

interface SkillRowContentProps {
  selected: boolean;
  subtitle: string;
  title: string;
  status: SkillStatus;
  sourceLabel: string;
  technicalName?: string | null;
  extraChip?: { label: string; className: string };
  onSelect: () => void;
}

function SkillRowContent({ selected, subtitle, title, status, sourceLabel, technicalName, extraChip, onSelect }: SkillRowContentProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  const chips = [{ label: sourceLabel, className: "source-chip", variant: "outlined" as const }, { label: skillStatusLabels[status], className: `status-chip status-${status}`, variant: "filled" as const }];
  if (extraChip) {
    chips.push({ label: extraChip.label, className: extraChip.className, variant: "outlined" as const });
  }

  return (
    <Box
      aria-pressed={selected}
      className={selected ? "compact-skill-row-inner selected" : "compact-skill-row-inner"}
      data-aios-hover-card
      data-aios-list-row
      data-aios-selected-surface={selected ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <Box className="compact-skill-main">
        <Box className="resource-header-row">
          <Typography className="resource-title compact-skill-title" component="h3" title={title}>
            {title}
          </Typography>
          <Box className="compact-skill-chip-line">
            {chips.map((chip, chipIndex) => (
              <Chip key={`${chip.label}-${chipIndex}`} className={chip.className} label={chip.label} size="small" variant={chip.variant} />
            ))}
          </Box>
        </Box>
        {technicalName && (
          <Box className="resource-secondary-row">
            <Box className="code-pill resource-technical-name compact-skill-technical-name" component="code" title={technicalName}>
              {technicalName}
            </Box>
          </Box>
        )}
        <Typography className="resource-description compact-skill-description" color="text.secondary" title={subtitle} variant="body2">
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

function mapResourceStatusToSkillStatus(status: AiosResource["status"]): SkillStatus {
  if (status === "available") return "available";
  if (status === "missing") return "broken";
  if (status === "unknown") return "unchecked";
  return "needsAttention";
}
