import { getMcpGroup } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { ResourceView } from "../../lib/filtering";
import { VIEW_LABELS } from "../../lib/filtering";
import type { AiosResource, BaselineSummary, McpServerRecord, RiskLevel } from "../../types/inventory";
import type { ResourceGroupData } from "../resources/ResourceGroup";

export interface AiosModuleProps {
  allResources: AiosResource[];
  baseline: BaselineSummary;
  query: string;
  resources: AiosResource[];
  selectedId: string | null;
  viewCounts: Record<ResourceView, number>;
  onClearSelection: () => void;
  onSelect: (resource: AiosResource) => void;
  onViewChange: (view: ResourceView) => void;
}

export function sortByUpdatedAt(resources: AiosResource[]): AiosResource[] {
  return [...resources].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
}

export function riskCounts(resources: AiosResource[]): Record<RiskLevel, number> {
  return resources.reduce<Record<RiskLevel, number>>(
    (counts, resource) => {
      counts[resource.risk] += 1;
      return counts;
    },
    { low: 0, medium: 0, high: 0 }
  );
}

export function makeGroups(resources: AiosResource[], definitions: Array<{ title: string; summary: string; predicate: (resource: AiosResource) => boolean }>, fallback?: { title: string; summary: string }): ResourceGroupData[] {
  const assigned = new Set<string>();
  const groups = definitions.map((definition) => {
    const groupResources = resources.filter((resource) => {
      const matched = definition.predicate(resource);
      if (matched) assigned.add(resource.id);
      return matched;
    });
    return { title: definition.title, summary: definition.summary, resources: groupResources };
  });

  if (fallback) {
    const other = resources.filter((resource) => !assigned.has(resource.id));
    groups.push({ title: fallback.title, summary: fallback.summary, resources: other });
  }

  return groups.filter((group) => group.resources.length > 0);
}

export function getMcpServer(resource: AiosResource): McpServerRecord | null {
  const server = resource.metadata?.server;
  if (!server || typeof server !== "object") return null;
  const candidate = server as Partial<McpServerRecord>;
  if (typeof candidate.name !== "string" || typeof candidate.command !== "string") return null;
  return candidate as McpServerRecord;
}

export function getMcpGroups(resources: AiosResource[]): ResourceGroupData[] {
  const order = ["credential", "npx", "remote", "local", "unknown"] as const;
  return order
    .map((group) => ({
      title: zhCN.mcp.groups[group],
      summary: zhCN.mcp.groupSummaries[group],
      resources: resources.filter((resource) => {
        const server = getMcpServer(resource);
        return server ? getMcpGroup(server) === group : group === "unknown";
      })
    }))
    .filter((group) => group.resources.length > 0);
}

export function moduleAriaLabel(view: ResourceView): string {
  return `${VIEW_LABELS[view]}模块`;
}
