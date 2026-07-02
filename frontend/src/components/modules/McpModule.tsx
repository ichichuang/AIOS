import { Box, Chip } from "@mui/material";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { getMcpGroups, moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function McpModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = getMcpGroups(resources);

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("mcp")}>
      <ModuleHeader view="mcp" summary={zhCN.moduleSummaries.mcp} count={resources.length}>
        <Chip label="不连接服务" variant="outlined" />
        <Chip label="仅显示环境变量名数量" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        {groups.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="mcp" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
