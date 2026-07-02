import { Card, Text } from "@radix-ui/themes";
import { zhCN } from "../i18n/zh-CN";
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
      <h2>{zhCN.skillPressure.title}</h2>
      <Text as="p" className="muted" size="2">
        {zhCN.skillPressure.summary}
      </Text>
      <div className="pressure-bars" aria-label="Token 压力分布">
        <span className="pressure-low" style={{ flexGrow: Math.max(low, 1) }} />
        <span className="pressure-medium" style={{ flexGrow: Math.max(medium, 1) }} />
        <span className="pressure-high" style={{ flexGrow: Math.max(high, 1) }} />
      </div>
      <div className="pressure-grid">
        <Card className="pressure-card" size="1">
          <Text as="p">{zhCN.skillPressure.low}</Text>
          <strong>{low}</strong>
        </Card>
        <Card className="pressure-card" size="1">
          <Text as="p">{zhCN.skillPressure.medium}</Text>
          <strong>{medium}</strong>
        </Card>
        <Card className="pressure-card" size="1">
          <Text as="p">{zhCN.skillPressure.high}</Text>
          <strong>{high}</strong>
        </Card>
      </div>
    </section>
  );
}
