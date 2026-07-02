import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { useRef } from "react";
import { countByView, type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { useNavIndicatorMotion } from "../../lib/useAiosMotion";
import type { AiosResource } from "../../types/inventory";
import { consoleViews, moduleIcons } from "./moduleConfig";

interface AiosNavigationRailProps {
  activeView: ResourceView;
  resources: AiosResource[];
  onChange: (view: ResourceView) => void;
}

export function AiosNavigationRail({ activeView, resources, onChange }: AiosNavigationRailProps) {
  const railRef = useRef<HTMLElement>(null);
  useNavIndicatorMotion(railRef, activeView);

  return (
    <Box className="aios-navigation-rail" component="nav" ref={railRef} aria-label="AIOS 模块导航">
      <Box className="rail-brand" aria-label="AIOS Material 控制台">
        <Typography component="strong">AIOS</Typography>
        <Typography component="span">控制台</Typography>
      </Box>
      <Box className="rail-items" data-nav-track>
        <Box className="rail-selected-pill" data-nav-indicator aria-hidden="true" />
        {consoleViews.map((view) => {
          const Icon = moduleIcons[view];
          const active = view === activeView;
          const count = countByView(resources, view);
          return (
            <Tooltip key={view} title={`${VIEW_LABELS[view]} · ${count} 项`} placement="right">
              <ButtonBase
                className={active ? "rail-item active" : "rail-item"}
                aria-current={active ? "page" : undefined}
                aria-label={`${VIEW_LABELS[view]}，${count} 项`}
                aria-pressed={active}
                data-nav-active={active ? "true" : undefined}
                onClick={() => onChange(view)}
              >
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
