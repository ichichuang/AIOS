import { Badge, Card, Code, Flex, Text } from "@radix-ui/themes";
import { useMemo, useRef } from "react";
import { getResourceDisplay } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import type { ResourceView } from "../lib/filtering";
import { useCardEntrance } from "../lib/useAiosMotion";
import type { AiosResource } from "../types/inventory";

interface ResourceListProps {
  resources: AiosResource[];
  selectedId: string | null;
  activeView: ResourceView;
  onSelect: (resource: AiosResource) => void;
}

export function ResourceList({ resources, selectedId, activeView, onSelect }: ResourceListProps) {
  const listRef = useRef<HTMLElement>(null);
  const motionKey = useMemo(() => resources.map((resource) => resource.id).join("|"), [resources]);
  useCardEntrance(listRef, motionKey, "[data-motion='resource-card']");

  return (
    <section className="resource-list-panel" ref={listRef}>
      <div className="table-heading">
        <div>
          <h2>{zhCN.app.resourceList}</h2>
          <p>{zhCN.moduleSummaries[activeView]}</p>
        </div>
        <Badge variant="soft">
          {resources.length} {zhCN.app.shown}
        </Badge>
      </div>
      <div className="resource-scroll">
        {resources.length === 0 ? (
          <div className="empty-state">
            <h3>{zhCN.app.emptyTitle}</h3>
            <p>{zhCN.app.emptyBody}</p>
          </div>
        ) : (
          resources.map((resource) => {
            const display = getResourceDisplay(resource);
            const selected = resource.id === selectedId;
            return (
              <Card asChild className={selected ? "resource-card selected" : "resource-card"} data-motion="resource-card" key={resource.id} size="2">
                <button aria-pressed={selected} data-group={display.uiGroup} type="button" onClick={() => onSelect(resource)}>
                  <Flex align="start" justify="between" gap="3">
                    <div className="resource-card-title">
                      <Text as="div" weight="bold">
                        {display.zhName}
                      </Text>
                      <Code>{display.technicalName}</Code>
                    </div>
                    <Flex className="resource-card-badges" gap="2" wrap="wrap" justify="end">
                      <Badge className={`status-chip status-${resource.status}`} variant="soft">
                        {display.zhStatus}
                      </Badge>
                      <Badge className={`risk-chip risk-${resource.risk}`} variant="soft">
                        {display.zhRisk}
                      </Badge>
                    </Flex>
                  </Flex>
                  <p className="resource-description">{display.zhDescription}</p>
                  <Flex align="center" justify="between" gap="3" className="resource-card-footer">
                    <span>{display.zhCategory}</span>
                    <Code className="path-cell">{display.pathPreview}</Code>
                  </Flex>
                </button>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}
