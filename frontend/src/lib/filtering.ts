import type { AiosResource, CapabilityType } from "../types/inventory";
import { zhCN } from "../i18n/zh-CN";
import { getResourceDisplay, type ResourceDisplay } from "../i18n/resourceText";
import { getSkillMetadataSearchText } from "./skillDiscoveryMetadata";

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
  skills: ["skill", "runtime-view", "registry", "project-pack"],
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
  return filterResourceList(resources.filter((resource) => belongsToView(resource, view)), query);
}

export function filterResourceList(
  resources: AiosResource[],
  query: string,
  displayById?: ReadonlyMap<string, ResourceDisplay>,
  searchTextById?: ReadonlyMap<string, string>
): AiosResource[] {
  const normalized = query.trim().toLowerCase();
  return resources.filter((resource) => {
    if (!normalized) return true;
    const display = displayById?.get(resource.id) ?? getResourceDisplay(resource);
    const haystack = [
      resource.name,
      resource.toolType,
      resource.capabilityType,
      resource.status,
      resource.risk,
      resource.path,
      ...resource.paths,
      resource.description,
      getSkillMetadataSearchText(resource),
      display.zhName,
      display.zhDescription,
      display.zhCategory,
      display.zhStatus,
      display.zhRisk,
      searchTextById?.get(resource.id)
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

export function buildResourceDisplayMap(resources: AiosResource[]): Map<string, ResourceDisplay> {
  return new Map(resources.map((resource) => [resource.id, getResourceDisplay(resource)]));
}

export function buildResourcesByView(resources: AiosResource[]): Record<ResourceView, AiosResource[]> {
  return {
    dashboard: resources,
    skills: resources.filter((resource) => belongsToView(resource, "skills")),
    mcp: resources.filter((resource) => belongsToView(resource, "mcp")),
    scripts: resources.filter((resource) => belongsToView(resource, "scripts")),
    reports: resources.filter((resource) => belongsToView(resource, "reports")),
    "project-packs": resources.filter((resource) => belongsToView(resource, "project-packs")),
    policies: resources.filter((resource) => belongsToView(resource, "policies")),
    validators: resources.filter((resource) => belongsToView(resource, "validators")),
    legacy: resources.filter((resource) => belongsToView(resource, "legacy"))
  };
}

export function countResourcesByView(resourcesByView: Record<ResourceView, AiosResource[]>): Record<ResourceView, number> {
  return Object.fromEntries(Object.entries(resourcesByView).map(([view, resources]) => [view, resources.length])) as Record<ResourceView, number>;
}
