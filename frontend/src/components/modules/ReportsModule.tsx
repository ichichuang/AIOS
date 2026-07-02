import { Box, Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel, sortByUpdatedAt } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function ReportsModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => [{ title: "报告时间线", summary: "按更新时间展示本地报告摘要，避免原始密集文件列表。", resources: sortByUpdatedAt(resources) }], [resources]);

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("reports")}>
      <ModuleHeader view="reports" summary={zhCN.moduleSummaries.reports} count={resources.length}>
        <Chip label="只读时间线" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="report" timeline onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
