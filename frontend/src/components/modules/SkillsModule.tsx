import { Alert, Box, Chip, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { memo, useCallback, useEffect, useMemo, useState, useTransition, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { markAiosPerf } from "../../lib/perf";
import { productVirtualListHeight, shouldShowProductRowsMismatchDiagnostic } from "../../lib/productListRendering";
import {
  buildSkillCapabilitySearchTextMap,
  classifySkillListItem,
  SKILL_CAPABILITY_CATEGORIES,
  type SkillCapabilityCategoryKey
} from "../../lib/skillCapabilityClassifier";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import { buildSkillIdentityRows, filterSkillIdentityRows, type SkillIdentityRow } from "../../lib/skillIdentityModel";
import {
  fallbackSkillUsageText,
  filterSkillLibraryItems,
  mapSkillListItemToResource,
  skillStatusFilterOptions,
  type SkillListItem,
  type SkillStatus,
  type SkillStatusFilter
} from "../../lib/skillLibrary";
import { LegacySkillRow, ProductSkillRow } from "../resources/SkillRow";
import { AiosModuleFrame, AiosSectionHeader, AiosSectionRail, AiosSegmentedSwitcher } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

type SkillLibraryTab = "groups" | "all";

interface SkillGroup {
  key: string;
  title: string;
  summary: string;
  rows: SkillIdentityRow[];
}

interface ProductSkillGroup {
  key: string;
  title: string;
  summary: string;
  rows: SkillListItem[];
}

const ROW_HEIGHT = 108;
const SOURCE_FILTER_ALL = "all";
const fallbackSkillStatusFilterOptions: ReadonlyArray<{ value: SkillStatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "needsAttention", label: "需补全" }
];

export const SkillsModule = memo(function SkillsModule({
  displayById,
  query,
  resources,
  selectedId,
  skillCapabilityById,
  skillLibrary,
  onClearSelection,
  onQueryChange,
  onSelect
}: AiosModuleProps) {
  const [libraryTab, setLibraryTab] = useState<SkillLibraryTab>("groups");
  const [statusFilterMode, setStatusFilterMode] = useState<SkillStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>(SOURCE_FILTER_ALL);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [renderedGroupKey, setRenderedGroupKey] = useState<string | null>(null);
  const [, startGroupTransition] = useTransition();
  const normalizedQuery = query.trim();
  const useProductLibrary = skillLibrary.summary !== null;

  const capabilitySearchTextById = useMemo(() => buildSkillCapabilitySearchTextMap(skillCapabilityById), [skillCapabilityById]);
  const skillRows = useMemo(() => buildSkillIdentityRows(resources), [resources]);
  const enrichmentByRowId = useMemo(
    () =>
      new Map(
        skillRows.map((row) => {
          const display = displayById.get(row.primaryResource.id) ?? getResourceDisplay(row.primaryResource);
          return [row.id, buildSkillDisplayEnrichment(row, display)];
        })
      ),
    [displayById, skillRows]
  );

  const groups = useMemo(() => groupSkillRowsByCapability(skillRows, skillCapabilityById), [skillCapabilityById, skillRows]);
  const filteredRowsByGroupKey = useMemo(
    () =>
      new Map(
        groups.map((group) => [
          group.key,
          filterSkillIdentityRows(group.rows, query, { displayById, capabilitySearchTextById }).filter((row) =>
            shouldIncludeQualityRow(row, statusFilterMode, enrichmentByRowId)
          )
        ])
      ),
    [capabilitySearchTextById, displayById, enrichmentByRowId, groups, statusFilterMode, query]
  );
  const defaultGroupKey = groups[0]?.key ?? null;
  const queryActive = normalizedQuery.length > 0;
  const fallbackStatusFilterActive = statusFilterMode !== "all";
  const firstMatchingGroupKey =
    queryActive || fallbackStatusFilterActive
      ? groups.find((group) => (filteredRowsByGroupKey.get(group.key)?.length ?? 0) > 0)?.key ?? null
      : null;
  const activeKey = getValidGroupKey(groups, activeGroupKey) ?? firstMatchingGroupKey ?? defaultGroupKey;
  const renderedKey = getValidGroupKey(groups, renderedGroupKey) ?? activeKey;
  const renderedGroup = groups.find((group) => group.key === renderedKey) ?? groups[0] ?? null;
  const queryResultRows = useMemo(() => uniqueRows([...filteredRowsByGroupKey.values()].flat()), [filteredRowsByGroupKey]);
  const activeGroup = queryActive
    ? {
        key: "search-results",
        title: "搜索结果",
        summary: "跨当前技能分组显示所有匹配的技能。",
        rows: skillRows
      }
    : libraryTab === "all"
      ? {
          key: "all-skills",
          title: "全部技能",
          summary: "按当前筛选条件显示所有技能。",
          rows: skillRows
        }
      : renderedGroup;
  const visibleRows = useMemo(() => {
    if (queryActive || libraryTab === "all") return queryResultRows;
    return renderedGroup ? filteredRowsByGroupKey.get(renderedGroup.key) ?? [] : [];
  }, [filteredRowsByGroupKey, libraryTab, queryActive, queryResultRows, renderedGroup]);

  const productCapabilityById = useMemo(
    () => new Map(skillLibrary.items.map((item) => [item.id, classifySkillListItem(item)])),
    [skillLibrary.items]
  );
  const productGroups = useMemo(() => groupSkillLibraryItemsByCapability(skillLibrary.items, productCapabilityById), [skillLibrary.items, productCapabilityById]);
  const productSourceOptions = useMemo(() => uniqueSourceLabels(skillLibrary.items), [skillLibrary.items]);
  const sourceFilterActive = sourceFilter !== SOURCE_FILTER_ALL;
  const productFilteredRowsByGroupKey = useMemo(
    () =>
      new Map(
        productGroups.map((group) => [
          group.key,
          filterSkillLibraryItems(group.rows, query, statusFilterMode).filter(
            (item) => !sourceFilterActive || item.sourceLabel === sourceFilter
          )
        ])
      ),
    [productGroups, query, sourceFilter, sourceFilterActive, statusFilterMode]
  );
  const productDefaultGroupKey = productGroups[0]?.key ?? null;
  const productStatusFilterActive = statusFilterMode !== "all";
  const productFirstMatchingGroupKey =
    queryActive || productStatusFilterActive || sourceFilterActive
      ? productGroups.find((group) => (productFilteredRowsByGroupKey.get(group.key)?.length ?? 0) > 0)?.key ?? null
      : null;
  const productActiveKey = getValidGroupKey(productGroups, activeGroupKey) ?? productFirstMatchingGroupKey ?? productDefaultGroupKey;
  const productRenderedKey = getValidGroupKey(productGroups, renderedGroupKey) ?? productActiveKey;
  const productRenderedGroup = productGroups.find((group) => group.key === productRenderedKey) ?? productGroups[0] ?? null;
  const productQueryResultRows = useMemo(() => uniqueSkillLibraryItems([...productFilteredRowsByGroupKey.values()].flat()), [productFilteredRowsByGroupKey]);
  const productActiveGroup = queryActive
    ? {
        key: "search-results",
        title: "搜索结果",
        summary: "跨当前技能分组显示所有匹配的技能。",
        rows: skillLibrary.items
      }
    : libraryTab === "all"
      ? {
          key: "all-skills",
          title: "全部技能",
          summary: "按当前筛选条件显示所有技能。",
          rows: skillLibrary.items
        }
      : productRenderedGroup;
  const productVisibleRows = useMemo(() => {
    if (queryActive || libraryTab === "all") return productQueryResultRows;
    return productRenderedGroup ? productFilteredRowsByGroupKey.get(productRenderedGroup.key) ?? [] : [];
  }, [libraryTab, productFilteredRowsByGroupKey, productQueryResultRows, productRenderedGroup, queryActive]);
  const productVisibleListHeight = productVirtualListHeight(productVisibleRows.length, ROW_HEIGHT);
  const productRowsMismatch = shouldShowProductRowsMismatchDiagnostic({
    summaryCount: skillLibrary.summary?.counts.dedupedSkillCount ?? 0,
    rowCount: productVisibleRows.length,
    query,
    statusFilterActive: productStatusFilterActive || sourceFilterActive,
    loading: skillLibrary.loading,
    error: skillLibrary.error
  });

  const libraryTabOptions = useMemo(
    () => [
      { value: "groups", label: "分类浏览", count: groups.length },
      { value: "all", label: "全部技能", count: queryResultRows.length }
    ],
    [groups.length, queryResultRows.length]
  );
  const productLibraryTabOptions = useMemo(
    () => [
      { value: "groups", label: "分类浏览", count: productGroups.length },
      { value: "all", label: "全部技能", count: productQueryResultRows.length }
    ],
    [productGroups.length, productQueryResultRows.length]
  );

  const handleLibraryTabChange = useCallback(
    (nextValue: string) => {
      const nextTab = nextValue as SkillLibraryTab;
      if (nextTab === libraryTab) return;
      markAiosPerf("skills-library-tab-request", { mode: nextTab });
      setLibraryTab(nextTab);
      onClearSelection();
    },
    [libraryTab, onClearSelection]
  );

  const handleQualityFilterChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextMode: SkillStatusFilter | null) => {
      if (!nextMode || nextMode === statusFilterMode) return;
      markAiosPerf("skills-quality-filter-request", { mode: nextMode });
      setStatusFilterMode(nextMode);
      setActiveGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [onClearSelection, statusFilterMode, startGroupTransition]
  );

  const handleSourceFilterChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextSource: string | null) => {
      if (!nextSource || nextSource === sourceFilter) return;
      markAiosPerf("skills-source-filter-request", { source: nextSource });
      setSourceFilter(nextSource);
      setActiveGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [onClearSelection, sourceFilter, startGroupTransition]
  );

  const handleGroupChange = useCallback(
    (key: string) => {
      markAiosPerf("skills-group-request", { group: key, mode: "capability" });
      setActiveGroupKey(key);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(key);
      });
    },
    [onClearSelection, startGroupTransition]
  );

  const handleClearSearch = useCallback(() => {
    onQueryChange?.("");
  }, [onQueryChange]);

  const handleResetFilters = useCallback(() => {
    setStatusFilterMode("all");
    setSourceFilter(SOURCE_FILTER_ALL);
    setActiveGroupKey(null);
    setRenderedGroupKey(null);
    onClearSelection();
  }, [onClearSelection]);

  const effectiveRenderedKey = useProductLibrary ? productRenderedKey : renderedKey;
  const effectiveVisibleRowsCount = useProductLibrary ? productVisibleRows.length : visibleRows.length;
  const effectiveTotalRowsCount = useProductLibrary ? (skillLibrary.summary?.counts.dedupedSkillCount ?? productVisibleRows.length) : visibleRows.length;

  useEffect(() => {
    markAiosPerf("skills-rendered", {
      group: effectiveRenderedKey ?? "empty",
      mode: "capability",
      sourceView: useProductLibrary ? "skill-library-product" : "merged",
      statusFilter: statusFilterMode,
      sourceFilter: useProductLibrary ? sourceFilter : "n/a",
      visible: effectiveVisibleRowsCount,
      total: useProductLibrary ? skillLibrary.items.length : skillRows.length,
      query: normalizedQuery ? "filtered" : "empty"
    });
  }, [effectiveRenderedKey, effectiveVisibleRowsCount, normalizedQuery, skillLibrary.items.length, skillRows.length, sourceFilter, statusFilterMode, useProductLibrary]);

  useEffect(() => {
    if (!normalizedQuery) return;
    setActiveGroupKey(null);
    setRenderedGroupKey(null);
  }, [normalizedQuery]);

  const categoryRailOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.key,
        label: group.title,
        count: filteredRowsByGroupKey.get(group.key)?.length ?? 0
      })),
    [filteredRowsByGroupKey, groups]
  );
  const productCategoryRailOptions = useMemo(
    () =>
      productGroups.map((group) => ({
        value: group.key,
        label: group.title,
        count: productFilteredRowsByGroupKey.get(group.key)?.length ?? 0
      })),
    [productFilteredRowsByGroupKey, productGroups]
  );

  const skillListShell = (
    <Box className="compact-skill-list-shell" data-aios-internal-scroll="true">
      {visibleRows.length === 0 ? (
        <SkillListEmptyState query={query} statusFilterActive={fallbackStatusFilterActive} onClearSearch={handleClearSearch} onResetFilters={handleResetFilters} />
      ) : (
        <Box className="compact-skill-static-list" role="list" style={{ maxHeight: productVirtualListHeight(visibleRows.length, ROW_HEIGHT) }}>
          {visibleRows.map((row) => (
            <LegacySkillRow key={(row as SkillIdentityRow).id} row={row as SkillIdentityRow} selectedId={selectedId} skillCapabilityById={skillCapabilityById} onSelect={onSelect} />
          ))}
        </Box>
      )}
    </Box>
  );
  const productSkillListShell = (
    <Box className="compact-skill-list-shell" data-aios-internal-scroll="true">
      {productRowsMismatch ? (
        <Alert className="product-row-diagnostic" severity="warning" variant="outlined">
          <Typography component="strong">统计显示已有技能，但当前列表没有可显示行。</Typography>
          <Typography color="text.secondary" variant="body2">
            请刷新本地记录或重新完成一次查找；AIOS Desktop 不会读取技能正文。
          </Typography>
        </Alert>
      ) : productVisibleRows.length === 0 ? (
        <SkillListEmptyState query={query} statusFilterActive={productStatusFilterActive || sourceFilterActive} onClearSearch={handleClearSearch} onResetFilters={handleResetFilters} />
      ) : (
        <Box className="compact-skill-static-list" role="list" style={{ maxHeight: productVisibleListHeight }}>
          {productVisibleRows.map((item) => (
            <ProductSkillStaticRow
              key={item.id}
              item={item}
              categoryLabel={productCapabilityById.get(item.id)?.primaryCategory.title}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </Box>
      )}
    </Box>
  );
  const effectiveLibraryTabOptions = useProductLibrary ? productLibraryTabOptions : libraryTabOptions;
  const effectiveCategoryRailOptions = useProductLibrary ? productCategoryRailOptions : categoryRailOptions;
  const effectiveStatusFilterOptions = useProductLibrary ? skillStatusFilterOptions : fallbackSkillStatusFilterOptions;
  const effectiveActiveKey = useProductLibrary ? productActiveKey : activeKey;
  const effectiveActiveGroup = useProductLibrary ? productActiveGroup : activeGroup;
  const effectiveGroupsLength = useProductLibrary ? productGroups.length : groups.length;
  const effectiveSkillListShell = useProductLibrary ? productSkillListShell : skillListShell;

  return (
    <AiosModuleFrame
      className="skills-module"
      contentClassName="skills-module-scroll"
      view="skills"
      summary={zhCN.moduleSummaries.skills}
      count={effectiveTotalRowsCount}
      ariaLabel={moduleAriaLabel("skills")}
      motionKey={`skills:capability:${libraryTab}:${statusFilterMode}:${sourceFilter}:${effectiveRenderedKey ?? "none"}:${effectiveVisibleRowsCount}:${normalizedQuery ? "query" : "all"}`}
      disableHoverMotion
    >
      <Box className="skill-library-toolbar" data-aios-layout-fixed>
        <Box className="skill-filter-row">
          <AiosSegmentedSwitcher ariaLabel="技能浏览方式" options={effectiveLibraryTabOptions} value={libraryTab} onChange={handleLibraryTabChange} />
          <ToggleButtonGroup aria-label="技能筛选" className="skill-filter-toggle" exclusive size="small" value={statusFilterMode} onChange={handleQualityFilterChange}>
            {effectiveStatusFilterOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {useProductLibrary && productSourceOptions.length > 1 && (
            <ToggleButtonGroup aria-label="来源筛选" className="skill-filter-toggle skill-source-filter" exclusive size="small" value={sourceFilter} onChange={handleSourceFilterChange}>
              <ToggleButton value={SOURCE_FILTER_ALL}>全部来源</ToggleButton>
              {productSourceOptions.map((source) => (
                <ToggleButton key={source} value={source}>
                  {source}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}
        </Box>
        <Box className="skill-filter-search-state">
          <SearchRounded fontSize="small" />
          <Typography color="text.secondary" variant="body2" noWrap>
            {normalizedQuery ? `当前搜索：${normalizedQuery}` : "使用顶部搜索框筛选技能名称和用途。"}
          </Typography>
        </Box>
      </Box>
      {libraryTab === "groups" && effectiveGroupsLength > 0 ? (
        <Box className="aios-two-pane" data-aios-motion-surface>
          <AiosSectionRail
            ariaLabel="技能分类"
            options={effectiveCategoryRailOptions}
            value={effectiveActiveKey ?? ""}
            onChange={handleGroupChange}
            disableItemHover
          />
          <SkillListPanel count={effectiveVisibleRowsCount} summary={effectiveActiveGroup?.summary || "探索本地只读技能元数据。"} title={effectiveActiveGroup?.title ?? "技能库"}>
            {effectiveSkillListShell}
          </SkillListPanel>
        </Box>
      ) : (
        <SkillListPanel count={effectiveVisibleRowsCount} summary={effectiveActiveGroup?.summary || "探索本地只读技能元数据。"} title={effectiveActiveGroup?.title ?? "技能库"}>
          {effectiveSkillListShell}
        </SkillListPanel>
      )}
    </AiosModuleFrame>
  );
});

function SkillListPanel({ children, count, summary, title }: { children: ReactElement; count: number; summary: string; title: string }) {
  return (
    <Box className="skill-list-panel skill-list-accordion" data-aios-motion-surface data-motion="resource-card">
      <AiosSectionHeader count={count} summary={summary} title={title} />
      {children}
    </Box>
  );
}

function SkillListEmptyState({
  query,
  statusFilterActive,
  onClearSearch,
  onResetFilters
}: {
  query: string;
  statusFilterActive: boolean;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
}) {
  const queryActive = query.trim().length > 0;
  const emptyCopy = moduleEmptyStateCopy("skills");

  if (queryActive) {
    return (
      <ModuleEmptyState
        title="没有匹配结果"
        body="换个关键词，或清除搜索后再试。"
        hints={["搜索覆盖技能名称、用途、来源和可用工具。", "清除搜索后会恢复全部列表。", "不会触发新的查找。"]}
      />
    );
  }

  if (statusFilterActive) {
    return (
      <ModuleEmptyState
        title="当前筛选没有结果"
        body="这个状态下没有技能。"
        hints={["可重置筛选查看全部技能。", "已损坏或来源不明的技能会在对应状态下列出。", "不会修改任何来源。"]}
      />
    );
  }

  return (
    <ModuleEmptyState
      title={emptyCopy.title}
      body={emptyCopy.body}
      hints={[
        ...emptyCopy.hints,
        ...(onClearSearch ? ["可清除搜索恢复全部列表。"] : []),
        ...(onResetFilters ? ["可重置筛选查看所有状态。"] : [])
      ]}
    />
  );
}

function ProductSkillStaticRow({
  item,
  categoryLabel,
  selectedId,
  onSelect
}: {
  item: SkillListItem;
  categoryLabel?: string;
  selectedId: string | null;
  onSelect: AiosModuleProps["onSelect"];
}): ReactElement {
  const resource = mapSkillListItemToResource(item);
  return (
    <ProductSkillRow
      item={item}
      categoryLabel={categoryLabel}
      selectedId={selectedId}
      onSelect={(selectedResource, context) => onSelect(selectedResource, { ...context, skillListItem: item })}
    />
  );
}

function groupSkillRowsByCapability(
  rows: SkillIdentityRow[],
  skillCapabilityById: ReadonlyMap<string, { primaryCategory: { key: SkillCapabilityCategoryKey } }>
): SkillGroup[] {
  const rowsByCategory = new Map<SkillCapabilityCategoryKey, SkillIdentityRow[]>(SKILL_CAPABILITY_CATEGORIES.map((category) => [category.key, []]));

  for (const row of rows) {
    const categoryKey = skillCapabilityById.get(row.primaryResource.id)?.primaryCategory.key ?? "other";
    const categoryRows = rowsByCategory.get(categoryKey) ?? rowsByCategory.get("other");
    categoryRows?.push(row);
  }

  return SKILL_CAPABILITY_CATEGORIES.map((category) => ({
    key: category.key,
    title: category.title,
    summary: category.summary,
    rows: rowsByCategory.get(category.key) ?? []
  })).filter((group) => group.rows.length > 0);
}

function groupSkillLibraryItemsByCapability(
  items: SkillListItem[],
  capabilityById: ReadonlyMap<string, { primaryCategory: { key: SkillCapabilityCategoryKey } }>
): ProductSkillGroup[] {
  const rowsByCategory = new Map<SkillCapabilityCategoryKey, SkillListItem[]>(SKILL_CAPABILITY_CATEGORIES.map((category) => [category.key, []]));

  for (const item of items) {
    const categoryKey = capabilityById.get(item.id)?.primaryCategory.key ?? "other";
    const categoryRows = rowsByCategory.get(categoryKey) ?? rowsByCategory.get("other");
    categoryRows?.push(item);
  }

  return SKILL_CAPABILITY_CATEGORIES.map((category) => ({
    key: category.key,
    title: category.title,
    summary: category.summary,
    rows: rowsByCategory.get(category.key) ?? []
  })).filter((group) => group.rows.length > 0);
}

function getValidGroupKey(groups: Array<{ key: string }>, key: string | null): string | null {
  return key && groups.some((group) => group.key === key) ? key : null;
}

function shouldIncludeQualityRow(row: SkillIdentityRow, mode: SkillStatusFilter, enrichmentByRowId: ReadonlyMap<string, { qualityLevel: string }>): boolean {
  if (mode === "all") return true;
  return enrichmentByRowId.get(row.id)?.qualityLevel !== "complete";
}

function uniqueRows(rows: SkillIdentityRow[]): SkillIdentityRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function uniqueSkillLibraryItems(rows: SkillListItem[]): SkillListItem[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

function uniqueSourceLabels(items: SkillListItem[]): string[] {
  const labels = new Set<string>();
  for (const item of items) {
    if (item.sourceLabel) labels.add(item.sourceLabel);
  }
  return [...labels].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

const skillStatusLabels: Record<SkillStatus, string> = {
  available: "可用",
  needsAttention: "需要处理",
  duplicate: "重复",
  broken: "已损坏",
  sourceUnknown: "来源不明",
  unchecked: "未检查"
};
