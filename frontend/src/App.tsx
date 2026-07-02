import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { BaselineSummary } from "./components/BaselineSummary";
import { McpInventoryPanel } from "./components/McpInventoryPanel";
import { ResourceDetail } from "./components/ResourceDetail";
import { ResourceList } from "./components/ResourceList";
import { ResourceTypeNav } from "./components/ResourceTypeNav";
import { SafetyBoundaryPanel } from "./components/SafetyBoundaryPanel";
import { SkillPressurePanel } from "./components/SkillPressurePanel";
import { filterResources, type ResourceView } from "./lib/filtering";
import { loadInventory } from "./lib/loadInventory";
import type { AiosInventory, AiosResource } from "./types/inventory";

export default function App() {
  const [inventory, setInventory] = useState<AiosInventory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ResourceView>("dashboard");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        <h1>AIOS Control Center</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!inventory) {
    return (
      <div className="center-state">
        <h1>AIOS Control Center</h1>
        <p>Loading local snapshot...</p>
      </div>
    );
  }

  const sidebar = <ResourceTypeNav activeView={activeView} onChange={setActiveView} resources={inventory.resources} />;

  const main = (
    <div className="main-stack">
      <BaselineSummary baseline={inventory.baseline} />
      <section className="toolbar" aria-label="Resource filters">
        <input
          aria-label="Search resources"
          placeholder="Search resources, paths, risks"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <span>{activeView}</span>
      </section>
      <ResourceList resources={filteredResources} selectedId={selectedResource?.id ?? null} onSelect={selectResource} />
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
