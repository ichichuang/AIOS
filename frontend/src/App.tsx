import { Box, Typography } from "@mui/material";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AiosConsoleShell } from "./components/shell/AiosConsoleShell";
import { DashboardModule } from "./components/modules/DashboardModule";
import { LegacyModule } from "./components/modules/LegacyModule";
import { McpModule } from "./components/modules/McpModule";
import { PoliciesModule } from "./components/modules/PoliciesModule";
import { ProjectPacksModule } from "./components/modules/ProjectPacksModule";
import { ReportsModule } from "./components/modules/ReportsModule";
import { ScriptsModule } from "./components/modules/ScriptsModule";
import { SkillsModule } from "./components/modules/SkillsModule";
import { ValidatorsModule } from "./components/modules/ValidatorsModule";
import type { AiosModuleProps } from "./components/modules/moduleUtils";
import { zhCN } from "./i18n/zh-CN";
import { buildResourceDisplayMap, buildResourcesByView, countResourcesByView, filterResourceList, type ResourceView } from "./lib/filtering";
import { loadInventory } from "./lib/loadInventory";
import { markAiosPerf } from "./lib/perf";
import { buildSkillCapabilityClassificationMap, type SkillCapabilityClassification } from "./lib/skillCapabilityClassifier";
import { useModuleSwapMotion } from "./lib/useAiosMotion";
import type { AiosInventory, AiosResource } from "./types/inventory";

export default function App() {
  const [inventory, setInventory] = useState<AiosInventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ResourceView>("dashboard");
  const [renderedView, setRenderedView] = useState<ResourceView>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  const displayById = useMemo(() => (inventory ? buildResourceDisplayMap(inventory.resources) : new Map()), [inventory]);
  const skillCapabilityById = useMemo(
    () => (inventory ? buildSkillCapabilityClassificationMap(inventory.resources, displayById) : new Map<string, SkillCapabilityClassification>()),
    [displayById, inventory]
  );
  const resourceById = useMemo(() => (inventory ? new Map(inventory.resources.map((resource) => [resource.id, resource])) : new Map<string, AiosResource>()), [inventory]);
  const resourcesByView = useMemo(() => (inventory ? buildResourcesByView(inventory.resources) : null), [inventory]);
  const viewCounts = useMemo(() => (resourcesByView ? countResourcesByView(resourcesByView) : null), [resourcesByView]);
  const moduleResources = useMemo(() => (resourcesByView ? resourcesByView[renderedView] : []), [renderedView, resourcesByView]);
  const filteredResources = useMemo(
    () => (renderedView === "skills" ? moduleResources : filterResourceList(moduleResources, deferredQuery, displayById)),
    [deferredQuery, displayById, moduleResources, renderedView]
  );
  const selectedResource = useMemo(() => (selectedId ? resourceById.get(selectedId) ?? null : null), [resourceById, selectedId]);
  const selectedSkillCapability = useMemo(() => (selectedId ? skillCapabilityById.get(selectedId) ?? null : null), [selectedId, skillCapabilityById]);

  const handleViewChange = useCallback((view: ResourceView) => {
    markAiosPerf("module-nav-request", { from: activeView, to: view });
    setActiveView(view);
    setSelectedId(null);
    startRouteTransition(() => {
      setRenderedView(view);
    });
  }, [activeView, startRouteTransition]);

  const selectResource = useCallback((resource: AiosResource) => {
    setSelectedId(resource.id);
  }, []);

  const handleQueryChange = useCallback((value: string) => setQuery(value), []);
  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  useEffect(() => {
    markAiosPerf("module-rendered", {
      view: renderedView,
      visible: filteredResources.length,
      query: deferredQuery.trim() ? "filtered" : "empty"
    });
  }, [deferredQuery, filteredResources.length, renderedView]);

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

  if (!inventory) {
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
    allResources: inventory.resources,
    baseline: inventory.baseline,
    displayById,
    query: deferredQuery,
    resources: filteredResources,
    selectedId: selectedResource?.id ?? null,
    skillCapabilityById,
    viewCounts: viewCounts ?? countResourcesByView(buildResourcesByView([])),
    onClearSelection: clearSelection,
    onSelect: selectResource,
    onViewChange: handleViewChange
  };

  return (
    <AiosConsoleShell
      activeView={activeView}
      inventory={inventory}
      query={query}
      selectedResource={selectedResource}
      selectedSkillCapability={selectedSkillCapability}
      shownCount={filteredResources.length}
      viewCounts={moduleProps.viewCounts}
      onClearSelection={clearSelection}
      onQueryChange={handleQueryChange}
      onViewChange={handleViewChange}
    >
      <Box ref={moduleRef} className="module-transition-scope">
        {renderModule(renderedView, moduleProps)}
      </Box>
    </AiosConsoleShell>
  );
}

function renderModule(activeView: ResourceView, moduleProps: AiosModuleProps) {
  switch (activeView) {
    case "dashboard":
      return <DashboardModule {...moduleProps} />;
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
