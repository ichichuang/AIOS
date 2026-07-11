import { classifySkillListItem, SKILL_CAPABILITY_CATEGORIES, type SkillCapabilityCategoryKey } from "./skillCapabilityClassifier";
import type { SkillListItem, SkillStatus, SkillStatusFilter } from "./skillLibrary";

export type SkillScopeFilter = "all" | "global" | "project" | "unknown";
export type SkillProjectFilterValue = "allProjects" | string;
export type SkillCapabilityFilter = "all" | SkillCapabilityCategoryKey;

export interface SkillBrowseFilters {
  scope: SkillScopeFilter;
  projectId: SkillProjectFilterValue;
  query: string;
  status: SkillStatusFilter;
  source: string;
  capability: SkillCapabilityFilter;
}

export interface SkillProjectOption {
  value: SkillProjectFilterValue;
  label: string;
}

export interface SkillScopeOption {
  value: SkillScopeFilter;
  label: string;
  count: number;
}

export interface SkillCategoryOption {
  value: SkillCapabilityFilter;
  label: string;
  count: number;
}

export interface SkillBrowseGroup {
  key: SkillCapabilityCategoryKey;
  title: string;
  summary: string;
  rows: SkillListItem[];
}

export interface SkillBrowseView {
  scopeOptions: SkillScopeOption[];
  projectOptions: SkillProjectOption[];
  categoryOptions: SkillCategoryOption[];
  groups: SkillBrowseGroup[];
  totalCount: number;
  emptyReason: SkillBrowseEmptyReason;
  selectedCapability: SkillCapabilityFilter;
}

export type SkillBrowseEmptyReason =
  | "no-skills"
  | "no-global"
  | "no-projects"
  | "no-selected-project"
  | "no-unknown"
  | "no-capability"
  | "search";

interface ClassifiedItem {
  item: SkillListItem;
  primaryKey: SkillCapabilityCategoryKey;
}

const SCOPE_STORAGE_KEY = "aios.skills.scope";
const PROJECT_STORAGE_KEY = "aios.skills.project";
const CAPABILITY_STORAGE_KEY = "aios.skills.capability";

const ALL_PROJECTS_VALUE: SkillProjectFilterValue = "allProjects";
const ALL_CAPABILITY_VALUE: SkillCapabilityFilter = "all";
const UNKNOWN_CATEGORY_KEY: SkillCapabilityCategoryKey = "unknown";

const STATUS_RANK: Record<SkillStatus, number> = {
  available: 0,
  duplicate: 1,
  unchecked: 2,
  sourceUnknown: 3,
  needsAttention: 4,
  broken: 5
};

export function buildSkillBrowseView(
  items: SkillListItem[],
  filters: SkillBrowseFilters,
  classificationById?: ReadonlyMap<string, { primaryCategory: { key: SkillCapabilityCategoryKey } }>
): SkillBrowseView {
  const classified = items.map((item) => classifyItem(item, classificationById));
  const scopeOptions = buildScopeOptions(items);
  const scopeFiltered = applyScopeFilter(classified, filters.scope);
  const projectFiltered = applyProjectFilter(scopeFiltered, filters.projectId, filters.scope);
  const queryFiltered = applyQueryFilter(projectFiltered, filters.query);
  const statusFiltered = applyStatusFilter(queryFiltered, filters.status);
  const sourceFiltered = applySourceFilter(statusFiltered, filters.source);

  const categoryOptions = buildCategoryOptions(sourceFiltered);
  const capabilityFiltered = applyCapabilityFilter(sourceFiltered, filters.capability);

  const sortedItems = sortClassifiedItems(capabilityFiltered);
  const groups = groupByCapability(sortedItems, filters.capability);

  const projectOptions = buildProjectOptions(items);

  return {
    scopeOptions,
    projectOptions,
    categoryOptions,
    groups,
    totalCount: sortedItems.length,
    emptyReason: deriveEmptyReason(items.length, filters, scopeFiltered.length, projectFiltered.length, capabilityFiltered.length),
    selectedCapability: filters.capability
  };
}

