import { Box } from "@mui/material";
import { memo } from "react";
import type { AiosResource } from "../../types/inventory";
import { AiosAccordionPanel, AiosSection, AiosSectionHeader } from "../ui/AiosUiPrimitives";
import { ResourceCard, type ResourceCardVariant } from "./ResourceCard";

export interface ResourceGroupData {
  title: string;
  summary: string;
  resources: AiosResource[];
}

interface ResourceGroupProps {
  group: ResourceGroupData;
  selectedId: string | null;
  variant?: ResourceCardVariant;
  timeline?: boolean;
  accordion?: boolean;
  defaultExpanded?: boolean;
  onSelect: (resource: AiosResource) => void;
}

export const ResourceGroup = memo(function ResourceGroup({ group, selectedId, variant = "default", timeline, accordion = false, defaultExpanded = true, onSelect }: ResourceGroupProps) {
  if (group.resources.length === 0) return null;

  const content = (
    <Box className={timeline ? "resource-card-grid timeline" : "resource-card-grid"}>
      {group.resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} variant={variant} onSelect={onSelect} />
      ))}
    </Box>
  );

  if (accordion) {
    return (
      <AiosAccordionPanel className="resource-group accordion" count={group.resources.length} defaultExpanded={defaultExpanded} summary={group.summary} title={group.title}>
        {content}
      </AiosAccordionPanel>
    );
  }

  return (
    <AiosSection className="resource-group">
      <AiosSectionHeader count={group.resources.length} summary={group.summary} title={group.title} />
      {content}
    </AiosSection>
  );
});
