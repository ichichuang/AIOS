import { Box, ButtonBase, Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
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
import { moduleIcons, navigationGroups } from "./moduleConfig";
import labelIcon from "../../assets/image/label.png";

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
        <Box className="rail-brand-logo" component="img" src={labelIcon} alt="AIOS Logo" />
        <Typography component="strong">AIOS</Typography>
        <Typography component="span">Desktop</Typography>
      </Box>
      <Box className="rail-desktop-status" aria-label="桌面产品边界">
        <Chip className="status-chip status-ok" label="本地" size="small" />
        <Chip className="status-chip status-ok" label="只读" size="small" />
        <Typography className="rail-status-copy" component="span">
          壳 MVP · 无全盘扫描
        </Typography>
      </Box>
      <Box className="rail-items" data-nav-track>
        <Box className="rail-selected-pill" data-nav-indicator aria-hidden="true" />
        {navigationGroups.map((group) => {
          const activeInGroup = group.views.includes(activeView);
          return (
            <Box className={activeInGroup ? "rail-group active" : "rail-group"} key={group.key} aria-label={`${group.title}：${group.summary}`}>
              <Box className="rail-group-heading">
                <Typography className="rail-group-title" component="span">
                  {group.title}
                </Typography>
                {activeInGroup && (
                  <Typography className="rail-group-active" component="span">
                    当前
                  </Typography>
                )}
              </Box>
              <Box className="rail-group-items">
                {group.views.map((view) => {
                  return (
                    <AiosNavigationItem
                      key={view}
                      active={view === activeView}
                      count={viewCounts[view]}
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
  count: number;
  groupSummary: string;
  icon: SvgIconComponent;
  view: ResourceView;
  onChange: (view: ResourceView) => void;
}

const AiosNavigationItem = memo(function AiosNavigationItem({ active, count, groupSummary, icon: Icon, view, onChange }: AiosNavigationItemProps) {
  const moduleSummary = zhCN.moduleSummaries[view];
  return (
    <Tooltip title={`${VIEW_LABELS[view]} · ${moduleSummary} · ${groupSummary}`} placement="right">
      <ButtonBase
        className={active ? "rail-item active" : "rail-item"}
        aria-current={active ? "page" : undefined}
        aria-label={`${VIEW_LABELS[view]}，${moduleSummary}，${count} 项`}
        aria-pressed={active}
        data-nav-active={active ? "true" : undefined}
        onClick={() => onChange(view)}
      >
        <Icon fontSize="small" />
        <Typography className="rail-label" component="span">
          {VIEW_LABELS[view]}
        </Typography>
        <Typography className="rail-helper" component="span">
          {getModuleHelper(view)}
        </Typography>
        <Typography className="rail-count" component="span">
          {count}
        </Typography>
      </ButtonBase>
    </Tooltip>
  );
});

function getModuleHelper(view: ResourceView): string {
  switch (view) {
    case "dashboard":
      return "状态";
    case "skills":
      return "能力";
    case "mcp":
      return "元数据";
    case "scripts":
      return "不执行";
    case "reports":
      return "时间线";
    case "project-packs":
      return "项目";
    case "policies":
      return "守卫";
    case "validators":
      return "观察";
    case "legacy":
      return "兼容";
    default:
      return "模块";
  }
}

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
