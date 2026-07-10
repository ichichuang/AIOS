import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { AiosResource } from "../../types/inventory";
import type { ResourceView } from "../../lib/filtering";
import { isAdvancedView, type ProductShellTopBarSummary } from "../../lib/productShell";
import { type ResourceCorpusScope, type ResourceCorpusSourceMode, type ResourceCorpusSummary } from "../../lib/resourceCorpus";
import type { McpServiceDetailRuntimeState } from "../../lib/mcpLibrary";
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
  query: string;
  selectedResource: AiosResource | null;
  selectedSkillIdentity: SkillIdentityRow | null;
  selectedSkillCapability: SkillCapabilityClassification | null;
  mcpDetailState: McpServiceDetailRuntimeState | null;
  skillDetailState: SkillDetailRuntimeState | null;
  shownCount: number;
  inspectorVisibleCount?: number;
  topBarSummary: ProductShellTopBarSummary;
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
  query,
  selectedResource,
  selectedSkillIdentity,
  selectedSkillCapability,
  mcpDetailState,
  skillDetailState,
  shownCount,
  inspectorVisibleCount,
  topBarSummary,
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
      <Box
        ref={rootRef}
        className={`aios-console-shell ${inspectorOpen ? "inspector-open" : ""} ${activeView === "skills" ? "aios-console-shell--skills" : ""}`.trim()}
      >
        <AiosNavigationRail activeView={activeView} viewCounts={viewCounts} onChange={onViewChange} />
        <Box ref={mainRef} className="aios-console-main">
          <Box ref={topBarRef}>
            <AiosTopCommandBar
              activeView={activeView}
              query={query}
              summary={topBarSummary}
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
            mcpDetailState={mcpDetailState}
            skillDetailState={skillDetailState}
            visibleCount={inspectorVisibleCount ?? shownCount}
            onMobileClose={onClearSelection}
          />
        )}
      </Box>
    </AiosLayoutProvider>
  );
}
