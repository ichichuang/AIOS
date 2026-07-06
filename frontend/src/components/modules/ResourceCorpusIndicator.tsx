import { Chip } from "@mui/material";
import { getScopeViewingLabel } from "../../lib/resourceCorpus";
import type { ResourceCorpusModuleState } from "./moduleUtils";

interface ResourceCorpusIndicatorProps {
  state: ResourceCorpusModuleState;
}

export function ResourceCorpusIndicator({ state }: ResourceCorpusIndicatorProps) {
  const activeSource = state.dataSource.activeSource;
  const detailLabel =
    activeSource === "dynamic-corpus"
      ? `本机结果 · ${state.dataSource.dynamicResourceCount} 项`
      : activeSource === "legacy-snapshot"
        ? "历史示例"
        : "还没有查找";
  const viewingLabel = getScopeViewingLabel(state.activeScope, state.mode);
  return (
    <>
      <Chip className={activeSource === "dynamic-corpus" ? "status-chip status-ok" : activeSource === "legacy-snapshot" ? "status-chip status-warn" : undefined} label={state.dataSource.displayLabel} variant={activeSource === "dynamic-corpus" ? "filled" : "outlined"} />
      <Chip label={viewingLabel} variant="outlined" />
      <Chip label={detailLabel} variant="outlined" />
    </>
  );
}
