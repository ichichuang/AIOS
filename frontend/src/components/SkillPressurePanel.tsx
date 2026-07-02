import { Box, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
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
  const total = Math.max(skillResources.length, 1);

  return (
    <Box className="side-panel" component="section">
      <Typography component="h2" variant="h3">
        {zhCN.skillPressure.title}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        {zhCN.skillPressure.summary}
      </Typography>
      <Stack className="pressure-stack" spacing={1}>
        <PressureBar label={zhCN.skillPressure.low} value={(low / total) * 100} className="pressure-low" />
        <PressureBar label={zhCN.skillPressure.medium} value={(medium / total) * 100} className="pressure-medium" />
        <PressureBar label={zhCN.skillPressure.high} value={(high / total) * 100} className="pressure-high" />
      </Stack>
      <Box className="pressure-grid">
        <PressureCard label={zhCN.skillPressure.low} value={low} />
        <PressureCard label={zhCN.skillPressure.medium} value={medium} />
        <PressureCard label={zhCN.skillPressure.high} value={high} />
      </Box>
    </Box>
  );
}

interface PressureBarProps {
  label: string;
  value: number;
  className: string;
}

function PressureBar({ label, value, className }: PressureBarProps) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography color="text.secondary" variant="body2">
          {label}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {Math.round(value)}%
        </Typography>
      </Stack>
      <LinearProgress className={className} variant="determinate" value={value} />
    </Box>
  );
}

interface PressureCardProps {
  label: string;
  value: number;
}

function PressureCard({ label, value }: PressureCardProps) {
  return (
    <Card className="pressure-card">
      <CardContent>
        <Typography color="text.secondary">{label}</Typography>
        <Typography component="strong">{value}</Typography>
      </CardContent>
    </Card>
  );
}
