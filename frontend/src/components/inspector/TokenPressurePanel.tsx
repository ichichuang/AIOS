import { Box, LinearProgress, Typography } from "@mui/material";
import { memo } from "react";
import { translateTokenReason } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource } from "../../types/inventory";
import { ResourceMetaRow } from "../resources/ResourceMetaRow";

interface TokenPressurePanelProps {
  resource: AiosResource;
}

export const TokenPressurePanel = memo(function TokenPressurePanel({ resource }: TokenPressurePanelProps) {
  const level = resource.tokenPressure.level;
  const value = level === "high" ? 92 : level === "medium" ? 58 : 24;

  return (
    <Box className="inspector-panel">
      <Typography component="h3" variant="h3">
        {zhCN.tokenFields.title}
      </Typography>
      <LinearProgress className={`pressure-${level}`} variant="determinate" value={value} />
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label={zhCN.tokenFields.level} value={zhCN.risks[level]} />
        <ResourceMetaRow label={zhCN.tokenFields.estimatedTokens} value={resource.tokenPressure.estimatedTokens} />
      </Box>
      <Typography color="text.secondary" variant="body2">
        {translateTokenReason(resource.tokenPressure.reason)}
      </Typography>
    </Box>
  );
});
