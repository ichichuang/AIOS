import { Box, ButtonBase, Chip, Stack, Typography } from "@mui/material";
import { formatAutomationState, formatCount, formatSnapshotDate, shortHash, zhCN } from "../../i18n/zh-CN";
import { countByView, type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosResource, RiskLevel } from "../../types/inventory";
import { moduleIcons } from "../shell/moduleConfig";
import { ResourceCard } from "../resources/ResourceCard";
import type { AiosModuleProps } from "./moduleUtils";
import { riskCounts, sortByUpdatedAt } from "./moduleUtils";
import { ModuleHeader } from "./ModuleHeader";

const quickViews: ResourceView[] = ["skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

export function DashboardModule({ allResources, baseline, selectedId, onSelect, onViewChange }: AiosModuleProps) {
  const risks = riskCounts(allResources);
  const recentReports = sortByUpdatedAt(allResources.filter((resource) => resource.capabilityType === "report")).slice(0, 3);

  return (
    <Box className="module-surface dashboard-module" component="section" aria-label="总览模块">
      <ModuleHeader view="dashboard" summary="只读快照、风险分布和模块入口。" count={allResources.length}>
        <Chip className="status-chip status-ok" label="本地只读" />
        <Chip label={formatSnapshotDate(baseline.generatedAt)} variant="outlined" />
      </ModuleHeader>

      <Box className="dashboard-scroll">
        <Box className="dashboard-summary">
          <SummaryItem label={zhCN.app.total} value={`${formatCount(allResources.length)} 项`} />
          <SummaryItem label={zhCN.dashboardMetrics.policyHash} value={shortHash(baseline.policyHash)} code />
          <SummaryItem label={zhCN.dashboardMetrics.router} value={baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "部分启用"} />
          <SummaryItem label={zhCN.dashboardMetrics.codexAutomations} value={formatAutomationState(baseline.codexAutomationDirectoryState)} />
        </Box>

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

interface SummaryItemProps {
  label: string;
  value: string;
  code?: boolean;
}

function SummaryItem({ label, value, code }: SummaryItemProps) {
  return (
    <Box className="dashboard-summary-item">
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
    </Box>
  );
}