export function normalizeSkillBrowseFilters(
  filters: Partial<SkillBrowseFilters>,
  availableProjectIds: Set<string>,
  availableCapabilityKeys: Set<SkillCapabilityCategoryKey>
): SkillBrowseFilters {
  const scope = isSkillScopeFilter(filters.scope) ? filters.scope : "all";
  const projectId =
    scope === "project" && filters.projectId && filters.projectId !== ALL_PROJECTS_VALUE && availableProjectIds.has(filters.projectId)
      ? filters.projectId
      : ALL_PROJECTS_VALUE;
  const capability =
    filters.capability && filters.capability !== ALL_CAPABILITY_VALUE && availableCapabilityKeys.has(filters.capability as SkillCapabilityCategoryKey)
      ? (filters.capability as SkillCapabilityCategoryKey)
      : ALL_CAPABILITY_VALUE;

  return {
    scope,
    projectId,
    query: typeof filters.query === "string" ? filters.query.trim() : "",
    status: isSkillStatusFilter(filters.status) ? filters.status : "all",
    source: typeof filters.source === "string" ? filters.source : "all",
    capability
  };
}

export function readPersistedSkillScope(): SkillScopeFilter | null {
  return readSafeStorageValue(SCOPE_STORAGE_KEY, isSkillScopeFilter);
}

export function writePersistedSkillScope(scope: SkillScopeFilter): void {
  writeSafeStorageValue(SCOPE_STORAGE_KEY, scope);
}

export function readPersistedSkillProject(): SkillProjectFilterValue | null {
  return readSafeStorageValue(PROJECT_STORAGE_KEY, (value): value is SkillProjectFilterValue => typeof value === "string" && value.length > 0);
}

export function writePersistedSkillProject(projectId: SkillProjectFilterValue): void {
  writeSafeStorageValue(PROJECT_STORAGE_KEY, projectId);
}

export function readPersistedSkillCapability(): SkillCapabilityFilter | null {
  return readSafeStorageValue(CAPABILITY_STORAGE_KEY, (value): value is SkillCapabilityFilter => {
    if (value === "all") return true;
    return SKILL_CAPABILITY_CATEGORIES.some((category) => category.key === value);
  });
}

export function writePersistedSkillCapability(capability: SkillCapabilityFilter): void {
  writeSafeStorageValue(CAPABILITY_STORAGE_KEY, capability);
}

export function getSkillBrowseEmptyStateCopy(reason: SkillBrowseEmptyReason): { title: string; body: string } {
  switch (reason) {
    case "no-skills":
      return { title: "还没有找到 AI 技能", body: "开始查找后，这里会显示技能名称、用途和能力分类。" };
    case "no-global":
      return { title: "还没有明确归为全局的技能", body: "只有经过显式范围确认的技能才会显示在这里。" };
    case "no-projects":
      return { title: "还没有已登记的项目技能", body: "只有明确归入项目的技能才会显示在这里。" };
    case "no-selected-project":
      return { title: "这个项目下还没有技能", body: "选择其他项目，或查看全部技能。" };
    case "no-unknown":
      return { title: "没有范围未整理的技能", body: "当前技能都已有明确的全局或项目范围。" };
    case "no-capability":
      return { title: "这个能力分类下没有技能", body: "选择其他能力分类，或清除搜索和筛选。" };
    case "search":
    default:
      return { title: "没有匹配结果", body: "换一个关键词，或清除筛选后再试。" };
  }
}

function classifyItem(
  item: SkillListItem,
  classificationById?: ReadonlyMap<string, { primaryCategory: { key: SkillCapabilityCategoryKey } }>
): ClassifiedItem {
  const primaryKey = classificationById?.get(item.id)?.primaryCategory.key ?? classifySkillListItem(item).primaryCategory.key;
  return { item, primaryKey };
}

