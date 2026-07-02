import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { translateKnownWarning, translateValidatorSummary } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import type { BaselineSummary } from "../types/inventory";

interface SafetyBoundaryPanelProps {
  baseline: BaselineSummary;
}

export function SafetyBoundaryPanel({ baseline }: SafetyBoundaryPanelProps) {
  return (
    <Box className="side-panel" component="section">
      <Typography component="h2" variant="h3">
        {zhCN.safetyBoundaries.title}
      </Typography>
      <Box className="note-list" component="ul">
        {zhCN.safetyBoundaries.items.map((boundary) => (
          <li key={boundary}>{boundary}</li>
        ))}
      </Box>
      <Box className="known-warnings">
        <Typography component="h3" variant="h3">
          {zhCN.validators.title}
        </Typography>
        {baseline.validators.map((validator) => (
          <Card className="validator-card" key={validator.name}>
            <CardContent>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Typography component="strong">{validator.name}</Typography>
                <Chip className={`status-chip status-${validator.status}`} label={zhCN.statuses[validator.status]} />
              </Stack>
              <Typography color="text.secondary" variant="body2">
                {translateValidatorSummary(validator)}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
      <Box className="known-warnings">
        <Typography component="h3" variant="h3">
          {zhCN.safetyBoundaries.knownWarnings}
        </Typography>
        {baseline.knownWarnings.map((warning) => (
          <Typography color="text.secondary" key={warning} variant="body2">
            {translateKnownWarning(warning)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
