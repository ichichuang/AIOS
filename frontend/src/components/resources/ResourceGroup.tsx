import { Box } from "@mui/material";
import { memo } from "react";
import type { AiosResource } from "../../types/inventory";
import { AiosSection, AiosSectionHeader } from "../ui/AiosUiPrimitives";
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
  onSelect: (resource: AiosResource) => void;
}

export const ResourceGroup = memo(function ResourceGroup({ group, selectedId, variant = "default", timeline, onSelect }: ResourceGroupProps) {
  if (group.resources.length === 0) return null;

  return (
    <AiosSection className="resource-group">
      <AiosSectionHeader count={group.resources.length} summary={group.summary} title={group.title} />
      <Box className={timeline ? "resource-card-grid timeline" : "resource-card-grid"}>
        {group.resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} variant={variant} onSelect={onSelect} />
        ))}
      </Box>
    </AiosSection>
  );
});
