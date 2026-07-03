import { Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosModuleFrame } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel, sortByUpdatedAt } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

export function ReportsModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => [{ title: "报告时间线", summary: "按更新时间展示本地报告摘要，避免原始密集文件列表。", resources: sortByUpdatedAt(resources) }], [resources]);

  return (
    <AiosModuleFrame
      view="reports"
      summary={zhCN.moduleSummaries.reports}
      count={resources.length}
      ariaLabel={moduleAriaLabel("reports")}
      actions={
        <Chip label="只读时间线" variant="outlined" />
      }
    >
      {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="report" timeline onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}
