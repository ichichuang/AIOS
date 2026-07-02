import type { AiosResource, CapabilityType } from "../types/inventory";

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
  dashboard: "Dashboard",
  skills: "Skills",
  mcp: "MCP",
  scripts: "Scripts",
  reports: "Reports",
  "project-packs": "Project-local packs",
  policies: "Policies",
  validators: "Validators",
  legacy: "Legacy"
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
  if (view === "legacy") return resource.toolType === "legacy";
  const capabilities = capabilityByView[view];
  return capabilities ? capabilities.includes(resource.capabilityType) : true;
}

export function filterResources(resources: AiosResource[], view: ResourceView, query: string): AiosResource[] {
  const normalized = query.trim().toLowerCase();
  return resources.filter((resource) => {
    if (!belongsToView(resource, view)) return false;
    if (!normalized) return true;
    const haystack = [resource.name, resource.toolType, resource.capabilityType, resource.status, resource.risk, resource.path, resource.description]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function countByView(resources: AiosResource[], view: ResourceView): number {
  return resources.filter((resource) => belongsToView(resource, view)).length;
}
