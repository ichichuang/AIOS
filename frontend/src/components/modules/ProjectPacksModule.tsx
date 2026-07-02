import { Box, Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup, type ResourceGroupData } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function ProjectPacksModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => {
    const grouped = new Map<string, ResourceGroupData>();
    for (const resource of resources) {
      const root = typeof resource.metadata?.root === "string" ? resource.metadata.root : "未记录根目录";
      const current = grouped.get(root) ?? { title: root, summary: "项目本地资源包，边界限制在本仓库或本地清单。", resources: [] };
      current.resources.push(resource);
      grouped.set(root, current);
    }
    return Array.from(grouped.values());
  }, [resources]);

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("project-packs")}>
      <ModuleHeader view="project-packs" summary={zhCN.moduleSummaries["project-packs"]} count={resources.length}>
        <Chip label="不复制到全局入口" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        {groups.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="project-pack" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
