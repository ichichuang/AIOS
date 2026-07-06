import { Box, Typography } from "@mui/material";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiosConsoleShell } from "./components/shell/AiosConsoleShell";
import { AdvancedModule } from "./components/modules/AdvancedModule";
import { DashboardModule } from "./components/modules/DashboardModule";
import { CustomScanModule } from "./components/modules/CustomScanModule";
import { LegacyModule } from "./components/modules/LegacyModule";
import { McpModule } from "./components/modules/McpModule";
import { PoliciesModule } from "./components/modules/PoliciesModule";
import { ProjectPacksModule } from "./components/modules/ProjectPacksModule";
import { ReportsModule } from "./components/modules/ReportsModule";
import { ScriptsModule } from "./components/modules/ScriptsModule";
import { SkillsModule } from "./components/modules/SkillsModule";
import { ValidatorsModule } from "./components/modules/ValidatorsModule";
import type { AiosModuleProps, ResourceSelectionContext } from "./components/modules/moduleUtils";
import { zhCN } from "./i18n/zh-CN";
import { buildResourceDisplayMap, filterResourceList, getDefaultResourcesForDataSource, getModuleResourcesForDataSource, getViewCountsForDataSource, type ResourceView } from "./lib/filtering";
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
import { getSkillLibrarySummary, listSkillLibraryItems, mapSkillListItemToResource, type SkillLibrarySummary, type SkillListItem } from "./lib/skillLibrary";
import { buildSkillCapabilityClassificationMap, type SkillCapabilityClassification } from "./lib/skillCapabilityClassifier";
import { getAdvancedSubviewParent } from "./lib/productShell";
import { useModuleSwapMotion, useSelectedCardEmphasisMotion } from "./lib/useAiosMotion";

import type { AiosInventory, AiosResource } from "./types/inventory";

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
  const selectableResources = useMemo(() => [...activeResources, ...skillLibraryResources, ...legacySnapshotResources], [activeResources, legacySnapshotResources, skillLibraryResources]);
  const displayInventory = useMemo(() => (inventory ? { ...inventory, resources: activeResources } : null), [activeResources, inventory]);
  const displayById = useMemo(() => buildResourceDisplayMap(selectableResources), [selectableResources]);
  const skillCapabilityById = useMemo(
    () => buildSkillCapabilityClassificationMap(activeResources, displayById),
    [activeResources, displayById]
  );
  const viewCounts = useMemo(() => getViewCountsForDataSource(corpusDataSource, activeResources, legacySnapshotResources), [activeResources, corpusDataSource, legacySnapshotResources]);
  const moduleResources = useMemo(() => getModuleResourcesForDataSource(renderedView, corpusDataSource, activeResources, legacySnapshotResources), [activeResources, corpusDataSource, legacySnapshotResources, renderedView]);
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
  }, []);

  const selectResource = useCallback((resource: AiosResource, context?: ResourceSelectionContext) => {
    setSelection({ resource, context });
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
  }, []);

  const handleQueryChange = useCallback((value: string) => setQuery(value), []);
  const clearSelection = useCallback(() => {
    setSelection(null);
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
  const moduleProps: AiosModuleProps = {
    allResources: activeResources,
    baseline: inventory.baseline,
    resourceCorpus: moduleResourceCorpusState,
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
  const shellShownCount = renderedView === "skills" && skillLibrarySummary ? skillLibrarySummary.counts.dedupedSkillCount : filteredResources.length;

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
      shownCount={shellShownCount}
      inspectorVisibleCount={shellShownCount}
      viewCounts={moduleProps.viewCounts}
      onClearSelection={clearSelection}
      onQueryChange={handleQueryChange}
      onScopeChange={handleScopeChange}
      onViewChange={handleViewChange}
    >
      <Box ref={moduleRef} className="module-transition-scope">
        {renderModule(renderedView, moduleProps)}
      </Box>
    </AiosConsoleShell>
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
