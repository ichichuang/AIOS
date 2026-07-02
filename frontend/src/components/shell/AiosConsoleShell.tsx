import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AiosInventory, AiosResource } from "../../types/inventory";
import type { ResourceView } from "../../lib/filtering";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import { AiosInspectorSheet } from "./AiosInspectorSheet";
import { AiosNavigationRail } from "./AiosNavigationRail";
import { AiosTopCommandBar } from "./AiosTopCommandBar";

interface AiosConsoleShellProps {
  activeView: ResourceView;
  children: ReactNode;
  inventory: AiosInventory;
  query: string;
  selectedResource: AiosResource | null;
  selectedSkillCapability: SkillCapabilityClassification | null;
  shownCount: number;
  viewCounts: Record<ResourceView, number>;
  onClearSelection: () => void;
  onQueryChange: (query: string) => void;
  onViewChange: (view: ResourceView) => void;
}

export function AiosConsoleShell({
  activeView,
  children,
  inventory,
  query,
  selectedResource,
  selectedSkillCapability,
  shownCount,
  viewCounts,
  onClearSelection,
  onQueryChange,
  onViewChange
}: AiosConsoleShellProps) {
  return (
    <Box className="aios-console-shell">
      <AiosNavigationRail activeView={activeView} viewCounts={viewCounts} onChange={onViewChange} />
      <Box className="aios-console-main">
        <AiosTopCommandBar
          activeView={activeView}
          inventory={inventory}
          query={query}
          shownCount={shownCount}
          onQueryChange={onQueryChange}
          onViewChange={onViewChange}
        />
        <Box className="module-workspace">{children}</Box>
      </Box>
      <AiosInspectorSheet resource={selectedResource} skillCapability={selectedSkillCapability} onMobileClose={onClearSelection} />
    </Box>
  );
}
