import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AiosInventory, AiosResource } from "../../types/inventory";
import type { ResourceView } from "../../lib/filtering";
import { isAdvancedView } from "../../lib/productShell";
import { getCorpusSourceLabel, type ResourceCorpusScope, type ResourceCorpusSourceMode, type ResourceCorpusSummary } from "../../lib/resourceCorpus";
import type { SkillDetailRuntimeState } from "../../lib/skillLibrary";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { AiosLayoutProvider, useAiosLayoutMetrics } from "../../lib/useAiosLayoutMetrics";
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
  skillDetailState: SkillDetailRuntimeState | null;
  shownCount: number;
  inspectorVisibleCount?: number;
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
  skillDetailState,
  shownCount,
  inspectorVisibleCount,
  viewCounts,
  onClearSelection,
  onQueryChange,
  onScopeChange,
  onViewChange
}: AiosConsoleShellProps) {
  const inspectorOpen = Boolean(selectedResource);
  const metrics = useAiosLayoutMetrics();
  const { rootRef, mainRef, topBarRef, scopeBarRef } = metrics;

  return (
    <AiosLayoutProvider value={metrics}>
      <Box ref={rootRef} className={inspectorOpen ? "aios-console-shell inspector-open" : "aios-console-shell"}>
        <AiosNavigationRail activeView={activeView} viewCounts={viewCounts} onChange={onViewChange} />
        <Box ref={mainRef} className="aios-console-main">
          <Box ref={topBarRef}>
            <AiosTopCommandBar
              activeView={activeView}
              inventory={inventory}
              query={query}
              shownCount={shownCount}
              sourceLabel={getCorpusSourceLabel(corpusMode)}
              onQueryChange={onQueryChange}
              onViewChange={onViewChange}
            />
          </Box>
          {isAdvancedView(activeView) && (
            <Box ref={scopeBarRef}>
              <AiosResourceScopeBar
                activeScopeId={activeScopeId}
                error={corpusError}
                loading={corpusLoading}
                mode={corpusMode}
                scopes={corpusScopes}
                summary={corpusSummary}
                onScopeChange={onScopeChange}
              />
            </Box>
          )}
          <Box className="module-workspace">{children}</Box>
        </Box>
        {inspectorOpen && (
          <AiosInspectorSheet
            activeView={activeView}
            resource={selectedResource}
            skillIdentity={selectedSkillIdentity}
            skillCapability={selectedSkillCapability}
            skillDetailState={skillDetailState}
            visibleCount={inspectorVisibleCount ?? shownCount}
            onMobileClose={onClearSelection}
          />
        )}
      </Box>
    </AiosLayoutProvider>
  );
}
