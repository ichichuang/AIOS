import { Box, ButtonBase, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import BrightnessAutoRounded from "@mui/icons-material/BrightnessAutoRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { memo, useRef, useState, type MouseEvent } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { useNavIndicatorMotion } from "../../lib/useAiosMotion";
import type { AiosThemePreference } from "../../theme/designTokens";
import { useAiosThemeMode } from "../../theme/AiosThemeProvider";
import { consoleViews, moduleIcons } from "./moduleConfig";

interface AiosNavigationRailProps {
  activeView: ResourceView;
  viewCounts: Record<ResourceView, number>;
  onChange: (view: ResourceView) => void;
}

export function AiosNavigationRail({ activeView, viewCounts, onChange }: AiosNavigationRailProps) {
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
          return <AiosNavigationItem key={view} active={view === activeView} count={viewCounts[view]} icon={moduleIcons[view]} view={view} onChange={onChange} />;
        })}
      </Box>
      <ThemeActionDock />
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
      <Tooltip title={`${zhCN.theme.toggle} · ${modeLabel}`} placement="right">
        <IconButton
          className={`theme-mode-button mode-${mode}`}
          aria-controls={open ? "aios-theme-mode-menu" : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-haspopup="menu"
          aria-label={label}
          size="small"
          type="button"
          onClick={openMenu}
        >
          <ModeIcon fontSize="small" />
        </IconButton>
      </Tooltip>
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
