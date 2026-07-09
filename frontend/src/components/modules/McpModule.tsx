import { Alert, Box, Chip, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { zhCN } from "../../i18n/zh-CN";
import {
  fallbackMcpToolHintsUnavailableText,
  filterMcpServiceItems,
  mcpServiceNeedsAttention,
  type McpServiceItem
} from "../../lib/mcpLibrary";
import { useContentPanelSwapMotion } from "../../lib/useAiosMotion";
import type { AiosResource } from "../../types/inventory";
import { McpServiceRow } from "../resources/McpServiceRow";
import { AiosContentPanel, AiosModuleFrame, AiosSectionHeader, AiosSectionRail } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

type McpStatusFilter = "all" | "attention";

interface McpSourceGroup {
  key: string;
  title: string;
  rows: McpServiceItem[];
}

export const McpModule = memo(function McpModule({ mcpLibrary, query, resources, selectedId, onClearSelection, onQueryChange, onSelect }: AiosModuleProps) {
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [statusMode, setStatusMode] = useState<McpStatusFilter>("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim();
  const useProductLibrary = mcpLibrary.summary !== null;
  const productCounts = mcpLibrary.summary?.counts ?? null;
  const serviceCount = productCounts ? productCounts.serviceCount : mcpLibrary.items.length || resources.filter((resource) => resource.capabilityType === "mcp-server").length;
  const toolHintCount = productCounts ? productCounts.toolHintCount : 0;
  const attentionCount = productCounts ? productCounts.needsAttentionCount : mcpLibrary.items.filter((item) => mcpServiceNeedsAttention(item)).length;

  const items = mcpLibrary.items;
  const statusFilteredItems = useMemo(() => {
    if (statusMode === "all") return items;
    return items.filter((item) => mcpServiceNeedsAttention(item));
  }, [items, statusMode]);

  const queryFilteredItems = useMemo(() => filterMcpServiceItems(statusFilteredItems, normalizedQuery), [normalizedQuery, statusFilteredItems]);

  const sourceGroups = useMemo(() => groupMcpItemsBySource(queryFilteredItems), [queryFilteredItems]);
  const activeSourceKey = getValidSourceKey(sourceGroups, sourceFilter) ?? "all";
  const visibleItems = useMemo(() => {
    if (activeSourceKey === "all") return queryFilteredItems;
    return queryFilteredItems.filter((item) => (item.sourceLabel || "来源不明") === activeSourceKey);
  }, [activeSourceKey, queryFilteredItems]);

  const sourceRailOptions = useMemo(() => {
    const options = [{ value: "all", label: "全部来源", count: queryFilteredItems.length }];
    for (const group of sourceGroups) {
      options.push({ value: group.title, label: group.title, count: group.rows.length });
    }
    return options;
  }, [queryFilteredItems.length, sourceGroups]);

  const productRowsMismatch =
    useProductLibrary &&
    serviceCount > 0 &&
    visibleItems.length === 0 &&
    !normalizedQuery &&
    activeSourceKey === "all" &&
    statusMode === "all" &&
    !mcpLibrary.loading &&
    !mcpLibrary.error;

  const panelMotionKey = `${statusMode}:${activeSourceKey}:${visibleItems.length}:${normalizedQuery ? "query" : "all"}`;
  useContentPanelSwapMotion(panelRef, panelMotionKey);

  const handleStatusChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, nextMode: McpStatusFilter | null) => {
      if (!nextMode || nextMode === statusMode) return;
      setStatusMode(nextMode);
      setSourceFilter("all");
      onClearSelection();
    },
    [onClearSelection, statusMode]
  );

  const handleSourceChange = useCallback(
    (nextValue: string) => {
      setSourceFilter(nextValue);
      onClearSelection();
    },
    [onClearSelection]
  );

  const handleClearSearch = useCallback(() => {
    onQueryChange?.("");
  }, [onQueryChange]);

  const handleResetFilters = useCallback(() => {
    setStatusMode("all");
    setSourceFilter("all");
    onClearSelection();
  }, [onClearSelection]);

  return (
    <AiosModuleFrame
      className="mcp-module"
      contentClassName="mcp-module-scroll"
      view="mcp"
      summary={zhCN.moduleSummaries.mcp}
      count={serviceCount}
      ariaLabel={moduleAriaLabel("mcp")}
      disableHoverMotion
      motionKey={`mcp:${panelMotionKey}`}
      actions={
        <>
          <Chip label="不启动服务" variant="outlined" size="small" />
          <Chip label="不连接端点" variant="outlined" size="small" />
          <Chip label="不调用 MCP 工具" variant="outlined" size="small" />
        </>
      }
    >
      <Box className="mcp-service-overview" data-aios-layout-fixed>
        <Alert className="mcp-local-reminder" severity="info" variant="outlined">
          这里只读展示本机配置摘要；AIOS Desktop 不启动服务、不连接远程端点、不调用 MCP 工具。
        </Alert>
        <Box className="mcp-service-toolbar skill-filter-row">
          <ToggleButtonGroup aria-label="MCP 服务筛选" className="skill-filter-toggle" exclusive size="small" value={statusMode} onChange={handleStatusChange}>
            <ToggleButton value="all">全部服务</ToggleButton>
            <ToggleButton value="attention">需关注 {attentionCount > 0 ? `(${attentionCount})` : ""}</ToggleButton>
          </ToggleButtonGroup>
          <Box className="skill-filter-search-state">
            <SearchRounded fontSize="small" />
            <Typography color="text.secondary" variant="body2" noWrap>
              {normalizedQuery ? `当前搜索：${normalizedQuery}` : "搜索 MCP 服务名称、来源或工具线索。"}
            </Typography>
          </Box>
        </Box>
        {useProductLibrary && toolHintCount === 0 && (
          <Alert className="mcp-local-reminder" severity="info" variant="outlined">
            {fallbackMcpToolHintsUnavailableText}
          </Alert>
        )}
      </Box>

      <Box className="mcp-service-workspace aios-two-pane">
        <AiosSectionRail
          ariaLabel="来源筛选"
          className="mcp-source-rail"
          disableItemHover
          options={sourceRailOptions}
          value={activeSourceKey}
          onChange={handleSourceChange}
        />
        <Box className="aios-pane aios-pane-scroll mcp-browser-panel" ref={panelRef} data-aios-internal-scroll="true">
          <AiosContentPanel className="mcp-content-panel" active>
            <AiosSectionHeader
              title="MCP 服务"
              summary={`本机已保存的 MCP 服务配置摘要；共识别 ${serviceCount} 个服务${toolHintCount > 0 ? `、${toolHintCount} 个工具线索` : ""}。`}
              count={visibleItems.length}
            />
            {productRowsMismatch ? (
              <Alert className="product-row-diagnostic" severity="warning" variant="outlined">
                <Typography component="strong">统计显示已有 MCP 服务，但当前列表没有可显示行。</Typography>
                <Typography color="text.secondary" variant="body2">
                  请刷新本地记录或重新完成一次查找；AIOS Desktop 不启动服务、不连接端点、不调用 MCP 工具。
                </Typography>
              </Alert>
            ) : items.length === 0 ? (
              <ModuleEmptyState {...moduleEmptyStateCopy("mcp")} />
            ) : visibleItems.length === 0 ? (
              <McpListEmptyState
                query={query}
                statusFilterActive={statusMode !== "all"}
                sourceFilterActive={activeSourceKey !== "all"}
                onClearSearch={handleClearSearch}
                onResetFilters={handleResetFilters}
              />
            ) : (
              <Box className="mcp-service-list" role="list">
                {visibleItems.map((item) => (
                  <McpServiceRow key={item.id} item={item} selectedId={selectedId} onSelect={onSelect} />
                ))}
              </Box>
            )}
          </AiosContentPanel>
        </Box>
      </Box>
    </AiosModuleFrame>
  );
});

