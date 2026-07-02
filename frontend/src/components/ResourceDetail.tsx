import { Badge, Card, Code, Flex, Separator, Text } from "@radix-ui/themes";
import { useRef } from "react";
import { getResourceDisplay, translateSafetyNote, translateTokenReason } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import { useDetailSwitch } from "../lib/useAiosMotion";
import { PromptCopyButton } from "./PromptCopyButton";
import type { AiosResource } from "../types/inventory";

interface ResourceDetailProps {
  resource: AiosResource | null;
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  const detailRef = useRef<HTMLElement>(null);
  useDetailSwitch(detailRef, resource?.id ?? "empty");

  if (!resource) {
    return (
      <Card asChild className="detail-panel" size="3">
        <section ref={detailRef}>
          <h2>{zhCN.app.detailPanel}</h2>
          <p className="muted">{zhCN.app.inspectorEmpty}</p>
        </section>
      </Card>
    );
  }

  const display = getResourceDisplay(resource);

  return (
    <Card asChild className="detail-panel" size="3">
    <section ref={detailRef}>
      <div className="detail-title">
        <div>
          <p className="caption">{display.zhCategory}</p>
          <h2>{display.zhName}</h2>
          <Code>{display.technicalName}</Code>
        </div>
        <Badge className={`risk-chip risk-${resource.risk}`} variant="soft">
          {display.zhRisk}
        </Badge>
      </div>

      <p className="detail-description">{display.zhDescription}</p>
      <p className="muted">{display.zhRiskDescription}</p>

      <Separator size="4" />

      <div className="detail-block">
        <h3>{zhCN.app.pathPreview}</h3>
        {resource.paths.length > 0 ? (
          resource.paths.map((item) => <Code key={item}>{item}</Code>)
        ) : (
          <span className="muted">{zhCN.app.noPath}</span>
        )}
      </div>

      <div className="detail-block">
        <h3>{zhCN.safetyFields.notes}</h3>
        <dl className="detail-grid">
          <dt>{zhCN.safetyFields.readOnly}</dt>
          <dd>{resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no}</dd>
          <dt>{zhCN.safetyFields.writesGlobalState}</dt>
          <dd>{resource.safetyProfile.writesGlobalState ? zhCN.booleans.yes : zhCN.booleans.no}</dd>
          <dt>{zhCN.safetyFields.secretExposureRisk}</dt>
          <dd>{zhCN.risks[resource.safetyProfile.secretExposureRisk]}</dd>
          <dt>{zhCN.safetyFields.executionRisk}</dt>
          <dd>{zhCN.risks[resource.safetyProfile.executionRisk]}</dd>
        </dl>
        <ul className="note-list">
          {resource.safetyProfile.notes.map((note) => (
            <li key={note}>{translateSafetyNote(note)}</li>
          ))}
        </ul>
      </div>

      <div className="detail-block">
        <h3>{zhCN.tokenFields.title}</h3>
        <dl className="detail-grid">
          <dt>{zhCN.tokenFields.level}</dt>
          <dd>{zhCN.risks[resource.tokenPressure.level]}</dd>
          <dt>{zhCN.tokenFields.estimatedTokens}</dt>
          <dd>{resource.tokenPressure.estimatedTokens}</dd>
        </dl>
        <span className="muted">{translateTokenReason(resource.tokenPressure.reason)}</span>
      </div>

      <div className="detail-block">
        <h3>{zhCN.app.copyPrompt}</h3>
        <div className="prompt-list">
          {resource.prompts.length > 0 ? (
            resource.prompts.map((prompt) => <PromptCopyButton key={`${resource.id}-${prompt.target}-${prompt.title}`} prompt={prompt} />)
          ) : (
            <Text className="muted" size="2">
              {zhCN.app.notAvailable}
            </Text>
          )}
        </div>
        {resource.prompts.length > 0 && <p className="muted">{zhCN.app.promptBodyEnglish}</p>}
      </div>
    </section>
    </Card>
  );
}