function buildScopeOptions(items: SkillListItem[]): SkillScopeOption[] {
  let globalCount = 0;
  let projectCount = 0;
  let unknownCount = 0;
  for (const item of items) {
    if (item.scopeSummary.hasGlobalSource) globalCount += 1;
    if (item.scopeSummary.projects.length > 0) projectCount += 1;
    if (item.scopeSummary.classification === "unknown") unknownCount += 1;
  }

  return [
    { value: "all", label: "全部技能", count: items.length },
    { value: "global", label: "全局技能", count: globalCount },
    { value: "project", label: "项目技能", count: projectCount },
    { value: "unknown", label: "范围未整理", count: unknownCount }
  ];
}

function buildProjectOptions(items: SkillListItem[]): SkillProjectOption[] {
  const byId = new Map<string, string>();
  for (const item of items) {
    for (const project of item.scopeSummary.projects) {
      if (!byId.has(project.projectId)) {
        byId.set(project.projectId, project.projectLabel);
      }
    }
  }

  const options = Array.from(byId.entries())
    .map(([projectId, projectLabel]) => ({ value: projectId as SkillProjectFilterValue, label: projectLabel }))
    .sort((left, right) => {
      const labelCompare = left.label.localeCompare(right.label, "zh-CN");
      if (labelCompare !== 0) return labelCompare;
      return left.value.localeCompare(right.value);
    });

  return [{ value: ALL_PROJECTS_VALUE, label: "全部项目" }, ...options];
}

function buildCategoryOptions(classified: ClassifiedItem[]): SkillCategoryOption[] {
  const counts = new Map<SkillCapabilityCategoryKey, number>();
  for (const category of SKILL_CAPABILITY_CATEGORIES) {
    counts.set(category.key, 0);
  }
  for (const { primaryKey } of classified) {
    counts.set(primaryKey, (counts.get(primaryKey) ?? 0) + 1);
  }

  const options = SKILL_CAPABILITY_CATEGORIES.filter((category) => category.key !== "unknown").map((category) => ({
    value: category.key as SkillCapabilityFilter,
    label: category.title,
    count: counts.get(category.key) ?? 0
  }));

  options.push({
    value: UNKNOWN_CATEGORY_KEY,
    label: SKILL_CAPABILITY_CATEGORIES.find((category) => category.key === "unknown")?.title ?? "尚未分类",
    count: counts.get("unknown") ?? 0
  });

  return [{ value: ALL_CAPABILITY_VALUE, label: "全部能力", count: classified.length }, ...options];
}

function applyScopeFilter(classified: ClassifiedItem[], scope: SkillScopeFilter): ClassifiedItem[] {
  switch (scope) {
    case "global":
      return classified.filter(({ item }) => item.scopeSummary.hasGlobalSource);
    case "project":
      return classified.filter(({ item }) => item.scopeSummary.projects.length > 0);
    case "unknown":
      return classified.filter(({ item }) => item.scopeSummary.classification === "unknown");
    case "all":
    default:
      return classified;
  }
}

function applyProjectFilter(classified: ClassifiedItem[], projectId: SkillProjectFilterValue, scope: SkillScopeFilter): ClassifiedItem[] {
  if (scope !== "project" || projectId === ALL_PROJECTS_VALUE) return classified;
  return classified.filter(({ item }) => item.scopeSummary.projects.some((project) => project.projectId === projectId));
}

function applyQueryFilter(classified: ClassifiedItem[], query: string): ClassifiedItem[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return classified;

  return classified.filter(({ item }) => {
    const searchable = [
      item.displayName,
      item.originalName,
      item.shortPurpose,
      item.usageText ?? "",
      ...item.tags,
      ...item.capabilities,
      ...item.availableInTools,
      item.sourceLabel
    ]
      .join(" ")
      .toLowerCase();
    return normalized.every((term) => searchable.includes(term));
  });
}

function applyStatusFilter(classified: ClassifiedItem[], status: SkillStatusFilter): ClassifiedItem[] {
  if (status === "all") return classified;
  return classified.filter(({ item }) => item.status === status);
}

function applySourceFilter(classified: ClassifiedItem[], source: string): ClassifiedItem[] {
  if (source === "all") return classified;
  return classified.filter(({ item }) => item.sourceLabel === source);
}

