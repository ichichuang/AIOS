import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { formatAutomationState, shortHash, zhCN } from "../i18n/zh-CN";
import type { BaselineSummary as BaselineSummaryType } from "../types/inventory";

interface BaselineSummaryProps {
  baseline: BaselineSummaryType;
}

export function BaselineSummary({ baseline }: BaselineSummaryProps) {
  const routerStatus = baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "部分启用";

  return (
    <Box className="summary-grid" component="section" aria-label="基线摘要">
      <MetricCard label={zhCN.dashboardMetrics.policyHash} value={shortHash(baseline.policyHash)} note={baseline.policyHash ? zhCN.dashboardMetrics.guardTarget : zhCN.dashboardMetrics.policyMissing} wide />
      <MetricCard label={zhCN.dashboardMetrics.canonicalSkills} value={String(baseline.canonicalSkillCount)} note="/Users/cc/.ai" codeNote />
      <MetricCard label={zhCN.dashboardMetrics.codexActive} value={String(baseline.codexActiveUserSkillCount)} note={`${baseline.codexTopLevelCount} ${zhCN.dashboardMetrics.topLevelReserved}`} />
      <MetricCard label={zhCN.dashboardMetrics.agentsActive} value={String(baseline.agentsActiveUserSkillCount)} note={zhCN.dashboardMetrics.globalEntrypoints} />
      <MetricCard label={zhCN.dashboardMetrics.claudeSkills} value={String(baseline.claudeSkillCount ?? zhCN.app.notAvailable)} note={zhCN.dashboardMetrics.safeEntrypointMetadata} />
      <MetricCard label={zhCN.dashboardMetrics.router} value={routerStatus} note={zhCN.dashboardMetrics.customSkillRouter} chipNote />
      <MetricCard label={zhCN.dashboardMetrics.codexAutomations} value={formatAutomationState(baseline.codexAutomationDirectoryState)} note={zhCN.dashboardMetrics.mustNotRecreate} />
    </Box>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  note: string;
  wide?: boolean;
  chipNote?: boolean;
  codeNote?: boolean;
}

function MetricCard({ label, value, note, wide, chipNote, codeNote }: MetricCardProps) {
  return (
    <Card className={wide ? "metric-panel wide" : "metric-panel"}>
      <CardContent>
        <Typography className="caption" component="p">
          {label}
        </Typography>
        <Typography component="strong">{value}</Typography>
        {chipNote ? (
          <Chip label={note} variant="outlined" />
        ) : codeNote ? (
          <Box className="code-pill" component="code">
            {note}
          </Box>
        ) : (
          <Typography color="text.secondary" component="span">
            {note}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
