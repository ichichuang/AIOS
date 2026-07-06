import { Box, Chip, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import type { KeyboardEvent } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { resolvePrimaryNavigationSearch, topSearchCopy } from "../../lib/productShell";
import type { AiosInventory } from "../../types/inventory";
import labelIcon from "../../assets/image/label.png";

interface AiosTopCommandBarProps {
  activeView: ResourceView;
  inventory: AiosInventory;
  query: string;
  shownCount: number;
  sourceLabel: string;
  onQueryChange: (query: string) => void;
  onViewChange: (view: ResourceView) => void;
}

export function AiosTopCommandBar({ activeView, query, shownCount, sourceLabel, onQueryChange, onViewChange }: AiosTopCommandBarProps) {
  const activeModuleLabel = VIEW_LABELS[activeView];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLInputElement;
    const match = resolvePrimaryNavigationSearch(target.value ?? query);
    if (match) onViewChange(match);
  }

  return (
    <Box className="aios-top-command-bar">
      <Box className="command-title">
        <Box className="command-title-logo" component="img" src={labelIcon} alt="AIOS Logo" />
        <Box className="command-title-copy">
          <Typography component="h1" variant="h2">
            {activeModuleLabel}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {sourceLabel} · {shownCount} 项
          </Typography>
        </Box>
      </Box>

      <Box className="command-search-wrap">
        <TextField
          aria-label={topSearchCopy.ariaLabel}
          className="command-search"
          fullWidth
          placeholder={topSearchCopy.placeholder}
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
                  <Tooltip title="搜索只筛选技能、MCP 和来源，不执行命令">
                    <ManageSearchRounded fontSize="small" />
                  </Tooltip>
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      <Box className="command-status">
        <Tooltip title="AIOS Desktop 只读取本机基本信息，结果只保存在这台电脑上">
          <Chip className="status-chip status-ok" label="本地只读" size="small" />
        </Tooltip>
      </Box>
    </Box>
  );
}
