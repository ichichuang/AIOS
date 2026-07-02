import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { countByView, type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosResource } from "../../types/inventory";
import { consoleViews, moduleIcons } from "./moduleConfig";

interface AiosNavigationRailProps {
  activeView: ResourceView;
  resources: AiosResource[];
  onChange: (view: ResourceView) => void;
}

export function AiosNavigationRail({ activeView, resources, onChange }: AiosNavigationRailProps) {
  return (
    <Box className="aios-navigation-rail" component="nav" aria-label="AIOS 模块导航">
      <Box className="rail-brand" aria-label="AIOS Material 控制台">
        <Typography component="strong">AIOS</Typography>
        <Typography component="span">控制台</Typography>
      </Box>
      <Box className="rail-items">
        {consoleViews.map((view) => {
          const Icon = moduleIcons[view];
          const active = view === activeView;
          const count = countByView(resources, view);
          return (
            <Tooltip key={view} title={`${VIEW_LABELS[view]} · ${count} 项`} placement="right">
              <ButtonBase className={active ? "rail-item active" : "rail-item"} aria-pressed={active} onClick={() => onChange(view)}>
                <Icon fontSize="small" />
                <Typography component="span">{VIEW_LABELS[view]}</Typography>
                <Typography className="rail-count" component="span">
                  {count}
                </Typography>
              </ButtonBase>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}
