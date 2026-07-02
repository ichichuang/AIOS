import { Badge, Tabs } from "@radix-ui/themes";
import { countByView, type ResourceView, VIEW_LABELS } from "../lib/filtering";
import type { AiosResource } from "../types/inventory";

const views: ResourceView[] = ["dashboard", "skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

interface ResourceTypeNavProps {
  resources: AiosResource[];
  activeView: ResourceView;
  onChange: (view: ResourceView) => void;
}

export function ResourceTypeNav({ resources, activeView, onChange }: ResourceTypeNavProps) {
  return (
    <Tabs.Root value={activeView} onValueChange={(view) => onChange(view as ResourceView)}>
      <Tabs.List className="resource-nav" aria-label="资源模块">
        {views.map((view) => (
          <Tabs.Trigger className="nav-item" key={view} value={view}>
            <span>{VIEW_LABELS[view]}</span>
            <Badge variant="soft">{countByView(resources, view)}</Badge>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
