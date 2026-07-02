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
    <nav className="resource-nav" aria-label="Resource types">
      {views.map((view) => (
        <button className={view === activeView ? "nav-item active" : "nav-item"} key={view} type="button" onClick={() => onChange(view)}>
          <span>{VIEW_LABELS[view]}</span>
          <strong>{countByView(resources, view)}</strong>
        </button>
      ))}
    </nav>
  );
}
