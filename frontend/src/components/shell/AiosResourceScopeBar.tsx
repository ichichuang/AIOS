import { Box, ButtonBase, Chip, Typography } from "@mui/material";
import {
  buildCorpusScopeTabs,
  getCorpusEmptyMessage,
  getCorpusSourceLabel,
  type ResourceCorpusScope,
  type ResourceCorpusSourceMode,
  type ResourceCorpusSummary
} from "../../lib/resourceCorpus";

interface AiosResourceScopeBarProps {
  activeScopeId: string;
  loading: boolean;
  mode: ResourceCorpusSourceMode;
  scopes: ResourceCorpusScope[];
  summary: ResourceCorpusSummary;
  error: string | null;
  onScopeChange: (scope: ResourceCorpusScope) => void;
}

export function AiosResourceScopeBar({ activeScopeId, loading, mode, scopes, summary, error, onScopeChange }: AiosResourceScopeBarProps) {
  const tabs = buildCorpusScopeTabs(scopes, summary);
  const sourceLabel = getCorpusSourceLabel(mode);
  const helper = error || (mode === "empty" ? getCorpusEmptyMessage(mode) : "全局、项目和来源 scope 只来自 SQLite 动态资源库。");

  return (
    <Box className="resource-scope-bar" aria-label="资源库 scope 过滤">
      <Box className="resource-scope-meta">
        <Typography component="strong">{sourceLabel}</Typography>
        <Typography color="text.secondary" variant="body2" noWrap title={helper}>
          {helper}
        </Typography>
      </Box>
      <Box className="resource-scope-tabs" role="tablist" aria-label="资源 scope">
        {tabs.map((tab) => {
          const active = tab.id === activeScopeId;
          return (
            <ButtonBase
              aria-selected={active}
              className={["resource-scope-tab", active ? "active" : ""].filter(Boolean).join(" ")}
              disabled={mode !== "dynamic-corpus" && tab.scope.scopeKind !== "global"}
              key={tab.id}
              role="tab"
              title={tab.description}
              onClick={() => onScopeChange(tab.scope)}
            >
              <Typography component="span" noWrap>
                {tab.label}
              </Typography>
              <Chip label={loading && active ? "读取中" : tab.count} size="small" variant={active ? "filled" : "outlined"} />
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
