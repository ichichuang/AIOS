import { Box, Typography } from "@mui/material";
import { translateSafetyNote } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource } from "../../types/inventory";
import { ResourceMetaRow } from "../resources/ResourceMetaRow";

interface SafetyProfilePanelProps {
  resource: AiosResource;
}

export function SafetyProfilePanel({ resource }: SafetyProfilePanelProps) {
  return (
    <Box className="inspector-panel">
      <Typography component="h3" variant="h3">
        安全画像
      </Typography>
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label={zhCN.safetyFields.readOnly} value={resource.safetyProfile.readOnly ? zhCN.booleans.yes : zhCN.booleans.no} />
        <ResourceMetaRow label={zhCN.safetyFields.writesGlobalState} value={resource.safetyProfile.writesGlobalState ? zhCN.booleans.yes : zhCN.booleans.no} />
        <ResourceMetaRow label={zhCN.safetyFields.secretExposureRisk} value={zhCN.risks[resource.safetyProfile.secretExposureRisk]} />
        <ResourceMetaRow label={zhCN.safetyFields.executionRisk} value={zhCN.risks[resource.safetyProfile.executionRisk]} />
      </Box>
      <Box className="note-list" component="ul">
        {resource.safetyProfile.notes.map((note) => (
          <li key={note}>{translateSafetyNote(note)}</li>
        ))}
      </Box>
    </Box>
  );
}