function applyCapabilityFilter(classified: ClassifiedItem[], capability: SkillCapabilityFilter): ClassifiedItem[] {
  if (capability === "all") return classified;
  return classified.filter(({ primaryKey }) => primaryKey === capability);
}

function sortClassifiedItems(classified: ClassifiedItem[]): ClassifiedItem[] {
  return [...classified].sort((left, right) => {
    const rankDiff = STATUS_RANK[left.item.status] - STATUS_RANK[right.item.status];
    if (rankDiff !== 0) return rankDiff;
    const nameCompare = (left.item.displayName || left.item.originalName).localeCompare(
      right.item.displayName || right.item.originalName,
      "zh-CN"
    );
    if (nameCompare !== 0) return nameCompare;
    return left.item.id.localeCompare(right.item.id);
  });
}

function groupByCapability(sorted: ClassifiedItem[], selectedCapability: SkillCapabilityFilter): SkillBrowseGroup[] {
  if (selectedCapability !== "all") {
    const category = SKILL_CAPABILITY_CATEGORIES.find((category) => category.key === selectedCapability);
    if (!category) return [];
    return [
      {
        key: category.key,
        title: category.title,
        summary: category.summary,
        rows: sorted.map(({ item }) => item)
      }
    ];
  }

  const rowsByKey = new Map<SkillCapabilityCategoryKey, SkillListItem[]>();
  for (const category of SKILL_CAPABILITY_CATEGORIES) {
    rowsByKey.set(category.key, []);
  }
  for (const { item, primaryKey } of sorted) {
    rowsByKey.get(primaryKey)?.push(item);
  }

  const formalGroups = SKILL_CAPABILITY_CATEGORIES.filter((category) => category.key !== "unknown")
    .map((category) => ({
      key: category.key,
      title: category.title,
      summary: category.summary,
      rows: rowsByKey.get(category.key) ?? []
    }))
    .filter((group) => group.rows.length > 0);

  const unknownRows = rowsByKey.get("unknown") ?? [];
  if (unknownRows.length > 0) {
    const unknownCategory = SKILL_CAPABILITY_CATEGORIES.find((category) => category.key === "unknown")!;
    formalGroups.push({
      key: unknownCategory.key,
      title: unknownCategory.title,
      summary: unknownCategory.summary,
      rows: unknownRows
    });
  }

  return formalGroups;
}

function deriveEmptyReason(
  totalItems: number,
  filters: SkillBrowseFilters,
  scopeCount: number,
  projectCount: number,
  capabilityCount: number
): SkillBrowseEmptyReason {
  if (totalItems === 0) return "no-skills";
  if (filters.query.trim().length > 0) return "search";
  if (filters.status !== "all" || filters.source !== "all") return "search";
  if (filters.scope === "unknown" && scopeCount === 0) return "no-unknown";
  if (filters.scope === "global" && scopeCount === 0) return "no-global";
  if (filters.scope === "project") {
    if (scopeCount === 0) return "no-projects";
    if (filters.projectId !== ALL_PROJECTS_VALUE && projectCount === 0) return "no-selected-project";
  }
  if (filters.capability !== "all" && capabilityCount === 0) return "no-capability";
  if (scopeCount === 0) return "search";
  return "search";
}

function normalizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0);
}

function isSkillScopeFilter(value: unknown): value is SkillScopeFilter {
  return value === "all" || value === "global" || value === "project" || value === "unknown";
}

function isSkillStatusFilter(value: unknown): value is SkillStatusFilter {
  return (
    value === "all" ||
    value === "available" ||
    value === "needsAttention" ||
    value === "duplicate" ||
    value === "broken" ||
    value === "sourceUnknown" ||
    value === "unchecked"
  );
}

function readSafeStorageValue<T>(key: string, validator: (value: unknown) => value is T): T | null {
  try {
    const raw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSafeStorageValue(key: string, value: string): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    // Ignore storage errors in constrained environments.
  }
}
