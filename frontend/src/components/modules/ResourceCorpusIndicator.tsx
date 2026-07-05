import { Chip } from "@mui/material";
import type { ResourceCorpusModuleState } from "./moduleUtils";

interface ResourceCorpusIndicatorProps {
  state: ResourceCorpusModuleState;
}

export function ResourceCorpusIndicator({ state }: ResourceCorpusIndicatorProps) {
  const activeSource = state.dataSource.activeSource;
  const detailLabel =
    activeSource === "dynamic-corpus"
      ? `本机已有 AIOS 本地资源库 · ${state.dataSource.dynamicResourceCount}`
      : activeSource === "legacy-snapshot"
        ? "示例 / 不代表本机扫描"
        : "尚未扫描任何目录";
  return (
    <>
      <Chip className={activeSource === "dynamic-corpus" ? "status-chip status-ok" : activeSource === "legacy-snapshot" ? "status-chip status-warn" : undefined} label={state.dataSource.displayLabel} variant={activeSource === "dynamic-corpus" ? "filled" : "outlined"} />
      <Chip label={detailLabel} variant="outlined" />
    </>
  );
}
