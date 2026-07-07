import { Box, Typography } from "@mui/material";
import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiosConsoleShell } from "./components/shell/AiosConsoleShell";
import { DashboardModule } from "./components/modules/DashboardModule";
import type { AiosModuleProps, ResourceSelectionContext } from "./components/modules/moduleUtils";
import { zhCN } from "./i18n/zh-CN";
import { buildResourceDisplayMap, filterResourceList, getDefaultResourcesForDataSource, getModuleResourcesForDataSource, getViewCountsForDataSource, VIEW_LABELS, type ResourceView } from "./lib/filtering";
import { loadInventory } from "./lib/loadInventory";
import { markAiosPerf } from "./lib/perf";
import {
  asLegacySnapshotDataSource,
  buildResourceDataSourceState,
  fallbackResourceCorpusSummary,
  getActiveResourceCorpusSummary,
  getDynamicCorpusResourceId,
  getProjectResourceMap,
  getResourceDetail,
  getScanSourceResourceMap,
  globalCorpusScope,
  isDynamicCorpusResource,
  listResourceCorpusScopes,
  listResourcesByScope,
  markLegacySnapshotResource,
  mapCorpusResourcesToAiosResources,
  mergeResourceWithCorpusDetail,
  scopeToResourceQuery,
  type ProjectResourceMapEntry,
  type ResourceCorpusScope,
  type ResourceCorpusSummary,
  type ScanSourceResourceMapEntry
} from "./lib/resourceCorpus";
import { getFirstRunOnboardingDismissed, setFirstRunOnboardingDismissed } from "./lib/resourceStore";
import {
  getMcpLibraryItemIdFromResource,
  getMcpLibrarySummary,
  getMcpServiceDetail,
  listMcpServiceItems,
  mapMcpServiceItemToResource,
  sanitizeMcpDetailLoadError,
  type McpServiceDetailRuntimeState,
  type McpLibrarySummary,
  type McpServiceItem
} from "./lib/mcpLibrary";
import {
  getSkillDetail,
  getSkillLibraryItemIdFromResource,
  getSkillLibrarySummary,
  listSkillLibraryItems,
  mapSkillListItemToResource,
  sanitizeSkillDetailLoadError,
  type SkillDetailRuntimeState,
  type SkillLibrarySummary,
  type SkillListItem
} from "./lib/skillLibrary";
import { buildSkillCapabilityClassificationMap, type SkillCapabilityClassification } from "./lib/skillCapabilityClassifier";
import { getAdvancedSubviewParent } from "./lib/productShell";
import { useModuleSwapMotion, useSelectedCardEmphasisMotion } from "./lib/useAiosMotion";

import type { AiosInventory, AiosResource } from "./types/inventory";

const AdvancedModule = lazy(() => import("./components/modules/AdvancedModule").then((module) => ({ default: module.AdvancedModule })));
const CustomScanModule = lazy(() => import("./components/modules/CustomScanModule").then((module) => ({ default: module.CustomScanModule })));
const LegacyModule = lazy(() => import("./components/modules/LegacyModule").then((module) => ({ default: module.LegacyModule })));
const McpModule = lazy(() => import("./components/modules/McpModule").then((module) => ({ default: module.McpModule })));
const PoliciesModule = lazy(() => import("./components/modules/PoliciesModule").then((module) => ({ default: module.PoliciesModule })));
const ProjectPacksModule = lazy(() => import("./components/modules/ProjectPacksModule").then((module) => ({ default: module.ProjectPacksModule })));
const ReportsModule = lazy(() => import("./components/modules/ReportsModule").then((module) => ({ default: module.ReportsModule })));
const ScriptsModule = lazy(() => import("./components/modules/ScriptsModule").then((module) => ({ default: module.ScriptsModule })));
const SkillsModule = lazy(() => import("./components/modules/SkillsModule").then((module) => ({ default: module.SkillsModule })));
const ValidatorsModule = lazy(() => import("./components/modules/ValidatorsModule").then((module) => ({ default: module.ValidatorsModule })));

