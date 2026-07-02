import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AiosInventory, AiosResource } from "../../types/inventory";
import type { ResourceView } from "../../lib/filtering";
import { AiosInspectorSheet } from "./AiosInspectorSheet";
import { AiosNavigationRail } from "./AiosNavigationRail";
import { AiosTopCommandBar } from "./AiosTopCommandBar";

interface AiosConsoleShellProps {
  activeView: ResourceView;
  children: ReactNode;
  inspectorOpen: boolean;
  inventory: AiosInventory;
  query: string;
  selectedResource: AiosResource | null;
  shownCount: number;
  onCloseInspector: () => void;
  onQueryChange: (query: string) => void;
  onToggleInspector: () => void;
  onViewChange: (view: ResourceView) => void;
}

export function AiosConsoleShell({ activeView, children, inspectorOpen, inventory, query, selectedResource, shownCount, onCloseInspector, onQueryChange, onToggleInspector, onViewChange }: AiosConsoleShellProps) {
  return (
    <Box className={inspectorOpen ? "aios-console-shell inspector-open" : "aios-console-shell"}>
      <AiosNavigationRail activeView={activeView} resources={inventory.resources} onChange={onViewChange} />
      <Box className="aios-console-main">
        <AiosTopCommandBar
          activeView={activeView}
          inspectorOpen={inspectorOpen}
          inventory={inventory}
          query={query}
          shownCount={shownCount}
          onQueryChange={onQueryChange}
          onToggleInspector={onToggleInspector}
          onViewChange={onViewChange}
        />
        <Box className="module-workspace">{children}</Box>
      </Box>
      <AiosInspectorSheet open={inspectorOpen} resource={selectedResource} onClose={onCloseInspector} />
    </Box>
  );
}
