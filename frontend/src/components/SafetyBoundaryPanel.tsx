import { Badge, Card, Text } from "@radix-ui/themes";
import { translateKnownWarning, translateValidatorSummary } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import type { BaselineSummary } from "../types/inventory";

interface SafetyBoundaryPanelProps {
  baseline: BaselineSummary;
}

export function SafetyBoundaryPanel({ baseline }: SafetyBoundaryPanelProps) {
  return (
    <section className="side-panel">
      <h2>{zhCN.safetyBoundaries.title}</h2>
      <ul className="note-list">
        {zhCN.safetyBoundaries.items.map((boundary) => (
          <li key={boundary}>{boundary}</li>
        ))}
      </ul>
      <div className="known-warnings">
        <h3>{zhCN.validators.title}</h3>
        {baseline.validators.map((validator) => (
          <Card className="validator-card" key={validator.name} size="1">
            <Text as="div" weight="bold">
              {validator.name}
            </Text>
            <Badge className={`status-chip status-${validator.status}`} variant="soft">
              {zhCN.statuses[validator.status]}
            </Badge>
            <p>{translateValidatorSummary(validator)}</p>
          </Card>
        ))}
      </div>
      <div className="known-warnings">
        <h3>{zhCN.safetyBoundaries.knownWarnings}</h3>
        {baseline.knownWarnings.map((warning) => (
          <p key={warning}>{translateKnownWarning(warning)}</p>
        ))}
      </div>
    </section>
  );
}
