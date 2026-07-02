import { Box, Chip } from "@mui/material";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { makeGroups, moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function LegacyModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = makeGroups(
    resources,
    [
      { title: "旧入口提示", summary: "保留旧提示和兼容资源的可见性，不作为主工作流。", predicate: (resource) => resource.capabilityType === "usage-prompt" },
      { title: "兼容视图", summary: "旧入口仅用于识别迁移边界。", predicate: (resource) => resource.toolType === "legacy" }
    ],
    { title: "其他兼容资源", summary: "仅展示元数据，不恢复旧基线。" }
  );

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("legacy")}>
      <ModuleHeader view="legacy" summary={zhCN.moduleSummaries.legacy} count={resources.length}>
        <Chip label="兼容说明，不恢复" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        {groups.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="legacy" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
