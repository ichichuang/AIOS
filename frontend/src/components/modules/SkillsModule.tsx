import { Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { List } from "react-window";
import { zhCN } from "../../i18n/zh-CN";
import { filterResourceList } from "../../lib/filtering";
import { markAiosPerf } from "../../lib/perf";
import { useVisibleCardRevealMotion } from "../../lib/useAiosMotion";
import type { AiosResource } from "../../types/inventory";
import { CompactSkillRow, type CompactSkillRowProps } from "../resources/CompactSkillRow";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

interface SkillGroupDefinition {
  key: string;
  title: string;
  summary: string;
  predicate: (resource: AiosResource) => boolean;
}

interface SkillGroup {
  key: string;
  title: string;
  summary: string;
  resources: AiosResource[];
}

const ROW_HEIGHT = 92;
const skillGroupDefinitions: SkillGroupDefinition[] = [
  { key: "codex-entrypoints", title: "Codex 入口", summary: "Codex 活跃技能入口，仅显示元数据。", predicate: (resource) => resource.toolType === "codex" },
  { key: "agents-entrypoints", title: "Agents 入口", summary: "Agents 兼容入口，仅显示元数据。", predicate: (resource) => resource.toolType === "agents" },
  { key: "claude-entrypoints", title: "Claude 入口", summary: "Claude 技能视图，保留原始技能名。", predicate: (resource) => resource.toolType === "claude" },
  { key: "project-local-packs", title: "项目本地包", summary: "项目本地技能包和仓库内资源入口。", predicate: (resource) => resource.toolType === "project-local" || resource.capabilityType === "project-pack" },
  { key: "registry-routing", title: "注册表与路由", summary: "自定义技能注册表、路由器和索引入口。", predicate: (resource) => resource.capabilityType === "registry" || resource.name.includes("router") },
  { key: "runtime-views", title: "运行时视图", summary: "运行时生成的入口视图和技能映射。", predicate: (resource) => resource.capabilityType === "runtime-view" }
];

export const SkillsModule = memo(function SkillsModule({ query, resources, selectedId, onClearSelection, onSelect }: AiosModuleProps) {
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const [renderedGroupKey, setRenderedGroupKey] = useState<string | null>(null);
  const [, startGroupTransition] = useTransition();
  const listRef = useRef<HTMLElement>(null);
  const groups = useMemo(() => groupSkillResources(resources), [resources]);
  const defaultGroupKey = groups[0]?.key ?? null;
  const activeKey = getValidGroupKey(groups, activeGroupKey) ?? defaultGroupKey;
  const renderedKey = getValidGroupKey(groups, renderedGroupKey) ?? activeKey;
  const activeGroup = groups.find((group) => group.key === renderedKey) ?? groups[0] ?? null;
  const visibleResources = useMemo(() => (activeGroup ? filterResourceList(activeGroup.resources, query) : []), [activeGroup, query]);
  const rowProps = useMemo<CompactSkillRowProps>(() => ({ resources: visibleResources, selectedId, onSelect }), [onSelect, selectedId, visibleResources]);
  const motionKey = `${renderedKey ?? "empty"}:${visibleResources.map((resource) => resource.id).join("|")}`;
  useVisibleCardRevealMotion(listRef, motionKey, "[data-motion='compact-skill-row']");

  const handleGroupChange = useCallback(
    (key: string) => {
      markAiosPerf("skills-group-request", { group: key });
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
      visible: visibleResources.length,
      total: resources.length,
      query: query.trim() ? "filtered" : "empty"
    });
  }, [query, renderedKey, resources.length, visibleResources.length]);

  return (
    <Box className="module-surface skills-module" component="section" aria-label={moduleAriaLabel("skills")}>
      <ModuleHeader view="skills" summary={zhCN.moduleSummaries.skills} count={resources.length}>
        <Chip label="仅显示元数据" variant="outlined" />
        <Chip label="提示词在检查器复制" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll skills-module-scroll">
        {groups.length === 0 ? (
          <ModuleEmptyState />
        ) : (
          <>
            <Box className="skill-group-index" role="tablist" aria-label="技能来源分组">
              {groups.map((group) => (
                <SkillGroupButton key={group.key} active={group.key === activeKey} group={group} onSelect={handleGroupChange} />
              ))}
            </Box>
            <Box className="compact-skill-list-shell" ref={listRef}>
              <Stack className="active-skill-group-heading" direction="row" sx={{ alignItems: "center", gap: 1, justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h2" variant="h3">
                    {activeGroup?.title ?? "技能分组"}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {activeGroup?.summary ?? "仅展示本地只读技能元数据。"}
                  </Typography>
                </Box>
                <Chip label={`${visibleResources.length} / ${activeGroup?.resources.length ?? 0} 项`} variant="outlined" />
              </Stack>
              {visibleResources.length === 0 ? (
                <ModuleEmptyState />
              ) : (
                <List
                  className="compact-skill-window"
                  defaultHeight={ROW_HEIGHT * Math.min(visibleResources.length, 8)}
                  overscanCount={4}
                  rowComponent={CompactSkillRow}
                  rowCount={visibleResources.length}
                  rowHeight={ROW_HEIGHT}
                  rowProps={rowProps}
                  style={{ height: "100%", width: "100%" }}
                />
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
});

interface SkillGroupButtonProps {
  active: boolean;
  group: SkillGroup;
  onSelect: (key: string) => void;
}

const SkillGroupButton = memo(function SkillGroupButton({ active, group, onSelect }: SkillGroupButtonProps) {
  const handleClick = useCallback(() => onSelect(group.key), [group.key, onSelect]);

  return (
    <ButtonBase className={active ? "skill-group-button active" : "skill-group-button"} role="tab" aria-selected={active} onClick={handleClick}>
      <Typography component="strong">{group.title}</Typography>
      <Typography color="text.secondary" component="span">
        {group.summary}
      </Typography>
      <Chip label={`${group.resources.length} 项`} variant={active ? "filled" : "outlined"} />
    </ButtonBase>
  );
});

function groupSkillResources(resources: AiosResource[]): SkillGroup[] {
  const assigned = new Set<string>();
  const groups = skillGroupDefinitions
    .map((definition) => {
      const groupResources = resources.filter((resource) => {
        const matched = definition.predicate(resource);
        if (matched) assigned.add(resource.id);
        return matched;
      });
      return { key: definition.key, title: definition.title, summary: definition.summary, resources: groupResources };
    })
    .filter((group) => group.resources.length > 0);

  const otherResources = resources.filter((resource) => !assigned.has(resource.id));
  if (otherResources.length > 0) {
    groups.push({
      key: "other-skills",
      title: "其他技能",
      summary: "其他规范技能元数据，按需打开检查器。",
      resources: otherResources
    });
  }

  return groups;
}

function getValidGroupKey(groups: SkillGroup[], key: string | null): string | null {
  return key && groups.some((group) => group.key === key) ? key : null;
}
