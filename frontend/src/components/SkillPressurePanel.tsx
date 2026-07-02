import type { AiosResource } from "../types/inventory";

interface SkillPressurePanelProps {
  resources: AiosResource[];
}

export function SkillPressurePanel({ resources }: SkillPressurePanelProps) {
  const skillResources = resources.filter((resource) => resource.capabilityType === "skill" || resource.capabilityType === "runtime-view");
  const high = skillResources.filter((resource) => resource.tokenPressure.level === "high").length;
  const medium = skillResources.filter((resource) => resource.tokenPressure.level === "medium").length;
  const low = skillResources.length - high - medium;

  return (
    <section className="side-panel">
      <h2>Skill pressure</h2>
      <div className="pressure-bars" aria-label="Token pressure distribution">
        <span className="pressure-low" style={{ flexGrow: Math.max(low, 1) }} />
        <span className="pressure-medium" style={{ flexGrow: Math.max(medium, 1) }} />
        <span className="pressure-high" style={{ flexGrow: Math.max(high, 1) }} />
      </div>
      <dl className="compact-list">
        <dt>Low</dt>
        <dd>{low}</dd>
        <dt>Medium</dt>
        <dd>{medium}</dd>
        <dt>High</dt>
        <dd>{high}</dd>
      </dl>
    </section>
  );
}
