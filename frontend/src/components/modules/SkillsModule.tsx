import { Box, Button, ButtonBase, Chip, FormControl, InputLabel, MenuItem, Select, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery, useTheme } from "@mui/material";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import BugReportRounded from "@mui/icons-material/BugReportRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import DatasetRounded from "@mui/icons-material/DatasetRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import FindInPageRounded from "@mui/icons-material/FindInPageRounded";
import HelpOutlineRounded from "@mui/icons-material/HelpOutlineRounded";
import PaletteRounded from "@mui/icons-material/PaletteRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import WebRounded from "@mui/icons-material/WebRounded";
import { memo, useCallback, useEffect, useMemo, useState, useTransition, type KeyboardEvent, type MouseEvent, type ReactElement } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
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
  buildSkillBrowseView,
  getSkillBrowseEmptyStateCopy,
  normalizeSkillBrowseFilters,
  readPersistedSkillCapability,
  readPersistedSkillProject,
  readPersistedSkillScope,
  type SkillBrowseEmptyReason,
  type SkillCapabilityFilter,
  type SkillProjectFilterValue,
  type SkillScopeFilter,
  writePersistedSkillScope,
  writePersistedSkillProject,
  writePersistedSkillCapability
} from "../../lib/skillBrowseModel";
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
const ALL_PROJECTS_VALUE: SkillProjectFilterValue = "allProjects";
const ALL_CAPABILITY_VALUE: SkillCapabilityFilter = "all";
const NARROW_BREAKPOINT = 980;
const fallbackSkillStatusFilterOptions: ReadonlyArray<{ value: SkillStatusFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "needsAttention", label: "需补全" }
];

const CAPABILITY_ICONS: Record<SkillCapabilityCategoryKey, typeof WebRounded> = {
  "frontend-ui": WebRounded,
  coding: CodeRounded,
  "code-review": FindInPageRounded,
  "testing-qa": BugReportRounded,
  "docs-writing": ArticleRounded,
  "data-automation": DatasetRounded,
  "research-analysis": PsychologyRounded,
  "security-governance": SecurityRounded,
  "design-visual": PaletteRounded,
  unknown: HelpOutlineRounded
};