function McpListEmptyState({
  query,
  statusFilterActive,
  sourceFilterActive,
  onClearSearch,
  onResetFilters
}: {
  query: string;
  statusFilterActive: boolean;
  sourceFilterActive: boolean;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
}) {
  const queryActive = query.trim().length > 0;
  if (queryActive) {
    return (
      <ModuleEmptyState
        title="没有匹配结果"
        body="换个关键词，或清除搜索后再试。"
        hints={["搜索覆盖服务名称、来源、工具和状态。", "清除搜索后会恢复全部列表。", "不会触发新的查找。"]}
        action={onClearSearch ? { label: "清除搜索", onClick: onClearSearch } : undefined}
      />
    );
  }

  if (statusFilterActive || sourceFilterActive) {
    return (
      <ModuleEmptyState
        title="当前筛选没有结果"
        body="这个筛选条件下没有 MCP 服务。"
        hints={["可重置筛选查看全部服务。", "需关注的服务会在对应标签下列出。", "来源筛选只影响当前列表展示。"]}
        action={onResetFilters ? { label: "重置筛选", onClick: onResetFilters } : undefined}
      />
    );
  }

  return (
    <ModuleEmptyState
      title="还没有找到 MCP 服务"
      body="开始查找后，这里会显示本机已保存的 MCP 服务和工具线索。"
      hints={["MCP 是一种让 AI 应用连接外部工具的方式。", "AIOS Desktop 不会启动 MCP 服务。", "AIOS Desktop 不会调用 MCP 工具。"]}
    />
  );
}

function groupMcpItemsBySource(items: readonly McpServiceItem[]): McpSourceGroup[] {
  const rowsBySource = new Map<string, McpServiceItem[]>();
  for (const item of items) {
    const title = item.sourceLabel || "来源不明";
    const rows = rowsBySource.get(title) ?? [];
    rows.push(item);
    rowsBySource.set(title, rows);
  }
  return [...rowsBySource.entries()].map(([title, rows]) => ({
    key: `source:${title}`,
    title,
    rows
  }));
}

function getValidSourceKey(groups: McpSourceGroup[], key: string | null): string | null {
  if (!key) return null;
  if (key === "all") return "all";
  return groups.some((group) => group.title === key) ? key : null;
}
