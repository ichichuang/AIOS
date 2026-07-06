import { Box, ButtonBase, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Typography } from "@mui/material";
import BrightnessAutoRounded from "@mui/icons-material/BrightnessAutoRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { memo, useRef, useState, type MouseEvent } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { getPrimaryNavigationView } from "../../lib/productShell";
import { useNavIndicatorMotion, useSmoothHoverSurfaceMotion } from "../../lib/useAiosMotion";
import type { AiosThemePreference } from "../../theme/designTokens";
import { useAiosThemeMode } from "../../theme/AiosThemeProvider";
import { moduleIcons, navigationGroups } from "./moduleConfig";
import labelIcon from "../../assets/image/label.png";

interface AiosNavigationRailProps {
  activeView: ResourceView;
  viewCounts: Record<ResourceView, number>;
  onChange: (view: ResourceView) => void;
}

export function AiosNavigationRail({ activeView, onChange }: AiosNavigationRailProps) {
  const railRef = useRef<HTMLElement>(null);
  const activePrimaryView = getPrimaryNavigationView(activeView);
  useNavIndicatorMotion(railRef, activePrimaryView);
  useSmoothHoverSurfaceMotion(railRef, activePrimaryView, { selector: "[data-aios-nav-motion]" });

  return (
    <Box className="aios-navigation-rail" component="nav" ref={railRef} aria-label="AIOS 主导航">
      <Box className="rail-brand" aria-label="AIOS Desktop">
        <Box className="rail-brand-logo" component="img" src={labelIcon} alt="AIOS Logo" />
      </Box>
      <Box className="rail-items" data-nav-track>
        <Box className="rail-selected-pill" data-nav-indicator />
        {navigationGroups.map((group) => {
          const activeInGroup = group.views.includes(activePrimaryView);
          return (
            <Box className={activeInGroup ? "rail-group active" : "rail-group"} key={group.key} aria-label={`${group.title}：${group.summary}`}>
              <Box className="rail-group-items">
                {group.views.map((view) => {
                  return (
                    <AiosNavigationItem
                      key={view}
                      active={view === activePrimaryView}
                      groupSummary={group.summary}
                      icon={moduleIcons[view]}
                      view={view}
                      onChange={onChange}
                    />
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Box>
      <ThemeActionDock />
    </Box>
  );
}

interface AiosNavigationItemProps {
  active: boolean;
  groupSummary: string;
  icon: SvgIconComponent;
  view: ResourceView;
  onChange: (view: ResourceView) => void;
}

const AiosNavigationItem = memo(function AiosNavigationItem({ active, groupSummary, icon: Icon, view, onChange }: AiosNavigationItemProps) {
  const moduleSummary = zhCN.moduleSummaries[view];
  const label = VIEW_LABELS[view];
  return (
    <ButtonBase
      className={active ? "rail-item active" : "rail-item"}
      aria-current={active ? "page" : undefined}
      aria-label={`${label}，${moduleSummary}`}
      aria-pressed={active}
      data-aios-hover-card
      data-aios-motion-surface
      data-aios-nav-motion
      data-aios-selected-surface={active ? "true" : undefined}
      data-nav-active={active ? "true" : undefined}
      title={`${label} · ${moduleSummary} · ${groupSummary}`}
      onClick={() => onChange(view)}
    >
      <Icon fontSize="small" />
      <Typography className="rail-label" component="span">
        {label}
      </Typography>
    </ButtonBase>
  );
});

function ThemeActionDock() {
  const { mode, modeLabel, setMode } = useAiosThemeMode();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const ModeIcon = themeModeOptions.find((option) => option.mode === mode)?.icon ?? BrightnessAutoRounded;
  const open = Boolean(anchorEl);
  const label = `${zhCN.theme.toggle}，当前${modeLabel}`;

  function openMenu(event: MouseEvent<HTMLButtonElement>) {
    setAnchorEl(event.currentTarget);
  }

  function closeMenu() {
    setAnchorEl(null);
  }

  function chooseMode(nextMode: AiosThemePreference) {
    setMode(nextMode);
    closeMenu();
  }

  return (
    <Box className="rail-action-dock" aria-label="外观操作">
      <IconButton
        className={`theme-mode-button mode-${mode}`}
        aria-controls={open ? "aios-theme-mode-menu" : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-haspopup="menu"
        aria-label={label}
        data-aios-hover-card
        data-aios-motion-surface
        data-aios-nav-motion
        size="small"
        title={`${zhCN.theme.toggle} · ${modeLabel}`}
        type="button"
        onClick={openMenu}
      >
        <ModeIcon fontSize="small" />
      </IconButton>
      <Menu id="aios-theme-mode-menu" anchorEl={anchorEl} className="theme-mode-menu" open={open} onClose={closeMenu}>
        {themeModeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <MenuItem key={option.mode} selected={mode === option.mode} onClick={() => chooseMode(option.mode)}>
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={option.label} />
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}

const themeModeOptions: Array<{ mode: AiosThemePreference; label: string; icon: SvgIconComponent }> = [
  { mode: "light", label: zhCN.theme.light, icon: LightModeRounded },
  { mode: "dark", label: zhCN.theme.dark, icon: DarkModeRounded },
  { mode: "system", label: zhCN.theme.system, icon: BrightnessAutoRounded }
];
