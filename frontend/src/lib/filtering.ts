import type { AiosResource, CapabilityType } from "../types/inventory";
import { zhCN } from "../i18n/zh-CN";
import { getResourceDisplay } from "../i18n/resourceText";

export type ResourceView =
  | "dashboard"
  | "skills"
  | "mcp"
  | "scripts"
  | "reports"
  | "project-packs"
  | "policies"
  | "validators"
  | "legacy";

export const VIEW_LABELS: Record<ResourceView, string> = {
  dashboard: zhCN.views.dashboard,
  skills: zhCN.views.skills,
  mcp: zhCN.views.mcp,
  scripts: zhCN.views.scripts,
  reports: zhCN.views.reports,
  "project-packs": zhCN.views["project-packs"],
  policies: zhCN.views.policies,
  validators: zhCN.views.validators,
  legacy: zhCN.views.legacy
};

const capabilityByView: Partial<Record<ResourceView, CapabilityType[]>> = {
  skills: ["skill", "runtime-view", "registry"],
  mcp: ["mcp-server", "mcp-client"],
  scripts: ["script"],
  reports: ["report"],
  "project-packs": ["project-pack"],
  policies: ["policy"],
  validators: ["validator"],
  legacy: ["usage-prompt"]
};

export function belongsToView(resource: AiosResource, view: ResourceView): boolean {
  if (view === "dashboard") return true;
  if (view === "legacy") return resource.toolType === "legacy" || resource.capabilityType === "usage-prompt";
  const capabilities = capabilityByView[view];
  return capabilities ? capabilities.includes(resource.capabilityType) : true;
}

export function filterResources(resources: AiosResource[], view: ResourceView, query: string): AiosResource[] {
  const normalized = query.trim().toLowerCase();
  return resources.filter((resource) => {
    if (!belongsToView(resource, view)) return false;
    if (!normalized) return true;
    const display = getResourceDisplay(resource);
    const haystack = [
      resource.name,
      resource.toolType,
      resource.capabilityType,
      resource.status,
      resource.risk,
      resource.path,
      ...resource.paths,
      resource.description,
      display.zhName,
      display.zhDescription,
      display.zhCategory,
      display.zhStatus,
      display.zhRisk
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function countByView(resources: AiosResource[], view: ResourceView): number {
  return resources.filter((resource) => belongsToView(resource, view)).length;
}
