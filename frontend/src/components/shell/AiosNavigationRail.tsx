import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { memo, useMemo, useRef } from "react";
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
  const counts = useMemo(
    () => Object.fromEntries(consoleViews.map((view) => [view, countByView(resources, view)])) as Record<ResourceView, number>,
    [resources]
  );
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
          return <AiosNavigationItem key={view} active={view === activeView} count={counts[view]} icon={moduleIcons[view]} view={view} onChange={onChange} />;
        })}
      </Box>
    </Box>
  );
}

interface AiosNavigationItemProps {
  active: boolean;
  count: number;
  icon: SvgIconComponent;
  view: ResourceView;
  onChange: (view: ResourceView) => void;
}

const AiosNavigationItem = memo(function AiosNavigationItem({ active, count, icon: Icon, view, onChange }: AiosNavigationItemProps) {
  return (
    <Tooltip title={`${VIEW_LABELS[view]} · ${count} 项`} placement="right">
      <ButtonBase
        className={active ? "rail-item active" : "rail-item"}
        aria-current={active ? "page" : undefined}
        aria-label={`${VIEW_LABELS[view]}，${count} 项`}
        aria-pressed={active}
        data-nav-active={active ? "true" : undefined}
        onClick={() => onChange(view)}
      >
        <Icon fontSize="small" />
        <Typography className="rail-label" component="span">
          {VIEW_LABELS[view]}
        </Typography>
        <Typography className="rail-count" component="span">
          {count}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
});
