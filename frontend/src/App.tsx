import { Box, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { filterResources, type ResourceView } from "./lib/filtering";
import { loadInventory } from "./lib/loadInventory";
import { useModuleSwapMotion } from "./lib/useAiosMotion";
import type { AiosInventory, AiosResource } from "./types/inventory";

export default function App() {
  const [inventory, setInventory] = useState<AiosInventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ResourceView>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(() => window.matchMedia("(min-width: 1321px)").matches);
  const moduleRef = useRef<HTMLDivElement>(null);
  useModuleSwapMotion(moduleRef, activeView);

  useEffect(() => {
    loadInventory()
      .then((snapshot) => {
        setInventory(snapshot);
        setSelectedId(snapshot.resources[0]?.id ?? null);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : String(loadError)));
  }, []);

  const filteredResources = useMemo(() => (inventory ? filterResources(inventory.resources, activeView, query) : []), [inventory, activeView, query]);
  const selectedResource = useMemo(
    () => inventory?.resources.find((resource) => resource.id === selectedId) ?? filteredResources[0] ?? null,
    [filteredResources, inventory?.resources, selectedId]
  );

  useEffect(() => {
    if (!filteredResources.length) return;
    if (!selectedResource || !filteredResources.some((resource) => resource.id === selectedResource.id)) {
      setSelectedId(filteredResources[0].id);
    }
  }, [filteredResources, selectedResource]);

  function handleViewChange(view: ResourceView) {
    setActiveView(view);
    setSelectedId(null);
  }

  function selectResource(resource: AiosResource) {
    setSelectedId(resource.id);
    setInspectorOpen(true);
  }

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
    resources: filteredResources,
    selectedId: selectedResource?.id ?? null,
    onSelect: selectResource,
    onViewChange: handleViewChange
  };

  return (
    <AiosConsoleShell
      activeView={activeView}
      inspectorOpen={inspectorOpen}
      inventory={inventory}
      query={query}
      selectedResource={selectedResource}
      shownCount={filteredResources.length}
      onCloseInspector={() => setInspectorOpen(false)}
      onQueryChange={setQuery}
      onToggleInspector={() => setInspectorOpen((open) => !open)}
      onViewChange={handleViewChange}
    >
      <Box ref={moduleRef} className="module-transition-scope">
        {renderModule(activeView, moduleProps)}
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
