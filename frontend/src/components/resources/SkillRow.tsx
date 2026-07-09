import { Box, Chip, Typography } from "@mui/material";
import { memo, useCallback, type KeyboardEvent } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { fallbackSkillUsageText, mapSkillListItemToResource, skillStatusLabels, type SkillListItem, type SkillStatus } from "../../lib/skillLibrary";
import type { AiosResource } from "../../types/inventory";
import type { ResourceSelectionContext } from "../modules/moduleUtils";

interface ProductSkillRowProps {
  item: SkillListItem;
  categoryLabel?: string;
  selectedId: string | null;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

export const ProductSkillRow = memo(function ProductSkillRow({ item, categoryLabel, selectedId, onSelect }: ProductSkillRowProps) {
  const resource = mapSkillListItemToResource(item);
  const toolLabel = formatToolLabel(item.availableInTools);
  return (
    <SkillRowContent
      selected={resource.id === selectedId}
      subtitle={item.shortPurpose || item.usageText || fallbackSkillUsageText}
      title={item.displayName}
      status={item.status}
      categoryLabel={categoryLabel}
      toolLabel={toolLabel}
      sourceLabel={item.sourceLabel || "来源不明"}
      onSelect={() => onSelect(resource, { skillListItem: item })}
    />
  );
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
  const categoryLabel = skillCapability?.primaryCategory.title;
  const toolLabel = formatToolLabelFromResource(resource);
  const selected = resource.id === selectedId;

  return (
    <SkillRowContent
      selected={selected}
      subtitle={enrichment.shortPurposeZh || enrichment.displayDescriptionZh}
      title={enrichment.displayNameZh}
      status={mapResourceStatusToSkillStatus(resource.status)}
      categoryLabel={categoryLabel}
      toolLabel={toolLabel}
      sourceLabel={row.sourceBadges.length > 1 ? "多来源" : row.sourceBadges[0]?.label ?? "本地"}
      onSelect={() => onSelect(resource, { skillIdentity: row })}
    />
  );
});

interface SkillRowContentProps {
  selected: boolean;
  subtitle: string;
  title: string;
  status: SkillStatus;
  categoryLabel?: string;
  toolLabel?: string;
  sourceLabel: string;
  onSelect: () => void;
}

function SkillRowContent({ selected, subtitle, title, status, categoryLabel, toolLabel, sourceLabel, onSelect }: SkillRowContentProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  const statusClass = skillStatusClassName(status);
  const chips: { label: string; className: string; variant: "outlined" | "filled" }[] = [];
  if (categoryLabel) {
    chips.push({ label: categoryLabel, className: "capability-chip", variant: "outlined" });
  }
  chips.push({ label: skillStatusLabels[status], className: `status-chip ${statusClass}`, variant: "filled" });
  if (toolLabel) {
    chips.push({ label: toolLabel, className: "tool-chip", variant: "outlined" });
  }
  chips.push({ label: sourceLabel, className: "source-chip", variant: "outlined" });

  return (
    <Box
      aria-pressed={selected}
      className={selected ? "compact-skill-row-inner selected" : "compact-skill-row-inner"}
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

function formatToolLabelFromResource(resource: AiosResource): string | undefined {
  if (resource.metadata && Array.isArray(resource.metadata.availableInTools)) {
    return formatToolLabel(resource.metadata.availableInTools as string[]);
  }
  return zhCN.toolTypes[resource.toolType] || resource.toolType;
}

function formatToolLabel(tools: readonly string[] | null | undefined): string | undefined {
  const visible = (tools ?? []).filter((tool) => tool && tool !== "Unknown");
  if (visible.length === 0) return undefined;
  return visible.map((tool) => zhCN.toolTypes[tool as keyof typeof zhCN.toolTypes] || tool).join("、");
}

function skillStatusClassName(status: SkillStatus): string {
  if (status === "available") return "status-available";
  if (status === "broken") return "status-missing";
  if (status === "sourceUnknown" || status === "unchecked") return "status-unknown";
  return "status-warn";
}
