import { Box, Chip, Stack, Typography } from "@mui/material";
import type { AiosResource } from "../../types/inventory";
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

export function ResourceGroup({ group, selectedId, variant = "default", timeline, onSelect }: ResourceGroupProps) {
  if (group.resources.length === 0) return null;

  return (
    <Box className="resource-group" component="section">
      <Stack className="resource-group-heading" direction="row" sx={{ alignItems: "flex-start", gap: 2, justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h3">
            {group.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {group.summary}
          </Typography>
        </Box>
        <Chip label={`${group.resources.length} 项`} variant="outlined" />
      </Stack>
      <Box className={timeline ? "resource-card-grid timeline" : "resource-card-grid"}>
        {group.resources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} variant={variant} onSelect={onSelect} />
        ))}
      </Box>
    </Box>
  );
}
