import { Badge, TextField } from "@radix-ui/themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./components/AppShell";
import { BaselineSummary } from "./components/BaselineSummary";
import { McpInventoryPanel } from "./components/McpInventoryPanel";
import { ModuleOverview } from "./components/ModuleOverview";
import { ResourceDetail } from "./components/ResourceDetail";
import { ResourceList } from "./components/ResourceList";
import { ResourceTypeNav } from "./components/ResourceTypeNav";
import { SafetyBoundaryPanel } from "./components/SafetyBoundaryPanel";
import { SkillPressurePanel } from "./components/SkillPressurePanel";
import { zhCN } from "./i18n/zh-CN";
import { filterResources, type ResourceView, VIEW_LABELS } from "./lib/filtering";
import { loadInventory } from "./lib/loadInventory";
import { useModuleTransition } from "./lib/useAiosMotion";
import type { AiosInventory, AiosResource } from "./types/inventory";

export default function App() {
  const [inventory, setInventory] = useState<AiosInventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ResourceView>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  useModuleTransition(mainRef, activeView);

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
    () => filteredResources.find((resource) => resource.id === selectedId) ?? filteredResources[0] ?? null,
    [filteredResources, selectedId]
  );

  useEffect(() => {
    if (selectedResource && selectedResource.id !== selectedId) {
      setSelectedId(selectedResource.id);
    }
  }, [selectedId, selectedResource]);

  function selectResource(resource: AiosResource) {
    setSelectedId(resource.id);
  }

  if (error) {
    return (
      <div className="center-state">
        <h1>{zhCN.app.errorTitle}</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="center-state">
        <h1>{zhCN.app.loadingTitle}</h1>
        <p>{zhCN.app.loadingBody}</p>
      </div>
    );
  }

  const sidebar = <ResourceTypeNav activeView={activeView} onChange={setActiveView} resources={inventory.resources} />;

  const main = (
    <div className="main-stack" ref={mainRef}>
      <ModuleOverview resources={inventory.resources} activeView={activeView} onChange={setActiveView} />
      <BaselineSummary baseline={inventory.baseline} />
      <section className="toolbar" aria-label="资源过滤">
        <div className="toolbar-copy">
          <h2>{zhCN.app.activeModule}</h2>
          <p>{zhCN.moduleSummaries[activeView]}</p>
        </div>
        <TextField.Root
          aria-label={zhCN.app.commandLabel}
          className="command-search"
          placeholder={zhCN.app.commandPlaceholder}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Badge variant="soft">
          {VIEW_LABELS[activeView]} / {filteredResources.length} {zhCN.app.countUnit}
        </Badge>
      </section>
      <ResourceList activeView={activeView} resources={filteredResources} selectedId={selectedResource?.id ?? null} onSelect={selectResource} />
    </div>
  );

  const detail = (
    <div className="inspector-stack">
      <ResourceDetail resource={selectedResource} />
      <SkillPressurePanel resources={inventory.resources} />
      <McpInventoryPanel servers={inventory.mcpServers} />
      <SafetyBoundaryPanel baseline={inventory.baseline} />
    </div>
  );

  return <AppShell detail={detail} inventory={inventory} main={main} sidebar={sidebar} />;
}
