import { Box, ButtonBase, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { formatAutomationState, formatSnapshotDate, shortHash, zhCN } from "../../i18n/zh-CN";
import { countByView, type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosResource, RiskLevel } from "../../types/inventory";
import { moduleIcons } from "../shell/moduleConfig";
import { ResourceCard } from "../resources/ResourceCard";
import type { AiosModuleProps } from "./moduleUtils";
import { riskCounts, sortByUpdatedAt } from "./moduleUtils";

const quickViews: ResourceView[] = ["skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

export function DashboardModule({ allResources, baseline, selectedId, onSelect, onViewChange }: AiosModuleProps) {
  const risks = riskCounts(allResources);
  const recentReports = sortByUpdatedAt(allResources.filter((resource) => resource.capabilityType === "report")).slice(0, 3);

  return (
    <Box className="module-surface dashboard-module" component="section" aria-label="总览模块">
      <Box className="dashboard-hero">
        <Stack spacing={1.1}>
          <Typography className="eyebrow" component="p">
            本地只读能力命令中心
          </Typography>
          <Typography component="h2" variant="h2">
            资源浏览从这里开始，但不占用工作区
          </Typography>
          <Typography color="text.secondary" variant="body2">
            仅读取本地快照，搜索和模块切换不会执行命令、连接 MCP 或写入全局入口。
          </Typography>
        </Stack>
        <Stack className="dashboard-hero-chips" direction="row" sx={{ flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
          <Chip className="status-chip status-ok" label={zhCN.app.readOnly} />
          <Chip className="risk-chip risk-low" label={zhCN.app.safetyState} />
          <Chip label={`${allResources.length} 项资源`} variant="outlined" />
        </Stack>
      </Box>

      <Box className="dashboard-metrics">
        <DashboardMetric label={zhCN.app.generatedAt} value={formatSnapshotDate(baseline.generatedAt)} />
        <DashboardMetric label={zhCN.dashboardMetrics.policyHash} value={shortHash(baseline.policyHash)} code />
        <DashboardMetric label={zhCN.dashboardMetrics.router} value={baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "部分启用"} />
        <DashboardMetric label={zhCN.dashboardMetrics.codexAutomations} value={formatAutomationState(baseline.codexAutomationDirectoryState)} />
      </Box>

      <Box className="dashboard-scroll">
        <Box className="dashboard-section risk-band">
          <Typography component="h3" variant="h3">
            风险分布
          </Typography>
          <Box className="risk-meter">
            {(["low", "medium", "high"] as RiskLevel[]).map((risk) => (
              <Box className={`risk-meter-segment risk-${risk}`} key={risk} style={{ flexGrow: Math.max(risks[risk], 1) }}>
                <Typography component="strong">{risks[risk]}</Typography>
                <Typography component="span">{zhCN.risks[risk]}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box className="dashboard-section">
          <Stack className="dashboard-section-heading" direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Box>
              <Typography component="h3" variant="h3">
                快速入口
              </Typography>
              <Typography color="text.secondary" variant="body2">
                进入模块后再浏览资源，避免总览页变成清单墙。
              </Typography>
            </Box>
          </Stack>
          <Box className="quick-entry-grid">
            {quickViews.map((view) => {
              const Icon = moduleIcons[view];
              return (
                <ButtonBase className="quick-entry" key={view} onClick={() => onViewChange(view)}>
                  <Icon fontSize="small" />
                  <Typography component="strong">{VIEW_LABELS[view]}</Typography>
                  <Typography color="text.secondary" component="span">
                    {countByView(allResources, view)} 项
                  </Typography>
                </ButtonBase>
              );
            })}
          </Box>
        </Box>

        <Box className="dashboard-section">
          <Typography component="h3" variant="h3">
            近期报告
          </Typography>
          <Box className="resource-card-grid timeline">
            {recentReports.map((resource: AiosResource) => (
              <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} variant="report" onSelect={onSelect} />
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

interface DashboardMetricProps {
  label: string;
  value: string;
  code?: boolean;
}

function DashboardMetric({ label, value, code }: DashboardMetricProps) {
  return (
    <Card className="dashboard-metric material-card">
      <CardContent>
        <Typography className="caption" component="p">
          {label}
        </Typography>
        {code ? (
          <Box className="code-pill" component="code">
            {value}
          </Box>
        ) : (
          <Typography component="strong">{value}</Typography>
        )}
      </CardContent>
    </Card>
  );
}
