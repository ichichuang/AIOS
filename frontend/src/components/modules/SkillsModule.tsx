import { Box, Button, ButtonBase, Chip, Popover, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { memo, useCallback, useEffect, useMemo, useState, useTransition, type MouseEvent } from "react";
import { List } from "react-window";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { markAiosPerf } from "../../lib/perf";
import { buildSkillCapabilitySearchTextMap, SKILL_CAPABILITY_CATEGORIES, type SkillCapabilityCategoryKey } from "../../lib/skillCapabilityClassifier";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import { buildSkillIdentityRows, buildSkillSourceRows, filterSkillIdentityRows, type SkillIdentityRow } from "../../lib/skillIdentityModel";
import { CompactSkillRow, type CompactSkillRowProps } from "../resources/CompactSkillRow";
import { AiosModuleFrame, AiosPillRail } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

type SkillGroupingMode = "capability" | "source";
type SkillSourceViewMode = "merged" | "source";
type SkillQualityFilterMode = "all" | "needs-work";

interface SourceSkillGroupDefinition {
  key: string;
  title: string;
  summary: string;
  predicate: (row: SkillIdentityRow) => boolean;
}

interface SkillGroup {
  key: string;
  title: string;
  summary: string;
  rows: SkillIdentityRow[];
}

const ROW_HEIGHT = 124;
const sourceSkillGroupDefinitions: SourceSkillGroupDefinition[] = [
  { key: "active-entrypoints", title: "活跃入口", summary: "Codex、Agents、Claude 当前可见入口元数据。", predicate: (row) => hasAnySourceBadge(row, ["codex", "agents", "claude"]) },
  { key: "distilled-skills", title: "蒸馏技能", summary: "女娲、persona 或 perspective 相关技能元数据。", predicate: hasDistillationSignal },
  { key: "archived-skills", title: "归档技能", summary: "路径或注册表标记为 archive、disabled、deprecated 的技能。", predicate: (row) => row.sources.some((source) => source.metadata?.archived === true) },
  { key: "filesystem-skills", title: "文件系统发现", summary: "通过有界 SKILL.md 遍历发现，未执行技能正文。", predicate: (row) => hasSourceBadge(row, "filesystem") },
  { key: "registry-skills", title: "Registry 技能", summary: "custom-skill-registry.json 中的单项技能记录。", predicate: (row) => hasSourceBadge(row, "custom-registry") },
  { key: "indexed-skills", title: "索引技能", summary: "SKILLS_INDEX.json 中的规范共享技能。", predicate: (row) => hasSourceBadge(row, "skills-index") },
  { key: "project-local-packs", title: "项目本地包", summary: "项目本地技能包和仓库内资源入口。", predicate: (row) => hasSourceBadge(row, "project-pack") },
  { key: "registry-routing", title: "注册表与路由", summary: "自定义技能注册表、路由器和索引入口。", predicate: (row) => row.primaryResource.capabilityType === "registry" || row.primaryResource.name.includes("router") },
  { key: "runtime-views", title: "运行时视图", summary: "运行时生成的入口视图和技能映射。", predicate: (row) => row.mode === "source" && row.primaryResource.capabilityType === "runtime-view" }
];

export const SkillsModule = memo(function SkillsModule({ displayById, query, resourceCorpus, resources, selectedId, skillCapabilityById, onClearSelection, onSelect }: AiosModuleProps) {
  const [groupingMode, setGroupingMode] = useState<SkillGroupingMode>("capability");
  const [sourceViewMode, setSourceViewMode] = useState<SkillSourceViewMode>("merged");
  const [qualityFilterMode, setQualityFilterMode] = useState<SkillQualityFilterMode>("all");
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [renderedGroupKey, setRenderedGroupKey] = useState<string | null>(null);
  const [, startGroupTransition] = useTransition();
  const normalizedQuery = query.trim();
  const capabilitySearchTextById = useMemo(() => buildSkillCapabilitySearchTextMap(skillCapabilityById), [skillCapabilityById]);
  const skillRows = useMemo(() => (sourceViewMode === "merged" ? buildSkillIdentityRows(resources) : buildSkillSourceRows(resources)), [resources, sourceViewMode]);
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
  const groups = useMemo(
    () => (groupingMode === "capability" ? groupSkillRowsByCapability(skillRows, skillCapabilityById) : groupSkillRowsBySource(skillRows)),
    [groupingMode, skillCapabilityById, skillRows]
  );
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
        summary: "跨当前技能分组显示所有匹配的技能身份行。",
        rows: skillRows
      }
    : renderedGroup;
  const visibleRows = useMemo(() => {
    if (queryActive) return queryResultRows;
    return renderedGroup ? filteredRowsByGroupKey.get(renderedGroup.key) ?? [] : [];
  }, [filteredRowsByGroupKey, queryActive, queryResultRows, renderedGroup]);
  const rowProps = useMemo<CompactSkillRowProps>(
    () => ({ rows: visibleRows, selectedId, skillCapabilityById, showCapability: groupingMode === "capability", onSelect }),
    [groupingMode, onSelect, selectedId, skillCapabilityById, visibleRows]
  );

  const handleGroupingModeChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextMode: SkillGroupingMode | null) => {
      if (!nextMode || nextMode === groupingMode) return;
      markAiosPerf("skills-group-mode-request", { mode: nextMode });
      setGroupingMode(nextMode);
      setActiveGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [groupingMode, onClearSelection, startGroupTransition]
  );

  const handleSourceViewModeChange = useCallback(
    (_event: MouseEvent<HTMLElement>, nextMode: SkillSourceViewMode | null) => {
      if (!nextMode || nextMode === sourceViewMode) return;
      markAiosPerf("skills-source-view-request", { mode: nextMode });
      setSourceViewMode(nextMode);
      setActiveGroupKey(null);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(null);
      });
    },
    [onClearSelection, sourceViewMode, startGroupTransition]
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
      markAiosPerf("skills-group-request", { group: key, mode: groupingMode });
      setActiveGroupKey(key);
      onClearSelection();
      startGroupTransition(() => {
        setRenderedGroupKey(key);
      });
    },
    [groupingMode, onClearSelection, startGroupTransition]
  );

  useEffect(() => {
    markAiosPerf("skills-rendered", {
      group: renderedKey ?? "empty",
      mode: groupingMode,
      sourceView: sourceViewMode,
      qualityFilter: qualityFilterMode,
      visible: visibleRows.length,
      total: skillRows.length,
      query: normalizedQuery ? "filtered" : "empty"
    });
  }, [groupingMode, normalizedQuery, qualityFilterMode, renderedKey, skillRows.length, sourceViewMode, visibleRows.length]);

  useEffect(() => {
    if (!normalizedQuery) return;
    setActiveGroupKey(null);
    setRenderedGroupKey(null);
  }, [normalizedQuery]);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const handleToggleOptions = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseOptions = () => {
    setAnchorEl(null);
  };
  const showOptions = Boolean(anchorEl);

  return (
    <AiosModuleFrame
      className="skills-module"
      contentClassName="skills-module-scroll"
      view="skills"
      summary={zhCN.moduleSummaries.skills}
      count={visibleRows.length}
      ariaLabel={moduleAriaLabel("skills")}
      actions={
        <>
        <ResourceCorpusIndicator state={resourceCorpus} />
        {qualityFilterMode === "needs-work" && (
          <Chip
            color="warning"
            label="仅看需补全"
            variant="filled"
            onDelete={() => {
              markAiosPerf("skills-quality-filter-request", { mode: "all" });
              setQualityFilterMode("all");
              setActiveGroupKey(null);
              onClearSelection();
              startGroupTransition(() => {
                setRenderedGroupKey(null);
              });
            }}
          />
        )}
        <Button
          className="module-option-button"
          size="small"
          variant="outlined"
          startIcon={<TuneRounded fontSize="small" />}
          onClick={handleToggleOptions}
        >
          视图选项
        </Button>
        </>
      }
    >
        {groups.length === 0 ? (
          <ModuleEmptyState />
        ) : (
          <>
            <Popover
              open={showOptions}
              anchorEl={anchorEl}
              onClose={handleCloseOptions}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              slotProps={{
                paper: {
                  className: "skill-options-popover-paper"
                }
              }}
            >
              <Box className="skill-group-toolbar">
                <Box className="skill-option-field">
                  <Typography variant="caption" color="text.secondary">分组模式</Typography>
                  <ToggleButtonGroup
                    aria-label="技能分组模式"
                    className="skill-grouping-switch"
                    exclusive
                    size="small"
                    value={groupingMode}
                    onChange={handleGroupingModeChange}
                    fullWidth
                  >
                    <ToggleButton value="capability">按能力</ToggleButton>
                    <ToggleButton value="source">按来源</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box className="skill-option-field">
                  <Typography variant="caption" color="text.secondary">来源显示</Typography>
                  <ToggleButtonGroup
                    aria-label="技能来源显示模式"
                    className="skill-grouping-switch"
                    exclusive
                    size="small"
                    value={sourceViewMode}
                    onChange={handleSourceViewModeChange}
                    fullWidth
                  >
                    <ToggleButton value="merged">合并来源</ToggleButton>
                    <ToggleButton value="source">显示入口视图</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
                <Box className="skill-option-field">
                  <Typography variant="caption" color="text.secondary">质量筛选</Typography>
                  <ToggleButtonGroup
                    aria-label="技能质量筛选"
                    className="skill-grouping-switch"
                    exclusive
                    size="small"
                    value={qualityFilterMode}
                    onChange={handleQualityFilterChange}
                    fullWidth
                  >
                    <ToggleButton value="all">全部</ToggleButton>
                    <ToggleButton value="needs-work">需补全</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Popover>
            <AiosPillRail className="skill-group-index horizontal-rail" label={groupingMode === "capability" ? "技能能力分组" : "技能来源分组"}>
              {groups.map((group) => (
                <SkillGroupButton
                  key={group.key}
                  active={group.key === activeKey}
                  filteredCount={filteredRowsByGroupKey.get(group.key)?.length ?? 0}
                  group={group}
                  mode={groupingMode}
                  queryActive={queryActive}
                  onSelect={handleGroupChange}
                />
              ))}
            </AiosPillRail>
            {activeGroup && (
              <Box className="selected-category-summary-row">
                <Typography color="text.secondary" variant="body2" noWrap>
                  {activeGroup.summary || "探索本地只读技能元数据。"}
                </Typography>
              </Box>
            )}
            <Box className="compact-skill-list-shell">
              {visibleRows.length === 0 ? (
                <ModuleEmptyState />
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
          </>
        )}
    </AiosModuleFrame>
  );
});

