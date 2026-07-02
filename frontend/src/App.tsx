import { Box, Chip, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
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

  const commandBar = (
    <TextField
      aria-label={zhCN.app.commandLabel}
      fullWidth
      placeholder={zhCN.app.commandPlaceholder}
      type="search"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          )
        }
      }}
    />
  );

  const sidebar = <ResourceTypeNav activeView={activeView} onChange={setActiveView} resources={inventory.resources} />;

  const main = (
    <Box className="main-stack" ref={mainRef}>
      <ModuleOverview resources={inventory.resources} activeView={activeView} onChange={setActiveView} />
      <BaselineSummary baseline={inventory.baseline} />
      <Box className="module-toolbar" component="section" aria-label="当前模块状态">
        <Stack spacing={0.35} sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h3">
            {VIEW_LABELS[activeView]}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {zhCN.moduleSummaries[activeView]}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
          <Chip color="primary" label={`${filteredResources.length} ${zhCN.app.shown}`} variant="filled" />
          <Chip label={`${inventory.resources.length} ${zhCN.app.total}`} variant="outlined" />
          <Chip className="status-chip status-ok" label={zhCN.app.safetyState} />
        </Stack>
      </Box>
      <ResourceList activeView={activeView} resources={filteredResources} selectedId={selectedResource?.id ?? null} onSelect={selectResource} />
    </Box>
  );

  const detail = (
    <Box className="inspector-stack">
      <ResourceDetail resource={selectedResource} />
      <SkillPressurePanel resources={inventory.resources} />
      <McpInventoryPanel servers={inventory.mcpServers} />
      <SafetyBoundaryPanel baseline={inventory.baseline} />
    </Box>
  );

  return <AppShell commandBar={commandBar} detail={detail} inventory={inventory} main={main} sidebar={sidebar} />;
}
