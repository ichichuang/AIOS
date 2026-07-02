import { Badge, Card, Flex, Text } from "@radix-ui/themes";
import { useMemo, useRef } from "react";
import { countByView, type ResourceView, VIEW_LABELS } from "../lib/filtering";
import { useCardEntrance } from "../lib/useAiosMotion";
import { zhCN } from "../i18n/zh-CN";
import type { AiosResource } from "../types/inventory";

const moduleViews: ResourceView[] = ["dashboard", "skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators"];

interface ModuleOverviewProps {
  resources: AiosResource[];
  activeView: ResourceView;
  onChange: (view: ResourceView) => void;
}

export function ModuleOverview({ resources, activeView, onChange }: ModuleOverviewProps) {
  const overviewRef = useRef<HTMLElement>(null);
  const motionKey = useMemo(() => moduleViews.map((view) => `${view}:${countByView(resources, view)}`).join("|"), [resources]);
  useCardEntrance(overviewRef, motionKey, "[data-motion='module-card']");

  return (
    <section className="module-overview" ref={overviewRef} aria-label={zhCN.app.moduleOverview}>
      <Flex align="center" justify="between" gap="3" className="section-heading">
        <div>
          <h2>{zhCN.app.moduleOverview}</h2>
          <p>{zhCN.moduleSummaries.dashboard}</p>
        </div>
        <Badge variant="soft">
          {resources.length} {zhCN.app.total}
        </Badge>
      </Flex>
      <div className="module-grid">
        {moduleViews.map((view) => {
          const count = countByView(resources, view);
          const active = view === activeView;
          return (
            <Card asChild className={active ? "module-card active" : "module-card"} data-motion="module-card" key={view} size="2">
              <button aria-pressed={active} type="button" onClick={() => onChange(view)}>
                <Text as="div" weight="bold">
                  {VIEW_LABELS[view]}
                </Text>
                <strong>{count}</strong>
                <p>{zhCN.moduleSummaries[view]}</p>
              </button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
