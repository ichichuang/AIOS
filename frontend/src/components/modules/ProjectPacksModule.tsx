import { Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup, type ResourceGroupData } from "../resources/ResourceGroup";
import { AiosModuleFrame } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

export function ProjectPacksModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => {
    const grouped = new Map<string, ResourceGroupData>();
    for (const resource of resources) {
      const area = getProjectPackArea(resource);
      const current = grouped.get(area) ?? { title: area, summary: "项目本地资源包，边界限制在本仓库或本地清单；完整源路径在检查器中。", resources: [] };
      current.resources.push(resource);
      grouped.set(area, current);
    }
    return Array.from(grouped.values());
  }, [resources]);

  return (
    <AiosModuleFrame
      view="project-packs"
      summary={zhCN.moduleSummaries["project-packs"]}
      count={resources.length}
      ariaLabel={moduleAriaLabel("project-packs")}
      actions={
        <Chip label="不复制到全局入口" variant="outlined" />
      }
    >
      {groups.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="project-pack" onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}

function getProjectPackArea(resource: { metadata?: Record<string, unknown>; path?: string }): string {
  const root = typeof resource.metadata?.root === "string" ? resource.metadata.root : resource.path ?? "";
  if (root.includes("/AIOS")) return "AIOS 应用仓库";
  if (root.includes("/.ai")) return "本地 AI 工作区";
  return "项目本地资源";
}
