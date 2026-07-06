import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { memo, useCallback, useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";
import { List } from "react-window";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { markAiosPerf } from "../../lib/perf";
import { buildSkillCapabilitySearchTextMap, SKILL_CAPABILITY_CATEGORIES, type SkillCapabilityCategoryKey } from "../../lib/skillCapabilityClassifier";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import { buildSkillIdentityRows, filterSkillIdentityRows, type SkillIdentityRow } from "../../lib/skillIdentityModel";
import { CompactSkillRow, type CompactSkillRowProps } from "../resources/CompactSkillRow";
import { AiosAccordionPanel, AiosModuleFrame, AiosSectionRail, AiosSegmentedSwitcher } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

type SkillQualityFilterMode = "all" | "needs-work";
type SkillLibraryTab = "groups" | "all";

interface SkillGroup {
  key: string;
  title: string;
  summary: string;
  rows: SkillIdentityRow[];
}

const ROW_HEIGHT = 108;

export const SkillsModule = memo(function SkillsModule({ displayById, query, resources, selectedId, skillCapabilityById, onClearSelection, onSelect }: AiosModuleProps) {
  const [libraryTab, setLibraryTab] = useState<SkillLibraryTab>("groups");
  const [qualityFilterMode, setQualityFilterMode] = useState<SkillQualityFilterMode>("all");
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [renderedGroupKey, setRenderedGroupKey] = useState<string | null>(null);
  const [, startGroupTransition] = useTransition();
  const normalizedQuery = query.trim();
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
          filterSkillIdentityRows(group.rows, query, { displayById, capabilitySearchTextById }).filter((row) => shouldIncludeQualityRow(row, qualityFilterMode, enrichmentByRowId))
        ])
      ),
    [capabilitySearchTextById, displayById, enrichmentByRowId, groups, qualityFilterMode, query]
  );
  const defaultGroupKey = groups[0]?.key ?? null;
  const queryActive = normalizedQuery.length > 0;
  const firstMatchingGroupKey = queryActive ? groups.find((group) => (filteredRowsByGroupKey.get(group.key)?.length ?? 0) > 0)?.key ?? null : null;
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
  const rowProps = useMemo<CompactSkillRowProps>(() => ({ rows: visibleRows, selectedId, skillCapabilityById, showCapability: true, onSelect }), [onSelect, selectedId, skillCapabilityById, visibleRows]);

  const libraryTabOptions = useMemo(
    () => [
      { value: "groups", label: "分类浏览", count: groups.length },
      { value: "all", label: "全部技能", count: queryResultRows.length }
    ],
    [groups.length, queryResultRows.length]
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
    (_event: MouseEvent<HTMLElement>, nextMode: SkillQualityFilterMode | null) => {
      if (!nextMode || nextMode === qualityFilterMode) return;
      markAiosPerf("skills-quality-filter-request", { mode: nextMode });
      setQualityFilterMode(nextMode);
      setActiveGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [onClearSelection, qualityFilterMode, startGroupTransition]
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

  useEffect(() => {
    markAiosPerf("skills-rendered", {
      group: renderedKey ?? "empty",
      mode: "capability",
      sourceView: "merged",
      qualityFilter: qualityFilterMode,
      visible: visibleRows.length,
      total: skillRows.length,
      query: normalizedQuery ? "filtered" : "empty"
    });
  }, [normalizedQuery, qualityFilterMode, renderedKey, skillRows.length, visibleRows.length]);

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
  const emptyCopy = moduleEmptyStateCopy("skills");
  const skillListShell = (
    <Box className="compact-skill-list-shell" data-aios-internal-scroll="true">
      {visibleRows.length === 0 ? (
        <ModuleEmptyState {...emptyCopy} />
      ) : (
        <List
          className="compact-skill-window"
          defaultHeight={ROW_HEIGHT * Math.min(visibleRows.length, 8)}
          overscanCount={4}
          rowComponent={CompactSkillRow}
          rowCount={visibleRows.length}
          rowHeight={ROW_HEIGHT}
          rowProps={rowProps}
          style={{ height: "100%", width: "100%" }}
        />
      )}
    </Box>
  );

  return (
    <AiosModuleFrame
      className="skills-module"
      contentClassName="skills-module-scroll"
      view="skills"
      summary={zhCN.moduleSummaries.skills}
      count={visibleRows.length}
      ariaLabel={moduleAriaLabel("skills")}
      motionKey={`skills:${libraryTab}:${qualityFilterMode}:${renderedKey ?? "none"}:${visibleRows.length}:${normalizedQuery ? "query" : "all"}`}
    >
      <Box className="skill-library-toolbar" data-aios-layout-fixed>
        <Box className="skill-filter-row">
          <AiosSegmentedSwitcher ariaLabel="技能浏览方式" options={libraryTabOptions} value={libraryTab} onChange={handleLibraryTabChange} />
          <ToggleButtonGroup
            aria-label="技能筛选"
            className="skill-filter-toggle"
            exclusive
            size="small"
            value={qualityFilterMode}
            onChange={handleQualityFilterChange}
          >
            <ToggleButton value="all">全部</ToggleButton>
            <ToggleButton value="needs-work">需补全</ToggleButton>
          </ToggleButtonGroup>
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
          <AiosSectionRail
            ariaLabel="技能分类"
            options={categoryRailOptions}
            value={activeKey ?? ""}
            onChange={handleGroupChange}
          />
          <AiosAccordionPanel className="skill-list-accordion" count={visibleRows.length} summary={activeGroup?.summary || "探索本地只读技能元数据。"} title={activeGroup?.title ?? "技能库"}>
            {skillListShell}
          </AiosAccordionPanel>
        </Box>
      ) : (
        <AiosAccordionPanel className="skill-list-accordion" count={visibleRows.length} summary={activeGroup?.summary || "探索本地只读技能元数据。"} title={activeGroup?.title ?? "技能库"}>
          {skillListShell}
        </AiosAccordionPanel>
      )}
    </AiosModuleFrame>
  );
});

function groupSkillRowsByCapability(rows: SkillIdentityRow[], skillCapabilityById: ReadonlyMap<string, { primaryCategory: { key: SkillCapabilityCategoryKey } }>): SkillGroup[] {
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

function getValidGroupKey(groups: SkillGroup[], key: string | null): string | null {
  return key && groups.some((group) => group.key === key) ? key : null;
}

function shouldIncludeQualityRow(row: SkillIdentityRow, mode: SkillQualityFilterMode, enrichmentByRowId: ReadonlyMap<string, { qualityLevel: string }>): boolean {
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
