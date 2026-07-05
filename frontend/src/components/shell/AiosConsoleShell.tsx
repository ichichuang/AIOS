import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AiosInventory, AiosResource } from "../../types/inventory";
import type { ResourceView } from "../../lib/filtering";
import type { ResourceCorpusScope, ResourceCorpusSourceMode, ResourceCorpusSummary } from "../../lib/resourceCorpus";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { AiosInspectorSheet } from "./AiosInspectorSheet";
import { AiosNavigationRail } from "./AiosNavigationRail";
import { AiosResourceScopeBar } from "./AiosResourceScopeBar";
import { AiosTopCommandBar } from "./AiosTopCommandBar";

interface AiosConsoleShellProps {
  activeView: ResourceView;
  activeScopeId: string;
  children: ReactNode;
  corpusError: string | null;
  corpusLoading: boolean;
  corpusMode: ResourceCorpusSourceMode;
  corpusScopes: ResourceCorpusScope[];
  corpusSummary: ResourceCorpusSummary;
  inventory: AiosInventory;
  query: string;
  selectedResource: AiosResource | null;
  selectedSkillIdentity: SkillIdentityRow | null;
  selectedSkillCapability: SkillCapabilityClassification | null;
  shownCount: number;
  viewCounts: Record<ResourceView, number>;
  onClearSelection: () => void;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: ResourceCorpusScope) => void;
  onViewChange: (view: ResourceView) => void;
}

export function AiosConsoleShell({
  activeView,
  activeScopeId,
  children,
  corpusError,
  corpusLoading,
  corpusMode,
  corpusScopes,
  corpusSummary,
  inventory,
  query,
  selectedResource,
  selectedSkillIdentity,
  selectedSkillCapability,
  shownCount,
  viewCounts,
  onClearSelection,
  onQueryChange,
  onScopeChange,
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
        <AiosResourceScopeBar
          activeScopeId={activeScopeId}
          error={corpusError}
          loading={corpusLoading}
          mode={corpusMode}
          scopes={corpusScopes}
          summary={corpusSummary}
          onScopeChange={onScopeChange}
        />
        <Box className="module-workspace">{children}</Box>
      </Box>
      <AiosInspectorSheet
        activeView={activeView}
        resource={selectedResource}
        skillIdentity={selectedSkillIdentity}
        skillCapability={selectedSkillCapability}
        visibleCount={shownCount}
        onMobileClose={onClearSelection}
      />
    </Box>
  );
}
