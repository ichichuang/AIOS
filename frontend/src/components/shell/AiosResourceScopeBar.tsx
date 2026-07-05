import { Box, ButtonBase, Chip, Typography } from "@mui/material";
import {
  buildCorpusScopeTabs,
  getCorpusEmptyMessage,
  getCorpusSourceLabel,
  getScopeSemanticDescription,
  globalCorpusScope,
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
  const activeScope = scopes.find((scope) => scope.id === activeScopeId) ?? scopes[0] ?? globalCorpusScope;
  const helper = error || (mode === "empty" ? getCorpusEmptyMessage(mode) : getScopeSemanticDescription(activeScope, mode));

  if (mode === "legacy-snapshot") {
    return (
      <Box className="resource-scope-bar" aria-label="资源库 scope 过滤">
        <Box className="resource-scope-meta">
          <Typography component="strong">{sourceLabel}</Typography>
          <Typography color="text.secondary" variant="body2" noWrap title={helper}>
            {helper}
          </Typography>
        </Box>
        <Box className="resource-scope-tabs" role="tablist" aria-label="资源 scope">
          <ButtonBase aria-selected className="resource-scope-tab active" disabled role="tab" title={helper}>
            <Typography className="resource-scope-kind" component="span">
              Legacy
            </Typography>
            <Typography component="span" noWrap>
              示例快照
            </Typography>
            <Chip label="demo" size="small" variant="filled" />
          </ButtonBase>
        </Box>
      </Box>
    );
  }

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
                <Box className="resource-scope-kind" component="span">
                  {scopeKindLabel(tab.scope)}
                </Box>
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

function scopeKindLabel(scope: ResourceCorpusScope): string {
  if (scope.scopeKind === "project") return "Project";
  if (scope.scopeKind === "source") return "Source";
  if (scope.scopeKind === "unclassified") return "Unclassified";
  return "Global";
}
