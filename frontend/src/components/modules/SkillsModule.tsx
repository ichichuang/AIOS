import { Box, Chip } from "@mui/material";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { makeGroups, moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function SkillsModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = makeGroups(
    resources,
    [
      { title: "Codex 入口", summary: "Codex 活跃技能入口和相关运行时视图。", predicate: (resource) => resource.toolType === "codex" },
      { title: "Agents 入口", summary: "Agents 兼容入口，仅展示元数据。", predicate: (resource) => resource.toolType === "agents" },
      { title: "Claude 入口", summary: "Claude 技能视图，保留原始技能名。", predicate: (resource) => resource.toolType === "claude" },
      { title: "注册表与路由", summary: "自定义技能注册表和路由资源。", predicate: (resource) => resource.capabilityType === "registry" || resource.name.includes("router") },
      { title: "规范技能", summary: "来自 canonical skill modules 的技能元数据。", predicate: (resource) => resource.toolType === "aios-root" && resource.capabilityType === "skill" }
    ],
    { title: "运行时视图", summary: "其他运行时入口与技能映射。" }
  );

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("skills")}>
      <ModuleHeader view="skills" summary={zhCN.moduleSummaries.skills} count={resources.length}>
        <Chip label="提示词复制需显式点击" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        {groups.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="skill" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
