import { Box, Chip, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import type { KeyboardEvent } from "react";
import { formatSnapshotDate, zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosInventory } from "../../types/inventory";
import { consoleViews } from "./moduleConfig";
import labelIcon from "../../assets/image/label.png";

interface AiosTopCommandBarProps {
  activeView: ResourceView;
  inventory: AiosInventory;
  query: string;
  shownCount: number;
  onQueryChange: (query: string) => void;
  onViewChange: (view: ResourceView) => void;
}

export function AiosTopCommandBar({ activeView, inventory, query, shownCount, onQueryChange, onViewChange }: AiosTopCommandBarProps) {
  const activeModuleLabel = VIEW_LABELS[activeView];
  const boundaryLabel = "本地只读 · 显式扫描 · 高级发现需确认";

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLInputElement;
    const value = (target.value ?? query).trim().toLowerCase();
    const match = consoleViews.find((view) => view === value || VIEW_LABELS[view].toLowerCase() === value || `${VIEW_LABELS[view]} ${view}`.toLowerCase() === value);
    if (match) onViewChange(match);
  }

  return (
    <Box className="aios-top-command-bar">
      <Box className="command-title">
        <Box className="command-title-logo" component="img" src={labelIcon} alt="AIOS Logo" />
        <Typography component="h1" variant="h2">
          AIOS Desktop
        </Typography>
        <Chip className="status-chip status-ok command-boundary-chip" label="本地只读" title={boundaryLabel} />
      </Box>

      <Box className="command-search-wrap">
        <TextField
          aria-label={zhCN.app.commandLabel}
          className="command-search"
          fullWidth
          placeholder="搜索资源、路径、风险；输入模块名后按 Enter 切换"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="搜索仅筛选与导航，不执行命令">
                    <ManageSearchRounded fontSize="small" />
                  </Tooltip>
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      <Box className="command-status">
        <Box className="command-meta">
          <Typography className="caption" component="p">
            {zhCN.app.generatedAt}
          </Typography>
          <Typography component="strong">{formatSnapshotDate(inventory.generatedAt)}</Typography>
        </Box>
        <Box className="command-meta compact">
          <Typography className="caption" component="p">
            {zhCN.app.activeModule}
          </Typography>
          <Typography component="strong" title={`${activeModuleLabel} · ${shownCount} 项可见，总计 ${inventory.resources.length} 项`}>
            {activeModuleLabel} · {shownCount} 项
          </Typography>
        </Box>
        <Tooltip title={`${zhCN.app.safetyState} · 无自动扫描`}>
          <Box className="command-safe-indicator" component="span" aria-label={`${zhCN.app.safetyState}，无自动扫描`}>
            <TuneRounded className="command-safe-icon" fontSize="small" />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