interface SkillGroupButtonProps {
  active: boolean;
  filteredCount: number;
  group: SkillGroup;
  mode: SkillGroupingMode;
  queryActive: boolean;
  onSelect: (key: string) => void;
}

const SkillGroupButton = memo(function SkillGroupButton({ active, filteredCount, group, mode, queryActive, onSelect }: SkillGroupButtonProps) {
  const handleClick = useCallback(() => onSelect(group.key), [group.key, onSelect]);
  const countLabel = queryActive ? `${filteredCount} / ${group.rows.length}` : `${group.rows.length}`;

  return (
    <ButtonBase className={["skill-group-button", mode, active ? "active" : ""].filter(Boolean).join(" ")} role="tab" aria-selected={active} onClick={handleClick}>
      <Typography component="strong">{group.title}</Typography>
      <Chip className="skill-group-count" label={countLabel} variant={active ? "filled" : "outlined"} size="small" />
    </ButtonBase>
  );
});

function groupSkillRowsBySource(rows: SkillIdentityRow[]): SkillGroup[] {
  const assigned = new Set<string>();
  const groups = sourceSkillGroupDefinitions
    .map((definition) => {
      const groupRows = rows.filter((row) => {
        const matched = definition.predicate(row);
        if (matched) assigned.add(row.id);
        return matched;
      });
      return { key: definition.key, title: definition.title, summary: definition.summary, rows: groupRows };
    })
    .filter((group) => group.rows.length > 0);

  const otherRows = rows.filter((row) => !assigned.has(row.id));
  if (otherRows.length > 0) {
    groups.push({
      key: "other-skills",
      title: "其他技能",
      summary: "其他规范技能元数据，按需打开检查器。",
      rows: otherRows
    });
  }

  return groups;
}

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

function hasSourceBadge(row: SkillIdentityRow, key: string): boolean {
  return row.sourceBadges.some((badge) => badge.key === key);
}

function hasAnySourceBadge(row: SkillIdentityRow, keys: string[]): boolean {
  return keys.some((key) => hasSourceBadge(row, key));
}

function hasDistillationSignal(row: SkillIdentityRow): boolean {
  return row.inheritedAliases.length > 0 || row.sources.some((source) => source.metadata?.distillationRelated === true);
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
