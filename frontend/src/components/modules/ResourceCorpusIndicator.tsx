import { Chip } from "@mui/material";
import { getCorpusSourceLabel } from "../../lib/resourceCorpus";
import type { ResourceCorpusModuleState } from "./moduleUtils";

interface ResourceCorpusIndicatorProps {
  state: ResourceCorpusModuleState;
}

export function ResourceCorpusIndicator({ state }: ResourceCorpusIndicatorProps) {
  return (
    <>
      <Chip className={state.mode === "dynamic" ? "status-chip status-ok" : undefined} label={getCorpusSourceLabel(state.mode)} variant={state.mode === "dynamic" ? "filled" : "outlined"} />
      <Chip label={state.mode === "dynamic" ? state.activeScope.label : "扫描管理启用后切换"} variant="outlined" />
    </>
  );
}
