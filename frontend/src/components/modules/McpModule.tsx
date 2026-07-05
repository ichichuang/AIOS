import { Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosModuleFrame } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { getMcpGroups, moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

export function McpModule({ resourceCorpus, resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => getMcpGroups(resources), [resources]);

  return (
    <AiosModuleFrame
      view="mcp"
      summary={zhCN.moduleSummaries.mcp}
      count={resources.length}
      ariaLabel={moduleAriaLabel("mcp")}
      actions={
        <>
          <ResourceCorpusIndicator state={resourceCorpus} />
          <Chip label="不连接服务" variant="outlined" />
          <Chip label="仅显示环境变量名数量" variant="outlined" />
        </>
      }
    >
      {groups.length === 0 ? <ModuleEmptyState {...moduleEmptyStateCopy("mcp")} /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="mcp" onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}
