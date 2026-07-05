import { Box, Typography } from "@mui/material";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiosConsoleShell } from "./components/shell/AiosConsoleShell";
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
import { buildResourceDisplayMap, buildResourcesByView, countResourcesByView, filterResourceList, type ResourceView } from "./lib/filtering";
import { loadInventory } from "./lib/loadInventory";
import { markAiosPerf } from "./lib/perf";
import {
  fallbackResourceCorpusSummary,
  getActiveResourceCorpusSummary,
  getCorpusSourceMode,
  getDynamicCorpusResourceId,
  getResourceDetail,
  globalCorpusScope,
  isDynamicCorpusResource,
  listResourceCorpusScopes,
  listResourcesByScope,
  mapCorpusResourcesToAiosResources,
  mergeResourceWithCorpusDetail,
  scopeToResourceQuery,
  type ResourceCorpusScope,
  type ResourceCorpusSummary
} from "./lib/resourceCorpus";
import { getFirstRunOnboardingDismissed, setFirstRunOnboardingDismissed } from "./lib/resourceStore";
import { buildSkillCapabilityClassificationMap, type SkillCapabilityClassification } from "./lib/skillCapabilityClassifier";
import { useModuleSwapMotion } from "./lib/useAiosMotion";
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
  const [activeCorpusScope, setActiveCorpusScope] = useState<ResourceCorpusScope>(globalCorpusScope);
  const [corpusResources, setCorpusResources] = useState<AiosResource[]>([]);
  const [corpusLoading, setCorpusLoading] = useState(false);
  const [corpusError, setCorpusError] = useState<string | null>(null);
  const [corpusRefreshToken, setCorpusRefreshToken] = useState(0);
  const [firstRunOnboardingDismissed, setFirstRunOnboardingDismissedState] = useState(false);
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
    Promise.all([getActiveResourceCorpusSummary(), listResourceCorpusScopes()])
      .then(([summary, scopes]) => {
        if (!active) return;
        const safeScopes = scopes.length > 0 ? scopes : [globalCorpusScope];
        setCorpusSummary(summary);
        setCorpusScopes(safeScopes);
        setCorpusError(null);
        setActiveCorpusScope((current) => safeScopes.find((scope) => scope.id === current.id) ?? safeScopes[0] ?? globalCorpusScope);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setCorpusSummary(fallbackResourceCorpusSummary);
        setCorpusScopes([globalCorpusScope]);
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

  const corpusMode = getCorpusSourceMode(corpusSummary);

  useEffect(() => {
    let active = true;
    if (corpusMode !== "dynamic") {
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

  const activeResources = useMemo(() => (corpusMode === "dynamic" ? corpusResources : inventory?.resources ?? []), [corpusMode, corpusResources, inventory]);
  const displayInventory = useMemo(() => (inventory ? { ...inventory, resources: activeResources } : null), [activeResources, inventory]);
  const displayById = useMemo(() => buildResourceDisplayMap(activeResources), [activeResources]);
  const skillCapabilityById = useMemo(
    () => buildSkillCapabilityClassificationMap(activeResources, displayById),
    [activeResources, displayById]
  );
  const resourcesByView = useMemo(() => buildResourcesByView(activeResources), [activeResources]);
  const viewCounts = useMemo(() => (resourcesByView ? countResourcesByView(resourcesByView) : null), [resourcesByView]);
  const moduleResources = useMemo(() => (resourcesByView ? resourcesByView[renderedView] : []), [renderedView, resourcesByView]);
  const filteredResources = useMemo(
    () => (renderedView === "skills" ? moduleResources : filterResourceList(moduleResources, deferredQuery, displayById)),
    [deferredQuery, displayById, moduleResources, renderedView]
  );
  const selectedResource = selection?.resource ?? null;
  const selectedSkillIdentity = selection?.context?.skillIdentity ?? null;
  const selectedId = selectedResource?.id ?? null;
  const selectedSkillCapability = useMemo(() => (selectedId ? skillCapabilityById.get(selectedId) ?? null : null), [selectedId, skillCapabilityById]);
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
    if (!activeResources.some((resource) => resource.id === selection.resource.id)) {
      setSelection(null);
    }
  }, [activeResources, selection]);

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

  const moduleProps: AiosModuleProps = {
    allResources: activeResources,
    baseline: inventory.baseline,
    resourceCorpus: {
      activeScope: activeCorpusScope,
      error: corpusError,
      firstRunOnboardingDismissed,
      loading: corpusLoading,
      mode: corpusMode,
      onSetFirstRunOnboardingDismissed: handleSetFirstRunOnboardingDismissed,
      refresh: refreshResourceCorpus,
      summary: corpusSummary
    },
    displayById,
    query: deferredQuery,
    resources: filteredResources,
    selectedId,
    skillCapabilityById,
    viewCounts: viewCounts ?? countResourcesByView(buildResourcesByView([])),
    onClearSelection: clearSelection,
    onSelect: selectResource,
    onViewChange: handleViewChange,
    onQueryChange: handleQueryChange
  };

  return (
    <AiosConsoleShell
      activeView={activeView}
      activeScopeId={activeCorpusScope.id}
      corpusError={corpusError}
      corpusLoading={corpusLoading}
      corpusMode={corpusMode}
      corpusScopes={corpusScopes}
      corpusSummary={corpusSummary}
      inventory={displayInventory}
      query={query}
      selectedResource={selectedResource}
      selectedSkillIdentity={selectedSkillIdentity}
      selectedSkillCapability={selectedSkillCapability}
      shownCount={filteredResources.length}
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