export const SkillsModule = memo(function SkillsModule({
  displayById,
  query,
  resources,
  selectedId,
  skillCapabilityById,
  skillLibrary,
  initialScope,
  initialShowMoreFilters,
  onClearSelection,
  onQueryChange,
  onSelect
}: AiosModuleProps & { initialScope?: SkillScopeFilter; initialShowMoreFilters?: boolean }) {
  // Legacy fallback state (unchanged visual contract for non-product resources).
  const [libraryTab, setLibraryTab] = useState<SkillLibraryTab>("groups");
  const [legacyStatusFilterMode, setLegacyStatusFilterMode] = useState<SkillStatusFilter>("all");

  // Product browsing state.
  const [scope, setScope] = useState<SkillScopeFilter>(initialScope ?? "all");
  const [projectId, setProjectId] = useState<SkillProjectFilterValue>(ALL_PROJECTS_VALUE);
  const [capability, setCapability] = useState<SkillCapabilityFilter>(ALL_CAPABILITY_VALUE);
  const [productStatusFilterMode, setProductStatusFilterMode] = useState<SkillStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<string>(SOURCE_FILTER_ALL);
  const [showMoreFilters, setShowMoreFilters] = useState(initialShowMoreFilters ?? false);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [renderedGroupKey, setRenderedGroupKey] = useState<string | null>(null);
  const [, startGroupTransition] = useTransition();

  const theme = useTheme();
  const isNarrow = useMediaQuery(`(max-width:${NARROW_BREAKPOINT}px)`);

  const normalizedQuery = query.trim();
  const useProductLibrary = skillLibrary.summary !== null;

  // Load persisted selections once.
  useEffect(() => {
    const persistedScope = readPersistedSkillScope();
    const persistedProject = readPersistedSkillProject();
    const persistedCapability = readPersistedSkillCapability();
    if (persistedScope) setScope(persistedScope);
    if (persistedProject) setProjectId(persistedProject);
    if (persistedCapability) setCapability(persistedCapability);
  }, []);

  // Persist valid selections.
  useEffect(() => {
    writePersistedSkillScope(scope);
  }, [scope]);
  useEffect(() => {
    writePersistedSkillProject(projectId);
  }, [projectId]);
  useEffect(() => {
    writePersistedSkillCapability(capability);
  }, [capability]);

  // Legacy path data transformations.
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

  const groups = useMemo(() => groupSkillLibraryItemsByCapability(skillRows, skillCapabilityById), [skillCapabilityById, skillRows]);
  const filteredRowsByGroupKey = useMemo(
    () =>
      new Map(
        groups.map((group) => [
          group.key,
          filterSkillIdentityRows(group.rows, query, { displayById, capabilitySearchTextById }).filter((row) =>
            shouldIncludeQualityRow(row, legacyStatusFilterMode, enrichmentByRowId)
          )
        ])
      ),
    [capabilitySearchTextById, displayById, enrichmentByRowId, groups, legacyStatusFilterMode, query]
  );
  const defaultGroupKey = groups[0]?.key ?? null;
  const queryActive = normalizedQuery.length > 0;
  const fallbackStatusFilterActive = legacyStatusFilterMode !== "all";
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

  // Product path data transformations.
  const productCapabilityById = useMemo(
    () => new Map(skillLibrary.items.map((item) => [item.id, classifySkillListItem(item)])),
    [skillLibrary.items]
  );
  const productSourceOptions = useMemo(() => uniqueSourceLabels(skillLibrary.items), [skillLibrary.items]);
  const availableProjectIds = useMemo(
    () => new Set(skillLibrary.items.flatMap((item) => item.scopeSummary.projects.map((project) => project.projectId))),
    [skillLibrary.items]
  );
  const availableCapabilityKeys = useMemo(
    () => new Set(SKILL_CAPABILITY_CATEGORIES.map((category) => category.key)),
    []
  );

  const productFilters = useMemo(
    () =>
      normalizeSkillBrowseFilters(
        {
          scope,
          projectId,
          capability,
          query: normalizedQuery,
          status: productStatusFilterMode,
          source: sourceFilter
        },
        availableProjectIds,
        availableCapabilityKeys
      ),
    [scope, projectId, capability, normalizedQuery, productStatusFilterMode, sourceFilter, availableProjectIds, availableCapabilityKeys]
  );

  // Reset project selection if the selected project no longer exists.
  useEffect(() => {
    if (productFilters.projectId !== projectId) {
      setProjectId(productFilters.projectId);
    }
  }, [productFilters.projectId, projectId]);

  const browseView = useMemo(
    () => buildSkillBrowseView(skillLibrary.items, productFilters, productCapabilityById),
    [skillLibrary.items, productFilters, productCapabilityById]
  );

  // Clear selection when scope, project, or capability changes.
  const handleScopeChange = useCallback(
    (nextScope: SkillScopeFilter) => {
      if (nextScope === scope) return;
      markAiosPerf("skills-scope-request", { scope: nextScope });
      setScope(nextScope);
      setProjectId(ALL_PROJECTS_VALUE);
      setCapability(ALL_CAPABILITY_VALUE);
      setActiveGroupKey(null);
      setRenderedGroupKey(null);
      onClearSelection();
    },
    [scope, onClearSelection]
  );

  const handleProjectChange = useCallback(
    (nextProjectId: SkillProjectFilterValue) => {
      if (nextProjectId === projectId) return;
      markAiosPerf("skills-project-request", { projectId: nextProjectId });
      setProjectId(nextProjectId);
      setCapability(ALL_CAPABILITY_VALUE);
      setActiveGroupKey(null);
      setRenderedGroupKey(null);
      onClearSelection();
    },
    [projectId, onClearSelection]
  );

  const handleCapabilityChange = useCallback(
    (nextCapability: string) => {
      if (nextCapability === capability) return;
      markAiosPerf("skills-capability-request", { capability: nextCapability });
      setCapability(nextCapability as SkillCapabilityFilter);
      setActiveGroupKey(null);
      setRenderedGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [capability, onClearSelection, startGroupTransition]
  );

  const handleProductStatusFilterChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextMode: SkillStatusFilter | null) => {
      if (!nextMode || nextMode === productStatusFilterMode) return;
      markAiosPerf("skills-status-filter-request", { mode: nextMode });
      setProductStatusFilterMode(nextMode);
    },
    [productStatusFilterMode]
  );

  const handleSourceFilterChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextSource: string | null) => {
      if (!nextSource || nextSource === sourceFilter) return;
      markAiosPerf("skills-source-filter-request", { source: nextSource });
      setSourceFilter(nextSource);
    },
    [sourceFilter]
  );

  const handleClearSearch = useCallback(() => {
    onQueryChange?.("");
  }, [onQueryChange]);

  const handleResetFilters = useCallback(() => {
    setScope("all");
    setProjectId(ALL_PROJECTS_VALUE);
    setCapability(ALL_CAPABILITY_VALUE);
    setProductStatusFilterMode("all");
    setSourceFilter(SOURCE_FILTER_ALL);
    setActiveGroupKey(null);
    setRenderedGroupKey(null);
    onClearSelection();
  }, [onClearSelection]);

  const handleLegacyLibraryTabChange = useCallback(
    (nextValue: string) => {
      const nextTab = nextValue as SkillLibraryTab;
      if (nextTab === libraryTab) return;
      markAiosPerf("skills-library-tab-request", { mode: nextTab });
      setLibraryTab(nextTab);
      onClearSelection();
    },
    [libraryTab, onClearSelection]
  );

  const handleLegacyQualityFilterChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextMode: SkillStatusFilter | null) => {
      if (!nextMode || nextMode === legacyStatusFilterMode) return;
      markAiosPerf("skills-quality-filter-request", { mode: nextMode });
      setLegacyStatusFilterMode(nextMode);
      setActiveGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [legacyStatusFilterMode, onClearSelection, startGroupTransition]
  );

  const handleLegacyGroupChange = useCallback(
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

  // Clear selection if the selected Skill disappears due to search/status/source.
  useEffect(() => {
    if (!selectedId || !useProductLibrary) return;
    const stillVisible = browseView.groups.some((group) => group.rows.some((item) => `skill-library:${item.id}` === selectedId));
    if (!stillVisible) onClearSelection();
  }, [browseView.groups, onClearSelection, selectedId, useProductLibrary]);

  useEffect(() => {
    if (!normalizedQuery) return;
    setActiveGroupKey(null);
    setRenderedGroupKey(null);
  }, [normalizedQuery]);

  const activeFilterCount =
    (productStatusFilterMode !== "all" ? 1 : 0) + (sourceFilter !== SOURCE_FILTER_ALL ? 1 : 0);

  const productSkillListShell = (
    <Box className="skills-result-scroll" data-aios-internal-scroll="true" role="list">
      {browseView.groups.length === 0 ? (
        <SkillBrowseEmptyState reason={browseView.emptyReason} onClearSearch={handleClearSearch} onResetFilters={handleResetFilters} />
      ) : capability === "all" ? (
        browseView.groups.map((group) => (
          <Box key={group.key} className="skills-group" data-skill-group={group.key}>
            <Box className="skills-group-header">
              <Typography className="skills-group-title" component="h4">
                {group.title}
              </Typography>
              <Typography className="skills-group-count">{group.rows.length} 项</Typography>
            </Box>
            {group.summary && <Typography className="skills-group-description">{group.summary}</Typography>}
            <Box className="skills-group-list">
              {group.rows.map((item) => (
                <ProductSkillStaticRow key={item.id} item={item} selectedId={selectedId} onSelect={onSelect} />
              ))}
            </Box>
          </Box>
        ))
      ) : (
        <Box className="skills-group" data-skill-group={browseView.groups[0]?.key}>
          <Box className="skills-group-header">
            <Typography className="skills-group-title" component="h4">
              {browseView.groups[0]?.title ?? "技能"}
            </Typography>
            <Typography className="skills-group-count">{browseView.groups[0]?.rows.length ?? 0} 项</Typography>
          </Box>
          {browseView.groups[0]?.summary && (
            <Typography className="skills-group-description">{browseView.groups[0].summary}</Typography>
          )}
          <Box className="skills-group-list">
            {browseView.groups[0]?.rows.map((item) => (
              <ProductSkillStaticRow key={item.id} item={item} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </Box>
        </Box>
      )}
    </Box>
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

  const libraryTabOptions = useMemo(
    () => [
      { value: "groups", label: "分类浏览", count: groups.length },
      { value: "all", label: "全部技能", count: queryResultRows.length }
    ],
    [groups.length, queryResultRows.length]
  );

  const categoryRailOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.key,
        label: group.title,
        count: filteredRowsByGroupKey.get(group.key)?.length ?? 0
      })),
    [filteredRowsByGroupKey, groups]
  );

  const effectiveRenderedKey = renderedKey;
  const effectiveVisibleRowsCount = useProductLibrary ? browseView.totalCount : visibleRows.length;
  const effectiveTotalRowsCount = useProductLibrary
    ? skillLibrary.summary?.counts.dedupedSkillCount ?? browseView.totalCount
    : visibleRows.length;

  useEffect(() => {
    markAiosPerf("skills-rendered", {
      scope: useProductLibrary ? scope : "legacy",
      projectId: useProductLibrary ? projectId : "n/a",
      capability: useProductLibrary ? capability : "n/a",
      sourceView: useProductLibrary ? "skill-library-product" : "merged",
      statusFilter: useProductLibrary ? productStatusFilterMode : legacyStatusFilterMode,
      sourceFilter: useProductLibrary ? sourceFilter : "n/a",
      visible: effectiveVisibleRowsCount,
      total: useProductLibrary ? skillLibrary.items.length : skillRows.length,
      query: normalizedQuery ? "filtered" : "empty"
    });
  }, [
    browseView.totalCount,
    capability,
    effectiveVisibleRowsCount,
    legacyStatusFilterMode,
    normalizedQuery,
    productStatusFilterMode,
    projectId,
    scope,
    skillLibrary.items.length,
    skillRows.length,
    sourceFilter,
    useProductLibrary
  ]);

  if (useProductLibrary) {
    const projectSelectorVisible = scope === "project";
    const hasProjectOptions = browseView.projectOptions.length > 1;
    const activeGroupTitle = getActiveGroupTitle(browseView.groups, capability);
    const activeGroupSummary = getActiveGroupSummary(browseView.groups, capability);

    return (
      <Box className="module-surface skills-module" aria-label={moduleAriaLabel("skills")} data-aios-motion-surface>
        <Box className="skills-fixed-header" data-aios-layout-fixed>
          <Box className="skills-page-header">
            <Typography component="h2" className="skills-page-title">
              技能
            </Typography>
            <Typography className="skills-page-description">
              按任务和能力浏览已整理的 AI 技能，快速找到适合当前工作的技能。
            </Typography>
          </Box>
          <Box className="skills-scope-tabs" role="tablist" aria-label="技能范围">
            {browseView.scopeOptions.map((option) => {
              const active = option.value === scope;
              return (
                <ButtonBase
                  key={option.value}
                  className={["skills-scope-tab", active ? "Mui-selected" : ""].filter(Boolean).join(" ")}
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  onClick={() => handleScopeChange(option.value as SkillScopeFilter)}
                >
                  <Typography component="span">{option.label}</Typography>
                  <Chip label={`${option.count} 项`} size="small" variant={active ? "filled" : "outlined"} />
                </ButtonBase>
              );
            })}
          </Box>
          {projectSelectorVisible && (
            <Box className="skills-project-bar">
              {hasProjectOptions ? (
                <FormControl size="small" className="skills-project-select">
                  <InputLabel id="skills-project-selector-label">项目</InputLabel>
                  <Select
                    labelId="skills-project-selector-label"
                    value={projectId}
                    label="项目"
                    onChange={(event) => handleProjectChange(event.target.value as SkillProjectFilterValue)}
                  >
                    {browseView.projectOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <FormControl size="small" className="skills-project-select" disabled>
                  <InputLabel id="skills-project-selector-label">项目</InputLabel>
                  <Select labelId="skills-project-selector-label" value={ALL_PROJECTS_VALUE} label="项目">
                    <MenuItem value={ALL_PROJECTS_VALUE}>暂无已登记项目</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Box>
          )}
        </Box>
        <Box className="module-scroll skills-module-scroll">
          <Box className="skills-layout">
            <CapabilityNavigation
              ariaLabel="能力分类"
              capability={capability}
              isNarrow={isNarrow}
              options={browseView.categoryOptions}
              onChange={handleCapabilityChange}
            />
            <Box className="skills-result-panel">
              <AiosSectionHeader
                title={activeGroupTitle}
                summary={activeGroupSummary}
                count={browseView.totalCount}
                action={
                  <Button
                    className="skills-more-filters-button"
                    size="small"
                    variant="outlined"
                    startIcon={<FilterListRounded />}
                    aria-expanded={showMoreFilters}
                    aria-controls="skills-secondary-filters"
                    onClick={() => setShowMoreFilters((prev) => !prev)}
                  >
                    {activeFilterCount > 0 ? `更多筛选 · ${activeFilterCount}` : "更多筛选"}
                  </Button>
                }
              />
              {showMoreFilters && (
                <Box className="skills-filter-panel" id="skills-secondary-filters" role="region" aria-label="更多筛选">
                  <Box className="skills-filter-panel-row">
                    <ToggleButtonGroup
                      aria-label="状态筛选"
                      className="skill-filter-toggle"
                      exclusive
                      size="small"
                      value={productStatusFilterMode}
                      onChange={handleProductStatusFilterChange}
                    >
                      {skillStatusFilterOptions.map((option) => (
                        <ToggleButton key={option.value} value={option.value}>
                          {option.label}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                    {productSourceOptions.length > 1 && (
                      <ToggleButtonGroup
                        aria-label="来源筛选"
                        className="skill-filter-toggle skill-filter-source-controls"
                        exclusive
                        size="small"
                        value={sourceFilter}
                        onChange={handleSourceFilterChange}
                      >
                        <ToggleButton value={SOURCE_FILTER_ALL}>全部来源</ToggleButton>
                        {productSourceOptions.map((source) => (
                          <ToggleButton key={source} value={source}>
                            {source}
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    )}
                    <Button className="skills-filter-reset" size="small" onClick={handleResetFilters}>
                      重置筛选
                    </Button>
                  </Box>
                </Box>
              )}
              {productSkillListShell}
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <AiosModuleFrame
      className="skills-module"
      contentClassName="skills-module-scroll"
      view="skills"
      summary={moduleEmptyStateCopy("skills").body}
      count={effectiveTotalRowsCount}
      ariaLabel={moduleAriaLabel("skills")}
      motionKey={`skills:legacy:${libraryTab}:${legacyStatusFilterMode}:${effectiveRenderedKey ?? "none"}:${effectiveVisibleRowsCount}:${normalizedQuery ? "query" : "all"}`}
      disableHoverMotion
    >
      <Box className="skill-library-toolbar" data-aios-layout-fixed>
        <Box className="skill-filter-row">
          <Box className="skill-filter-primary-controls">
            <AiosSegmentedSwitcher ariaLabel="技能浏览方式" options={libraryTabOptions} value={libraryTab} onChange={handleLegacyLibraryTabChange} />
            <ToggleButtonGroup aria-label="技能筛选" className="skill-filter-toggle" exclusive size="small" value={legacyStatusFilterMode} onChange={handleLegacyQualityFilterChange}>
              {fallbackSkillStatusFilterOptions.map((option) => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        </Box>
        <Box className="skill-filter-search-state">
          <SearchRounded fontSize="small" />
          <Typography color="text.secondary" variant="body2" noWrap>
            {normalizedQuery ? `当前搜索：${normalizedQuery}` : "使用顶部搜索框筛选技能名称和用途。"}
          </Typography>
        </Box>
      </Box>
      {libraryTab === "groups" && groups.length > 0 ? (
        <Box className="aios-two-pane" data-aios-motion-surface>
          <AiosSectionRail ariaLabel="技能分类" options={categoryRailOptions} value={activeKey ?? ""} onChange={handleLegacyGroupChange} disableItemHover className="skills-capability-rail" />
          <SkillListPanel count={effectiveVisibleRowsCount} summary={activeGroup?.summary || "探索本地只读技能元数据。"} title={activeGroup?.title ?? "技能库"}>
            {skillListShell}
          </SkillListPanel>
        </Box>
      ) : (
        <SkillListPanel count={effectiveVisibleRowsCount} summary={activeGroup?.summary || "探索本地只读技能元数据。"} title={activeGroup?.title ?? "技能库"}>
          {skillListShell}
        </SkillListPanel>
      )}
    </AiosModuleFrame>
  );
});

function CapabilityNavigation({
  ariaLabel,
  capability,
  isNarrow,
  options,
  onChange
}: {
  ariaLabel: string;
  capability: SkillCapabilityFilter;
  isNarrow: boolean;
  options: Array<{ value: string; label: string; count: number; icon?: ReactElement }>;
  onChange: (value: string) => void;
}) {
  const optionsWithIcons = useMemo(
    () =>
      options.map((option) => {
        const key = option.value as SkillCapabilityCategoryKey | "all";
        const Icon = key === "all" ? SearchRounded : CAPABILITY_ICONS[key as SkillCapabilityCategoryKey] ?? HelpOutlineRounded;
        return { ...option, icon: <Icon fontSize="small" /> };
      }),
    [options]
  );

  if (isNarrow) {
    return (
      <FormControl size="small" className="skills-capability-select" fullWidth>
        <InputLabel id="skills-capability-select-label">能力分类</InputLabel>
        <Select
          labelId="skills-capability-select-label"
          value={capability}
          label="能力分类"
          onChange={(event) => onChange(event.target.value as string)}
        >
          {optionsWithIcons.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Box className="skill-capability-select-item">
                {option.icon}
                <Typography component="span">{option.label}</Typography>
                <Chip label={`${option.count} 项`} size="small" variant="outlined" />
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return <AiosSectionRail ariaLabel={ariaLabel} options={optionsWithIcons} value={capability} onChange={onChange} disableItemHover className="skills-capability-rail" />;
}

function SkillListPanel({ children, count, summary, title }: { children: ReactElement; count: number; summary: string; title: string }) {
  return (
    <Box className="skill-list-panel" data-aios-motion-surface>
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

function SkillBrowseEmptyState({
  reason,
  onClearSearch,
  onResetFilters
}: {
  reason: SkillBrowseEmptyReason;
  onClearSearch?: () => void;
  onResetFilters?: () => void;
}) {
  const copy = getSkillBrowseEmptyStateCopy(reason);
  return (
    <ModuleEmptyState
      title={copy.title}
      body={copy.body}
      hints={[
        ...(onClearSearch ? ["可清除搜索恢复全部列表。"] : []),
        ...(onResetFilters ? ["可重置筛选查看所有状态。"] : [])
      ]}
    />
  );
}

function ProductSkillStaticRow({
  item,
  selectedId,
  onSelect
}: {
  item: SkillListItem;
  selectedId: string | null;
  onSelect: AiosModuleProps["onSelect"];
}): ReactElement {
  return (
    <ProductSkillRow
      item={item}
      selectedId={selectedId}
      onSelect={(selectedResource, context) => onSelect(selectedResource, { ...context, skillListItem: item })}
    />
  );
}

function getActiveGroupTitle(groups: ProductSkillGroup[], capability: SkillCapabilityFilter): string {
  if (capability === "all") return "全部能力";
  return groups.find((group) => group.key === capability)?.title ?? "技能库";
}

function getActiveGroupSummary(groups: ProductSkillGroup[], capability: SkillCapabilityFilter): string {
  if (groups.length === 0) return "当前筛选条件下没有可显示的技能。";
  if (capability !== "all") return groups[0]?.summary ?? "";
  return `按能力分类显示 ${groups.length} 个分组。`;
}

function groupSkillLibraryItemsByCapability(
  rows: SkillIdentityRow[],
  skillCapabilityById: ReadonlyMap<string, { primaryCategory: { key: SkillCapabilityCategoryKey } }>
): SkillGroup[] {
  const rowsByCategory = new Map<SkillCapabilityCategoryKey, SkillIdentityRow[]>(SKILL_CAPABILITY_CATEGORIES.map((category) => [category.key, []]));

  for (const row of rows) {
    const categoryKey = skillCapabilityById.get(row.primaryResource.id)?.primaryCategory.key ?? "unknown";
    const categoryRows = rowsByCategory.get(categoryKey) ?? rowsByCategory.get("unknown");
    categoryRows?.push(row);
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
