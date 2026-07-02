import { Box, Chip, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from "@mui/material";
import CloseFullscreenRounded from "@mui/icons-material/CloseFullscreenRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import OpenInFullRounded from "@mui/icons-material/OpenInFullRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import type { KeyboardEvent } from "react";
import { formatSnapshotDate, zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosInventory } from "../../types/inventory";
import { consoleViews } from "./moduleConfig";

interface AiosTopCommandBarProps {
  activeView: ResourceView;
  inventory: AiosInventory;
  inspectorOpen: boolean;
  query: string;
  shownCount: number;
  onQueryChange: (query: string) => void;
  onToggleInspector: () => void;
  onViewChange: (view: ResourceView) => void;
}

export function AiosTopCommandBar({ activeView, inventory, inspectorOpen, query, shownCount, onQueryChange, onToggleInspector, onViewChange }: AiosTopCommandBarProps) {
  const normalized = query.trim().toLowerCase();
  const matchingViews = normalized
    ? consoleViews.filter((view) => `${VIEW_LABELS[view]} ${view}`.toLowerCase().includes(normalized)).slice(0, 4)
    : consoleViews.filter((view) => view !== activeView).slice(0, 4);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    const target = event.target as HTMLInputElement;
    const value = (target.value ?? query).trim().toLowerCase();
    const match = consoleViews.find((view) => view === value || VIEW_LABELS[view].toLowerCase() === value || `${VIEW_LABELS[view]} ${view}`.toLowerCase() === value);
    if (match) onViewChange(match);
  }

  return (
    <Box className="aios-top-command-bar">
      <Stack className="command-title" spacing={0.35}>
        <Typography className="eyebrow" component="p">
          本地只读 · Material Console V2
        </Typography>
        <Typography component="h1" variant="h2">
          AIOS 控制中心
        </Typography>
      </Stack>

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
        <Stack className="command-suggestions" direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
          {matchingViews.map((view) => (
            <Chip key={view} label={VIEW_LABELS[view]} variant={view === activeView ? "filled" : "outlined"} onClick={() => onViewChange(view)} />
          ))}
        </Stack>
      </Box>

      <Stack className="command-status" direction="row" sx={{ alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
        <Box className="command-meta">
          <Typography className="caption" component="p">
            {zhCN.app.generatedAt}
          </Typography>
          <Typography component="strong">{formatSnapshotDate(inventory.generatedAt)}</Typography>
        </Box>
        <Box className="command-meta compact">
          <Typography className="caption" component="p">
            当前视图
          </Typography>
          <Typography component="strong">
            {shownCount} / {inventory.resources.length}
          </Typography>
        </Box>
        <Tooltip title={inspectorOpen ? "收起检查器" : "展开检查器"}>
          <IconButton className="inspector-toggle" aria-label={inspectorOpen ? "收起检查器" : "展开检查器"} onClick={onToggleInspector}>
            {inspectorOpen ? <CloseFullscreenRounded fontSize="small" /> : <OpenInFullRounded fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title={zhCN.app.safetyState}>
          <TuneRounded className="command-safe-icon" fontSize="small" />
        </Tooltip>
      </Stack>
    </Box>
  );
}