export default function App() {
  const [inventory, setInventory] = useState<AiosInventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ResourceView>("dashboard");
  const [renderedView, setRenderedView] = useState<ResourceView>("dashboard");
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<{ resource: AiosResource; context?: ResourceSelectionContext } | null>(null);
  const [corpusSummary, setCorpusSummary] = useState<ResourceCorpusSummary>(fallbackResourceCorpusSummary);
  const [corpusScopes, setCorpusScopes] = useState<ResourceCorpusScope[]>([globalCorpusScope]);
  const [projectResourceMap, setProjectResourceMap] = useState<ProjectResourceMapEntry[]>([]);
  const [scanSourceResourceMap, setScanSourceResourceMap] = useState<ScanSourceResourceMapEntry[]>([]);
  const [activeCorpusScope, setActiveCorpusScope] = useState<ResourceCorpusScope>(globalCorpusScope);
  const [corpusResources, setCorpusResources] = useState<AiosResource[]>([]);
  const [corpusLoading, setCorpusLoading] = useState(false);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [corpusRefreshToken, setCorpusRefreshToken] = useState(0);
  const [firstRunOnboardingDismissed, setFirstRunOnboardingDismissedState] = useState(false);
  const [skillLibrarySummary, setSkillLibrarySummary] = useState<SkillLibrarySummary | null>(null);
  const [skillLibraryItems, setSkillLibraryItems] = useState<SkillListItem[]>([]);
  const [skillLibraryLoading, setSkillLibraryLoading] = useState(false);
  const [skillLibraryError, setSkillLibraryError] = useState<string | null>(null);
  const [mcpLibrarySummary, setMcpLibrarySummary] = useState<McpLibrarySummary | null>(null);
  const [mcpServiceItems, setMcpServiceItems] = useState<McpServiceItem[]>([]);
  const [mcpLibraryLoading, setMcpLibraryLoading] = useState(false);
  const [mcpLibraryError, setMcpLibraryError] = useState<string | null>(null);
  const [skillDetailState, setSkillDetailState] = useState<SkillDetailRuntimeState | null>(null);
  const [mcpDetailState, setMcpDetailState] = useState<McpServiceDetailRuntimeState | null>(null);
  const [, startRouteTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const moduleRef = useRef<HTMLDivElement>(null);
  useModuleSwapMotion(moduleRef, renderedView);

  useEffect(() => {
    loadInventory()
      .then((snapshot) => {
        setInventory(snapshot);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : String(loadError)));
  }, []);

  useEffect(() => {
    let active = true;
    getFirstRunOnboardingDismissed()
      .then((dismissed) => {
        if (active) setFirstRunOnboardingDismissedState(dismissed);
      })
      .catch((settingError: unknown) => {
        if (active) setCorpusError(formatAsyncError(settingError));
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setCorpusLoading(true);
    Promise.all([getActiveResourceCorpusSummary(), listResourceCorpusScopes(), getProjectResourceMap(), getScanSourceResourceMap()])
      .then(([summary, scopes, projectMap, sourceMap]) => {
        if (!active) return;
        const safeScopes = scopes.length > 0 ? scopes : [globalCorpusScope];
        setCorpusSummary(summary);
        setCorpusScopes(safeScopes);
        setProjectResourceMap(projectMap);
        setScanSourceResourceMap(sourceMap);
        setCorpusError(null);
        setActiveCorpusScope((current) => (summary.resourceCount > 0 ? safeScopes.find((scope) => scope.id === current.id) ?? safeScopes[0] ?? globalCorpusScope : globalCorpusScope));
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setCorpusSummary(fallbackResourceCorpusSummary);
        setCorpusScopes([globalCorpusScope]);
        setProjectResourceMap([]);
        setScanSourceResourceMap([]);
        setActiveCorpusScope(globalCorpusScope);
        setCorpusError(formatAsyncError(loadError));
      })
      .finally(() => {
        if (active) setCorpusLoading(false);
      });
    return () => {
      active = false;
    };
  }, [corpusRefreshToken]);

  useEffect(() => {
    let active = true;
    setSkillLibraryLoading(true);
    Promise.all([getSkillLibrarySummary(), listSkillLibraryItems()])
      .then(([summary, items]) => {
        if (!active) return;
        setSkillLibrarySummary(summary);
        setSkillLibraryItems(items);
        setSkillLibraryError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setSkillLibrarySummary(null);
        setSkillLibraryItems([]);
        setSkillLibraryError(formatAsyncError(loadError));
      })
      .finally(() => {
        if (active) setSkillLibraryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [corpusRefreshToken]);

  useEffect(() => {
    let active = true;
    setMcpLibraryLoading(true);
    Promise.all([getMcpLibrarySummary(), listMcpServiceItems()])
      .then(([summary, items]) => {
        if (!active) return;
        setMcpLibrarySummary(summary);
        setMcpServiceItems(items);
        setMcpLibraryError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setMcpLibrarySummary(null);
        setMcpServiceItems([]);
        setMcpLibraryError(formatAsyncError(loadError));
      })
      .finally(() => {
        if (active) setMcpLibraryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [corpusRefreshToken]);

  const legacySnapshotResources = useMemo(() => (inventory ? inventory.resources.map((resource) => markLegacySnapshotResource(resource, inventory.generatedAt)) : []), [inventory]);
  const corpusDataSource = useMemo(() => buildResourceDataSourceState(corpusSummary, legacySnapshotResources.length), [corpusSummary, legacySnapshotResources.length]);
  const legacySnapshotDataSource = useMemo(() => asLegacySnapshotDataSource(corpusDataSource), [corpusDataSource]);
  const corpusMode = corpusDataSource.activeSource;
  const shellCorpusMode = renderedView === "legacy" ? "legacy-snapshot" : corpusMode;

  useEffect(() => {
    let active = true;
    if (corpusMode !== "dynamic-corpus") {
      setCorpusResources([]);
      return () => {
        active = false;
      };
    }

    setCorpusLoading(true);
    listResourcesByScope(scopeToResourceQuery(activeCorpusScope))
      .then((resources) => {
        if (!active) return;
        setCorpusResources(mapCorpusResourcesToAiosResources(resources));
        setCorpusError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setCorpusResources([]);
        setCorpusError(formatAsyncError(loadError));
      })
      .finally(() => {
        if (active) setCorpusLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeCorpusScope, corpusMode, corpusRefreshToken]);

  const activeResources = useMemo(() => getDefaultResourcesForDataSource(corpusDataSource, corpusResources), [corpusDataSource, corpusResources]);
  const skillLibraryResources = useMemo(() => skillLibraryItems.map(mapSkillListItemToResource), [skillLibraryItems]);
  const mcpLibraryResources = useMemo(() => mcpServiceItems.map(mapMcpServiceItemToResource), [mcpServiceItems]);
  const skillLibraryItemById = useMemo(() => new Map(skillLibraryItems.map((item) => [item.id, item])), [skillLibraryItems]);
  const mcpServiceItemById = useMemo(() => new Map(mcpServiceItems.map((item) => [item.id, item])), [mcpServiceItems]);
  const selectableResources = useMemo(() => [...activeResources, ...skillLibraryResources, ...mcpLibraryResources, ...legacySnapshotResources], [activeResources, legacySnapshotResources, mcpLibraryResources, skillLibraryResources]);
  const displayInventory = useMemo(() => (inventory ? { ...inventory, resources: activeResources } : null), [activeResources, inventory]);
  const displayById = useMemo(() => buildResourceDisplayMap(selectableResources), [selectableResources]);
  const skillCapabilityById = useMemo(
    () => buildSkillCapabilityClassificationMap(activeResources, displayById),
    [activeResources, displayById]
  );
  const baseViewCounts = useMemo(() => getViewCountsForDataSource(corpusDataSource, activeResources, legacySnapshotResources), [activeResources, corpusDataSource, legacySnapshotResources]);
  const viewCounts = useMemo(
    () => ({
      ...baseViewCounts,
      mcp: mcpLibrarySummary ? Math.max(0, mcpLibrarySummary.counts.serviceCount) : baseViewCounts.mcp
    }),
    [baseViewCounts, mcpLibrarySummary]
  );
  const moduleResources = useMemo(() => {
    if (renderedView === "mcp" && mcpLibrarySummary) return mcpLibraryResources;
    return getModuleResourcesForDataSource(renderedView, corpusDataSource, activeResources, legacySnapshotResources);
  }, [activeResources, corpusDataSource, legacySnapshotResources, mcpLibraryResources, mcpLibrarySummary, renderedView]);
  const filteredResources = useMemo(
    () => (renderedView === "skills" ? moduleResources : filterResourceList(moduleResources, deferredQuery, displayById)),
    [deferredQuery, displayById, moduleResources, renderedView]
  );
  const selectedResource = selection?.resource ?? null;
  const selectedSkillIdentity = selection?.context?.skillIdentity ?? null;
  const selectedId = selectedResource?.id ?? null;
  const selectedSkillCapability = useMemo(() => (selectedId ? skillCapabilityById.get(selectedId) ?? null : null), [selectedId, skillCapabilityById]);
  useSelectedCardEmphasisMotion(moduleRef, selectedId);
  const refreshResourceCorpus = useCallback(() => setCorpusRefreshToken((current) => current + 1), []);

  const handleSetFirstRunOnboardingDismissed = useCallback((dismissed: boolean) => {
    setFirstRunOnboardingDismissedState(dismissed);
    setFirstRunOnboardingDismissed(dismissed).catch((settingError: unknown) => {
      setCorpusError(formatAsyncError(settingError));
      setFirstRunOnboardingDismissedState(!dismissed);
    });
  }, []);

  const handleViewChange = useCallback((view: ResourceView) => {
    markAiosPerf("module-nav-request", { from: activeView, to: view });
    setActiveView(view);
    setSelection(null);
    setSkillDetailState(null);
    setMcpDetailState(null);
    startRouteTransition(() => {
      setRenderedView(view);
    });
  }, [activeView, startRouteTransition]);

  const handleBack = useCallback(() => {
    const parent = getAdvancedSubviewParent(renderedView);
    if (parent) handleViewChange(parent);
  }, [renderedView, handleViewChange]);

  const handleScopeChange = useCallback((scope: ResourceCorpusScope) => {
    setActiveCorpusScope(scope);
    setSelection(null);
    setSkillDetailState(null);
    setMcpDetailState(null);
  }, []);

  const selectResource = useCallback((resource: AiosResource, context?: ResourceSelectionContext) => {
    setSelection({ resource, context });
    const productSkillId = getSkillLibraryItemIdFromResource(resource);
    if (productSkillId) {
      const fallbackItem = context?.skillListItem ?? skillLibraryItemById.get(productSkillId) ?? null;
      setMcpDetailState(null);
      setSkillDetailState({
        resourceId: resource.id,
        skillId: productSkillId,
        fallbackItem,
        detail: null,
        loading: true,
        error: null
      });
      getSkillDetail(productSkillId)
        .then((detail) => {
          setSkillDetailState((current) => {
            if (!current || current.resourceId !== resource.id || current.skillId !== productSkillId) return current;
            return { ...current, detail, fallbackItem: current.fallbackItem ?? fallbackItem, loading: false, error: null };
          });
        })
        .catch((detailError: unknown) => {
          setSkillDetailState((current) => {
            if (!current || current.resourceId !== resource.id || current.skillId !== productSkillId) return current;
            return {
              ...current,
              detail: null,
              fallbackItem: current.fallbackItem ?? fallbackItem,
              loading: false,
              error: sanitizeSkillDetailLoadError(detailError)
            };
          });
        });
      return;
    }
    setSkillDetailState(null);
    const productMcpServiceId = getMcpLibraryItemIdFromResource(resource);
    if (productMcpServiceId) {
      const fallbackItem = mcpServiceItemById.get(productMcpServiceId) ?? null;
      setMcpDetailState({
        resourceId: resource.id,
        serviceId: productMcpServiceId,
        fallbackItem,
        detail: null,
        loading: true,
        error: null
      });
      getMcpServiceDetail(productMcpServiceId)
        .then((detail) => {
          setMcpDetailState((current) => {
            if (!current || current.resourceId !== resource.id || current.serviceId !== productMcpServiceId) return current;
            return { ...current, detail, fallbackItem: current.fallbackItem ?? fallbackItem, loading: false, error: null };
          });
        })
        .catch((detailError: unknown) => {
          setMcpDetailState((current) => {
            if (!current || current.resourceId !== resource.id || current.serviceId !== productMcpServiceId) return current;
            return {
              ...current,
              detail: null,
              fallbackItem: current.fallbackItem ?? fallbackItem,
              loading: false,
              error: sanitizeMcpDetailLoadError(detailError)
            };
          });
        });
      return;
    }
    setMcpDetailState(null);
    if (!isDynamicCorpusResource(resource) || resource.metadata?.corpusDetailLoaded === true) return;
    const resourceId = getDynamicCorpusResourceId(resource);
    if (!resourceId) return;
    getResourceDetail(resourceId)
      .then((detail) => {
        setSelection((current) => {
          if (!current || current.resource.id !== resource.id) return current;
          return { ...current, resource: mergeResourceWithCorpusDetail(current.resource, detail) };
        });
      })
      .catch((detailError: unknown) => setCorpusError(formatAsyncError(detailError)));
  }, [mcpServiceItemById, skillLibraryItemById]);

  const handleQueryChange = useCallback((value: string) => setQuery(value), []);
  const clearSelection = useCallback(() => {
    setSelection(null);
    setSkillDetailState(null);
    setMcpDetailState(null);
  }, []);

  useEffect(() => {
    markAiosPerf("module-rendered", {
      view: renderedView,
      visible: filteredResources.length,
      query: deferredQuery.trim() ? "filtered" : "empty"
    });
  }, [deferredQuery, filteredResources.length, renderedView]);

  useEffect(() => {
    if (!selection) return;
    if (!selectableResources.some((resource) => resource.id === selection.resource.id)) {
      setSelection(null);
      setSkillDetailState(null);
      setMcpDetailState(null);
    }
  }, [selectableResources, selection]);

  if (error) {
    return (
      <Box className="center-state">
        <Typography component="h1" variant="h1">
          {zhCN.app.errorTitle}
        </Typography>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!inventory || !displayInventory) {
    return (
      <Box className="center-state">
        <Typography component="h1" variant="h1">
          {zhCN.app.loadingTitle}
        </Typography>
        <Typography>{zhCN.app.loadingBody}</Typography>
      </Box>
    );
  }

  const defaultResourceCorpusState = {
    activeScope: activeCorpusScope,
    dataSource: corpusDataSource,
    error: corpusError,
    firstRunOnboardingDismissed,
    loading: corpusLoading,
    mode: corpusMode,
    projectMap: projectResourceMap,
    onSetFirstRunOnboardingDismissed: handleSetFirstRunOnboardingDismissed,
    onScopeChange: handleScopeChange,
    refresh: refreshResourceCorpus,
    scanSourceMap: scanSourceResourceMap,
    scopes: corpusScopes,
    summary: corpusSummary
  };
  const moduleResourceCorpusState =
    renderedView === "legacy"
      ? {
          ...defaultResourceCorpusState,
          dataSource: legacySnapshotDataSource,
          mode: "legacy-snapshot" as const
        }
      : defaultResourceCorpusState;
  const skillLibraryState = {
    available: skillLibrarySummary !== null,
    error: skillLibraryError,
    items: skillLibraryItems,
    loading: skillLibraryLoading,
    summary: skillLibrarySummary
  };
  const mcpLibraryState = {
    available: mcpLibrarySummary !== null,
    error: mcpLibraryError,
    items: mcpServiceItems,
    loading: mcpLibraryLoading,
    summary: mcpLibrarySummary
  };
  const moduleProps: AiosModuleProps = {
    allResources: activeResources,
    baseline: inventory.baseline,
    resourceCorpus: moduleResourceCorpusState,
    mcpLibrary: mcpLibraryState,
    skillLibrary: skillLibraryState,
    displayById,
    query: deferredQuery,
    resources: filteredResources,
    selectedId,
    skillCapabilityById,
    viewCounts,
    onBack: handleBack,
    onClearSelection: clearSelection,
    onSelect: selectResource,
    onViewChange: handleViewChange,
    onQueryChange: handleQueryChange
  };
  const shellShownCount =
    renderedView === "skills" && skillLibrarySummary
      ? skillLibrarySummary.counts.dedupedSkillCount
      : renderedView === "mcp" && mcpLibrarySummary
        ? mcpLibrarySummary.counts.serviceCount
        : filteredResources.length;

  return (
    <AiosConsoleShell
      activeView={activeView}
      activeScopeId={activeCorpusScope.id}
      corpusError={corpusError}
      corpusLoading={corpusLoading}
      corpusMode={shellCorpusMode}
      corpusScopes={corpusScopes}
      corpusSummary={corpusSummary}
      inventory={displayInventory}
      query={query}
      selectedResource={selectedResource}
      selectedSkillIdentity={selectedSkillIdentity}
      selectedSkillCapability={selectedSkillCapability}
      mcpDetailState={mcpDetailState}
      skillDetailState={skillDetailState}
      shownCount={shellShownCount}
      inspectorVisibleCount={shellShownCount}
      viewCounts={moduleProps.viewCounts}
      onClearSelection={clearSelection}
      onQueryChange={handleQueryChange}
      onScopeChange={handleScopeChange}
      onViewChange={handleViewChange}
    >
      <Box ref={moduleRef} className="module-transition-scope">
        <Suspense fallback={<ModuleLoadingFallback view={renderedView} />}>{renderModule(renderedView, moduleProps)}</Suspense>
      </Box>
    </AiosConsoleShell>
  );
}

function ModuleLoadingFallback({ view }: { view: ResourceView }) {
  return (
    <Box className="module-surface module-loading-panel" role="status" aria-busy="true" aria-live="polite">
      <Box className="module-header">
        <Box className="module-header-title">
          <Typography component="h2" variant="h2">
            {VIEW_LABELS[view]}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            正在加载模块
          </Typography>
        </Box>
      </Box>
      <Box className="module-loading-body">
        <Typography color="text.secondary" variant="body2">
          正在准备内容...
        </Typography>
      </Box>
    </Box>
  );
}

function formatAsyncError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function renderModule(activeView: ResourceView, moduleProps: AiosModuleProps) {
  switch (activeView) {
    case "dashboard":
      return <DashboardModule {...moduleProps} />;
    case "custom-scan":
      return <CustomScanModule {...moduleProps} />;
    case "skills":
      return <SkillsModule {...moduleProps} />;
    case "mcp":
      return <McpModule {...moduleProps} />;
    case "advanced":
      return <AdvancedModule {...moduleProps} />;
    case "scripts":
      return <ScriptsModule {...moduleProps} />;
    case "reports":
      return <ReportsModule {...moduleProps} />;
    case "project-packs":
      return <ProjectPacksModule {...moduleProps} />;
    case "policies":
      return <PoliciesModule {...moduleProps} />;
    case "validators":
      return <ValidatorsModule {...moduleProps} />;
    case "legacy":
      return <LegacyModule {...moduleProps} />;
    default:
      return <DashboardModule {...moduleProps} />;
  }
}
