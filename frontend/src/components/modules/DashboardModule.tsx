import { Box, ButtonBase, Chip, Stack, Typography, Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import { useMemo, useState } from "react";
import { formatAutomationState, formatCount, formatSnapshotDate, shortHash, zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosResource, RiskLevel } from "../../types/inventory";
import { moduleIcons } from "../shell/moduleConfig";
import { ResourceCard } from "../resources/ResourceCard";
import type { AiosModuleProps } from "./moduleUtils";
import { riskCounts, sortByUpdatedAt } from "./moduleUtils";
import { ModuleHeader } from "./ModuleHeader";

import WebRounded from "@mui/icons-material/WebRounded";
import PhoneAndroidRounded from "@mui/icons-material/PhoneAndroidRounded";
import PaletteRounded from "@mui/icons-material/PaletteRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CameraAltRounded from "@mui/icons-material/CameraAltRounded";
import AutoStoriesRounded from "@mui/icons-material/AutoStoriesRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";

const quickViews: ResourceView[] = ["skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

const capabilityEntries = [
  {
    title: "前端与界面",
    query: "前端",
    icon: WebRounded,
    description: "UI 调试、界面开发及样式美化"
  },
  {
    title: "小程序与移动端",
    query: "小程序",
    icon: PhoneAndroidRounded,
    description: "微信小程序、移动端组件及Tauri安全"
  },
  {
    title: "设计美化与动效",
    query: "figma",
    icon: PaletteRounded,
    description: "Figma设计生成、GSAP动效与设计系统"
  },
  {
    title: "技能蒸馏 / 人物视角",
    query: "nvwa",
    icon: AutoAwesomeRounded,
    description: "华术女娲技能蒸馏与人物视角分析"
  },
  {
    title: "浏览器测试与截图",
    query: "browser",
    icon: CameraAltRounded,
    description: "Playwright浏览器自动化与截图验证"
  },
  {
    title: "文档与知识库",
    query: "docs",
    icon: AutoStoriesRounded,
    description: "Markdown、知识库查询与RAG检索"
  },
  {
    title: "本地系统与工具",
    query: "local",
    icon: SettingsRounded,
    description: "本地自动化脚本与系统命令行工具"
  }
];

export function DashboardModule({ allResources, baseline, selectedId, viewCounts, onSelect, onViewChange, onQueryChange }: AiosModuleProps) {
  const risks = useMemo(() => riskCounts(allResources), [allResources]);
  const recentReports = useMemo(() => sortByUpdatedAt(allResources.filter((resource) => resource.capabilityType === "report")).slice(0, 3), [allResources]);

  const handleCapabilityClick = (queryText: string) => {
    if (onQueryChange) {
      onQueryChange(queryText);
    }
    onViewChange("skills");
  };

  return (
    <Box className="module-surface dashboard-module" component="section" aria-label="总览模块">
      <ModuleHeader view="dashboard" summary="本地 AIOS 共享技能库与运行边界只读视图。" count={allResources.length}>
        <Chip className="status-chip status-ok" label="本地只读" />
        <Chip label={formatSnapshotDate(baseline.generatedAt)} variant="outlined" />
      </ModuleHeader>

      <Box className="dashboard-scroll" sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 1.5, overflowY: "auto", height: "100%" }}>

        {/* User-Task Oriented Capability Entries */}
        <Box className="dashboard-section">
          <Typography component="h3" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            常用能力库
          </Typography>
          <Box className="quick-entry-grid" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1 }}>
            {capabilityEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <ButtonBase
                  className="quick-entry"
                  key={entry.title}
                  onClick={() => handleCapabilityClick(entry.query)}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "36px minmax(0, 1fr)",
                    gap: 1.5,
                    p: 1.5,
                    border: "1px solid var(--aios-outline)",
                    borderRadius: "16px",
                    backgroundColor: "var(--aios-surface)",
                    textAlign: "left",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "var(--aios-selected-outline)",
                      backgroundColor: "var(--aios-primary-soft)"
                    }
                  }}
                >
                  <Icon sx={{ color: "var(--aios-primary)", fontSize: "24px" }} />
                  <Box>
                    <Typography component="strong" sx={{ display: "block", fontSize: "14px", fontWeight: 700 }}>
                      {entry.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: "11px", display: "block", mt: 0.25 }}>
                      {entry.description}
                    </Typography>
                  </Box>
                </ButtonBase>
              );
            })}
          </Box>
        </Box>

        {/* Quick entry for all views */}
        <Box className="dashboard-section">
          <Typography component="h3" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            全部类别入口
          </Typography>
          <Box className="quick-entry-grid" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 1 }}>
            {quickViews.map((view) => {
              const Icon = moduleIcons[view];
              return (
                <ButtonBase
                  className="quick-entry"
                  key={view}
                  onClick={() => onViewChange(view)}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    p: 1.5,
                    minHeight: "72px",
                    border: "1px solid var(--aios-outline)",
                    borderRadius: "14px",
                    backgroundColor: "var(--aios-surface)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "var(--aios-selected-outline)",
                      backgroundColor: "var(--aios-primary-soft)"
                    }
                  }}
                >
                  <Icon fontSize="small" sx={{ color: "var(--aios-primary)" }} />
                  <Typography component="strong" sx={{ fontSize: "12px", fontWeight: 700 }}>
                    {VIEW_LABELS[view]}
                  </Typography>
                  <Typography color="text.secondary" component="span" sx={{ fontSize: "10px" }}>
                    {viewCounts[view]} 项
                  </Typography>
                </ButtonBase>
              );
            })}
          </Box>
        </Box>

        {/* Collapsible System Status Section */}
        <Accordion disableGutters elevation={0} variant="outlined" sx={{ borderRadius: "14px", border: "1px solid var(--aios-outline)", overflow: "hidden", "&:before": { display: "none" } }}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />} sx={{ backgroundColor: "var(--aios-surface-muted)", minHeight: 40, "& .MuiAccordionSummary-content": { my: 1 } }}>
            <Typography sx={{ fontWeight: 700, fontSize: "13px" }}>系统状态与安全审计</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box className="dashboard-summary" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1 }}>
              <SummaryItem label={zhCN.app.total} value={`${formatCount(allResources.length)} 项`} />
              <SummaryItem label={zhCN.dashboardMetrics.policyHash} value={shortHash(baseline.policyHash)} code />
              <SummaryItem label={zhCN.dashboardMetrics.router} value={baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "部分启用"} />
              <SummaryItem label={zhCN.dashboardMetrics.codexAutomations} value={formatAutomationState(baseline.codexAutomationDirectoryState)} />
            </Box>

            <Box className="risk-band">
              <Typography component="strong" sx={{ display: "block", fontSize: "12px", fontWeight: 700, mb: 1 }}>
                风险分布
              </Typography>
              <Box className="risk-meter" sx={{ display: "flex", height: "32px", borderRadius: "8px", overflow: "hidden" }}>
                {(["low", "medium", "high"] as RiskLevel[]).map((risk) => (
                  <Box className={`risk-meter-segment risk-${risk}`} key={risk} style={{ flexGrow: Math.max(risks[risk], 1) }} sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minWidth: "40px" }}>
                    <Typography component="strong" sx={{ fontSize: "12px", fontWeight: 800 }}>{risks[risk]}</Typography>
                    <Typography component="span" sx={{ fontSize: "9px" }}>{zhCN.risks[risk]}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <Box className="dashboard-section">
            <Typography component="h3" variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              近期报告
            </Typography>
            <Box className="resource-card-grid timeline" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 1 }}>
              {recentReports.map((resource: AiosResource) => (
                <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} variant="report" onSelect={onSelect} />
              ))}
            </Box>
          </Box>
        )}

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
    <Box className="dashboard-summary-item" sx={{ p: 1, border: "1px solid var(--aios-outline)", borderRadius: "10px", backgroundColor: "var(--aios-surface)" }}>
      <Typography className="caption" component="p" sx={{ fontSize: "10px", color: "text.secondary", m: 0 }}>
        {label}
      </Typography>
      {code ? (
        <Box className="code-pill" component="code" sx={{ fontSize: "11px", display: "inline-block", mt: 0.5 }}>
          {value}
        </Box>
      ) : (
        <Typography component="strong" sx={{ fontSize: "13px", fontWeight: 700, display: "block", mt: 0.5 }}>{value}</Typography>
      )}
    </Box>
  );
}
