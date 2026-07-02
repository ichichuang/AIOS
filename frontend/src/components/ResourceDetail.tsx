import { Box, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
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
      <Card className="detail-panel" component="section" ref={detailRef}>
        <CardContent>
          <Typography component="h2" variant="h3">
            {zhCN.app.detailPanel}
          </Typography>
          <Typography color="text.secondary">{zhCN.app.inspectorEmpty}</Typography>
        </CardContent>
      </Card>
    );
  }

  const display = getResourceDisplay(resource);

  return (
    <Card className="detail-panel" component="section" ref={detailRef}>
      <CardContent>
        <Stack className="detail-title" direction="row" spacing={1.5} sx={{ justifyContent: "space-between" }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography className="caption" component="p">
              {display.zhCategory}
            </Typography>
            <Typography component="h2" variant="h2">
              {display.zhName}
            </Typography>
            <Box className="code-pill" component="code">
              {display.technicalName}
            </Box>
          </Box>
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
        </Stack>

        <Typography className="detail-description" color="text.secondary">
          {display.zhDescription}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {display.zhRiskDescription}
        </Typography>

        <Divider />

        <DetailBlock title={zhCN.app.pathPreview}>
          {resource.paths.length > 0 ? (
            resource.paths.map((item) => (
              <Box className="code-pill path-detail" component="code" key={item}>
                {item}
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">{zhCN.app.noPath}</Typography>
          )}
        </DetailBlock>

        <DetailBlock title={zhCN.safetyFields.notes}>
          <Box className="detail-grid" component="dl">
            <Typography component="dt">{zhCN.safetyFields.readOnly}</Typography>
            <Typography component="dd">{resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no}</Typography>
            <Typography component="dt">{zhCN.safetyFields.writesGlobalState}</Typography>
            <Typography component="dd">{resource.safetyProfile.writesGlobalState ? zhCN.booleans.yes : zhCN.booleans.no}</Typography>
            <Typography component="dt">{zhCN.safetyFields.secretExposureRisk}</Typography>
            <Typography component="dd">{zhCN.risks[resource.safetyProfile.secretExposureRisk]}</Typography>
            <Typography component="dt">{zhCN.safetyFields.executionRisk}</Typography>
            <Typography component="dd">{zhCN.risks[resource.safetyProfile.executionRisk]}</Typography>
          </Box>
          <Box className="note-list" component="ul">
            {resource.safetyProfile.notes.map((note) => (
              <li key={note}>{translateSafetyNote(note)}</li>
            ))}
          </Box>
        </DetailBlock>

        <DetailBlock title={zhCN.tokenFields.title}>
          <Box className="detail-grid" component="dl">
            <Typography component="dt">{zhCN.tokenFields.level}</Typography>
            <Typography component="dd">{zhCN.risks[resource.tokenPressure.level]}</Typography>
            <Typography component="dt">{zhCN.tokenFields.estimatedTokens}</Typography>
            <Typography component="dd">{resource.tokenPressure.estimatedTokens}</Typography>
          </Box>
          <Typography color="text.secondary" variant="body2">
            {translateTokenReason(resource.tokenPressure.reason)}
          </Typography>
        </DetailBlock>

        <DetailBlock title={zhCN.app.copyPrompt}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            <PromptCopyButton prompt={resource.prompts.find((prompt) => prompt.target === "codex")} target="codex" />
            <PromptCopyButton prompt={resource.prompts.find((prompt) => prompt.target === "claude")} target="claude" />
          </Stack>
          {resource.prompts.length > 0 && (
            <Typography color="text.secondary" variant="body2">
              {zhCN.app.promptBodyEnglish}
            </Typography>
          )}
        </DetailBlock>
      </CardContent>
    </Card>
  );
}

interface DetailBlockProps {
  title: string;
  children: ReactNode;
}

function DetailBlock({ title, children }: DetailBlockProps) {
  return (
    <Box className="detail-block">
      <Typography component="h3" variant="h3">
        {title}
      </Typography>
      {children}
    </Box>
  );
}
