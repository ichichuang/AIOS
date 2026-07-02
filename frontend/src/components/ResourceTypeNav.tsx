import { Box, Stack, Tab, Tabs, Tooltip } from "@mui/material";
import { countByView, type ResourceView, VIEW_LABELS } from "../lib/filtering";
import { moduleIcons } from "./ModuleOverview";
import type { AiosResource } from "../types/inventory";

const views: ResourceView[] = ["dashboard", "skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

interface ResourceTypeNavProps {
  resources: AiosResource[];
  activeView: ResourceView;
  onChange: (view: ResourceView) => void;
}

export function ResourceTypeNav({ resources, activeView, onChange }: ResourceTypeNavProps) {
  return (
    <Tabs
      aria-label="资源模块"
      className="resource-nav"
      orientation="vertical"
      value={activeView}
      variant="scrollable"
      onChange={(_, view) => onChange(view as ResourceView)}
    >
      {views.map((view) => {
        const Icon = moduleIcons[view];
        const count = countByView(resources, view);
        return (
          <Tab
            className="nav-item"
            icon={
              <Tooltip title={VIEW_LABELS[view]}>
                <Icon fontSize="small" />
              </Tooltip>
            }
            key={view}
            label={
              <Stack className="nav-label" direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Box component="span">{VIEW_LABELS[view]}</Box>
                <Box component="span" className="nav-count">
                  {count}
                </Box>
              </Stack>
            }
            value={view}
          />
        );
      })}
    </Tabs>
  );
}
