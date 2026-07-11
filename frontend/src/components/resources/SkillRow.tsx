import { Box, Chip, Typography } from "@mui/material";
import { memo, useCallback, type KeyboardEvent } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { fallbackSkillUsageText, mapSkillListItemToResource, type SkillListItem, type SkillStatus } from "../../lib/skillLibrary";
import type { AiosResource } from "../../types/inventory";
import type { ResourceSelectionContext } from "../modules/moduleUtils";

interface ProductSkillRowProps {
  item: SkillListItem;
  selectedId: string | null;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
}

export const ProductSkillRow = memo(function ProductSkillRow({ item, selectedId, onSelect }: ProductSkillRowProps) {
  const resource = mapSkillListItemToResource(item);
  return (
    <SkillRowContent
      selected={resource.id === selectedId}
      title={item.displayName}
      purpose={item.shortPurpose}
      usageText={item.usageText}
      status={item.status}
      scopeSummary={item.scopeSummary}
      availableInTools={item.availableInTools}
      sourceLabel={item.sourceLabel}
      sourceKindLabel={item.sourceKindLabel}
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
  const selected = resource.id === selectedId;
  const tools = formatToolLabelFromResource(resource);

  return (
    <SkillRowContent
      selected={selected}
      title={enrichment.displayNameZh}
      purpose={enrichment.shortPurposeZh}
      usageText={resource.metadata && typeof resource.metadata.usageText === "string" ? (resource.metadata.usageText as string) : null}
      status={mapResourceStatusToSkillStatus(resource.status)}
      scopeSummary={null}
      availableInTools={tools ? [tools] : []}
      sourceLabel={row.sourceBadges.length > 1 ? "多来源" : row.sourceBadges[0]?.label ?? "本地"}
      sourceKindLabel=""
      secondaryCapabilityHint={categoryLabel}
      onSelect={() => onSelect(resource, { skillIdentity: row })}
    />
  );
});

interface SkillRowContentProps {
  selected: boolean;
  title: string;
  purpose: string;
  usageText: string | null;
  status: SkillStatus;
  scopeSummary: SkillListItem["scopeSummary"] | null;
  availableInTools: readonly string[];
  sourceLabel: string;
  sourceKindLabel: string;
  secondaryCapabilityHint?: string;
  onSelect: () => void;
}

const ROW_STATUS_LABELS: Record<"broken" | "needsAttention", string> = {
  broken: "不可用",
  needsAttention: "需要检查"
};

function SkillRowContent({
  selected,
  title,
  purpose,
  usageText,
  status,
  scopeSummary,
  availableInTools,
  sourceLabel,
  sourceKindLabel,
  secondaryCapabilityHint,
  onSelect
}: SkillRowContentProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect();
    },
    [onSelect]
  );

  const hasPurpose = isMeaningfulText(purpose);
  const hasUsage = isMeaningfulText(usageText);
  const displayPurpose = hasPurpose ? purpose : null;
  const displayUsage = hasUsage ? usageText : null;
  const showFallback = !displayPurpose && !displayUsage;

  const scopeLabel = scopeSummary ? formatScopeSummary(scopeSummary) : null;
  const statusLabel = status === "broken" || status === "needsAttention" ? ROW_STATUS_LABELS[status] : null;
  const toolResult = formatVisibleTools(availableInTools);
  const provenance = formatProvenance(sourceLabel, sourceKindLabel);

  return (
    <Box
      aria-pressed={selected}
      className={["skill-row", selected ? "skill-row-selected" : ""].filter(Boolean).join(" ")}
      data-aios-list-row
      data-aios-selected-surface={selected ? "true" : undefined}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      <Box className="skill-row-primary">
        <Typography className="skill-row-name" component="h3" title={title}>
          {title}
        </Typography>
        {scopeLabel && <Box className="skill-row-scope scope-chip">{scopeLabel}</Box>}
        {statusLabel && (
          <Box className={["skill-row-status", status === "broken" ? "skill-row-status--broken" : "skill-row-status--attention"].filter(Boolean).join(" ")}>
            {statusLabel}
          </Box>
        )}
      </Box>

      {displayPurpose && <Typography className="skill-row-purpose">{displayPurpose}</Typography>}

      {displayUsage && (
        <Typography className="skill-row-usage">
          <Box component="span" className="skill-row-usage-prefix">
            适合：
          </Box>
          {displayUsage}
        </Typography>
      )}

      {showFallback && <Typography className="skill-row-purpose">暂未记录详细用途</Typography>}

      <Box className="skill-row-meta">
        {toolResult.visible.length > 0 && (
          <Box className="skill-row-tools">
            {toolResult.visible.map((tool) => (
              <Box key={tool} className="skill-row-tool tool-chip">
                {tool}
              </Box>
            ))}
            {toolResult.remaining > 0 && <Typography className="skill-row-more-tools">+{toolResult.remaining}</Typography>}
          </Box>
        )}
        {provenance && <Typography className="skill-row-source source-chip">来自 {provenance}</Typography>}
        {secondaryCapabilityHint && <Typography className="skill-row-secondary-hint capability-chip">{secondaryCapabilityHint}</Typography>}
      </Box>
    </Box>
  );
}

function isMeaningfulText(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("暂时无法判断")) return false;
  return true;
}

function formatScopeSummary(scopeSummary: SkillListItem["scopeSummary"]): string | null {
  const { classification, hasGlobalSource, projects, hasUnknownSource } = scopeSummary;

  if (classification === "unknown") {
    return "范围未整理";
  }

  if (classification === "globalOnly") {
    return "全局";
  }

  const projectCount = projects.length;

  if (classification === "projectOnly") {
    if (projectCount === 1) {
      return `项目 · ${projects[0].projectLabel}`;
    }
    return `${projectCount} 个项目`;
  }

  if (classification === "mixed") {
    if (hasGlobalSource && projectCount > 0) {
      return `全局 + ${projectCount} 个项目`;
    }
    if (projectCount > 1) {
      return `${projectCount} 个项目`;
    }
    if (projects[0]) {
      return `项目 · ${projects[0].projectLabel}`;
    }
  }

  if (hasUnknownSource) {
    return "范围未整理";
  }

  return null;
}

function formatVisibleTools(tools: readonly string[] | null | undefined): { visible: string[]; remaining: number } {
  const all = (tools ?? []).filter((tool) => tool && tool !== "Unknown");
  const visible = all.slice(0, 2).map((tool) => zhCN.toolTypes[tool as keyof typeof zhCN.toolTypes] || tool);
  return { visible, remaining: Math.max(0, all.length - 2) };
}

function formatToolLabelFromResource(resource: AiosResource): string | undefined {
  if (resource.metadata && Array.isArray(resource.metadata.availableInTools)) {
    const visible = (resource.metadata.availableInTools as string[]).filter((tool) => tool && tool !== "Unknown");
    if (visible.length === 0) return undefined;
    return visible.map((tool) => zhCN.toolTypes[tool as keyof typeof zhCN.toolTypes] || tool).join("、");
  }
  return zhCN.toolTypes[resource.toolType] || resource.toolType;
}

function formatProvenance(sourceLabel: string, sourceKindLabel: string): string | null {
  if (sourceLabel && sourceLabel !== "来源不明") return sourceLabel;
  if (sourceKindLabel && sourceKindLabel !== "unknown" && sourceKindLabel !== "来源不明") return sourceKindLabel;
  return null;
}

function mapResourceStatusToSkillStatus(status: AiosResource["status"]): SkillStatus {
  if (status === "available") return "available";
  if (status === "missing") return "broken";
  if (status === "unknown") return "unchecked";
  return "needsAttention";
}
