import { Box, Chip, Typography } from "@mui/material";
import logoLarge from "../../assets/image/logo.png";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { formatAutomationState, formatCount, formatSnapshotDate, shortHash, zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import type { AiosResource, RiskLevel } from "../../types/inventory";
import { moduleIcons } from "../shell/moduleConfig";
import { ResourceCard } from "../resources/ResourceCard";
import { AiosCapabilityLauncherCard, AiosInspectorSection, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosTechnicalDetails, AiosUsageCard, type AiosUsageChip } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { riskCounts, sortByUpdatedAt } from "./moduleUtils";

import WebRounded from "@mui/icons-material/WebRounded";
import PhoneAndroidRounded from "@mui/icons-material/PhoneAndroidRounded";
import PaletteRounded from "@mui/icons-material/PaletteRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import CameraAltRounded from "@mui/icons-material/CameraAltRounded";
import AutoStoriesRounded from "@mui/icons-material/AutoStoriesRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import DesktopMacRounded from "@mui/icons-material/DesktopMacRounded";
import SearchOffRounded from "@mui/icons-material/SearchOffRounded";
import StorageRounded from "@mui/icons-material/StorageRounded";
import FolderOffRounded from "@mui/icons-material/FolderOffRounded";

const quickViews: ResourceView[] = ["custom-scan", "skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

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

const desktopStatusChips: AiosUsageChip[] = [
  { label: "本地运行", className: "status-chip status-ok" },
  { label: "默认只读", className: "status-chip status-ok" },
  { label: "多来源扫描管理", variant: "outlined" },
  { label: "SQLite 元数据库", variant: "outlined" },
  { label: "不做全盘扫描", className: "status-chip status-disabled" }
];

const desktopBoundaryCards: Array<{
  title: string;
  purpose: string;
  icon: ReactNode;
  chips: AiosUsageChip[];
}> = [
  {
    title: "Tauri 桌面壳",
    purpose: "当前桌面壳承载现有 Material Console 前端，保持本地只读展示。",
    icon: <DesktopMacRounded fontSize="small" />,
    chips: [
      { label: "可用", className: "status-chip status-ok", variant: "filled" },
      { label: "Phase 1" }
    ]
  },
  {
    title: "扫描引擎",
    purpose: "已提供用户授权多个来源后的顺序元数据扫描；不读取文件内容。",
    icon: <SearchOffRounded fontSize="small" />,
    chips: [
      { label: "Phase 3B", className: "status-chip status-ok", variant: "filled" },
      { label: "顺序批次" }
    ]
  },
  {
    title: "SQLite 本地索引",
    purpose: "Phase 3A 已添加 Rust-owned SQLite 元数据资源库；静态模块仍保留 JSON snapshot 兼容路径。",
    icon: <StorageRounded fontSize="small" />,
    chips: [
      { label: "Phase 3A", className: "status-chip status-ok", variant: "filled" },
      { label: "仅元数据" }
    ]
  },
  {
    title: "全盘扫描",
    purpose: "全盘扫描不属于 MVP，未启用，也不是 Phase 1-4 的默认能力。",
    icon: <FolderOffRounded fontSize="small" />,
    chips: [
      { label: "禁用", className: "status-chip status-disabled", variant: "filled" },
      { label: "非 MVP" }
    ]
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
    <AiosModuleFrame
      className="dashboard-module"
      contentClassName="dashboard-scroll"
      view="dashboard"
      summary="本地 AIOS 共享技能库与运行边界只读视图。"
      count={allResources.length}
      actions={
        <>
        <Chip className="status-chip status-ok" label="本地只读" />
        <Chip label={formatSnapshotDate(baseline.generatedAt)} variant="outlined" />
        </>
      }
    >
      <Box className="dashboard-brand-card">
        <Box className="dashboard-brand-logo" component="img" src={logoLarge} alt="AIOS Logo" />
        <Box className="dashboard-brand-copy">
          <Typography variant="h3">AIOS Desktop</Typography>
          <Typography variant="body2" color="text.secondary">
            桌面壳 MVP · 本地可信智能体操作系统 · 默认只读控制面板
          </Typography>
        </Box>
        <Box className="dashboard-desktop-status" aria-label="AIOS Desktop MVP 边界">
          <Box className="dashboard-status-copy">
            <Typography component="strong">桌面产品状态</Typography>
          <Typography color="text.secondary" variant="body2">
              当前展示 repo-local snapshot，并支持用户显式添加多个扫描来源后手动执行只读元数据扫描；完成后的安全元数据写入本地 SQLite 资源库，不执行脚本、MCP 或全盘遍历。
          </Typography>
          </Box>
          <Box className="dashboard-status-chip-row">
            {desktopStatusChips.map((chip) => (
              <Chip className={chip.className} key={chip.label} label={chip.label} variant={chip.variant ?? "filled"} />
            ))}
          </Box>
        </Box>
      </Box>

      <AiosSection className="desktop-boundary-section">
        <AiosSectionHeader title="桌面能力边界" summary="Phase 3B 增加多目录扫描管理，静态清单继续保留。" />
        <Box className="quick-entry-grid desktop-boundary-grid">
          {desktopBoundaryCards.map((entry) => (
            <AiosUsageCard className="dashboard-boundary-card" chips={entry.chips} icon={entry.icon} key={entry.title} purpose={entry.purpose} title={entry.title} />
          ))}
        </Box>
      </AiosSection>

      <AiosSection>
          <AiosSectionHeader title="常用能力库" />
          <Box className="quick-entry-grid capability-launcher">
            {capabilityEntries.map((entry) => {
              const Icon = entry.icon;
              return (
                <AiosCapabilityLauncherCard
                  actionLabel="进入技能库"
                  description={entry.description}
                  icon={<Icon fontSize="small" />}
                  key={entry.title}
                  metaLabel={entry.query}
                  title={entry.title}
                  onClick={() => handleCapabilityClick(entry.query)}
                />
              );
            })}
          </Box>
        </AiosSection>

        <AiosSection>
          <AiosSectionHeader title="全部类别入口" />
          <Box className="quick-entry-grid module-launcher">
            {quickViews.map((view) => {
              const Icon = moduleIcons[view];
              return (
                <AiosCapabilityLauncherCard
                  actionLabel={`${viewCounts[view]} 项`}
                  description={zhCN.moduleSummaries[view]}
                  icon={<Icon fontSize="small" />}
                  key={view}
                  metaLabel={view}
                  title={VIEW_LABELS[view]}
                  onClick={() => onViewChange(view)}
                />
              );
            })}
          </Box>
        </AiosSection>

        <AiosInspectorSection title="系统状态与安全审计">
            <AiosTechnicalDetails
              rows={[
                { label: zhCN.app.total, value: `${formatCount(allResources.length)} 项` },
                { label: zhCN.dashboardMetrics.policyHash, value: shortHash(baseline.policyHash), code: true },
                { label: zhCN.dashboardMetrics.router, value: baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "部分启用" },
                { label: zhCN.dashboardMetrics.codexAutomations, value: formatAutomationState(baseline.codexAutomationDirectoryState) }
              ]}
            />

            <Box className="risk-band">
              <Typography component="strong">
                风险分布
              </Typography>
              <Box className="risk-meter compact">
                {(["low", "medium", "high"] as RiskLevel[]).map((risk) => (
                  <Box className={`risk-meter-segment risk-${risk}`} key={risk} style={{ "--risk-count": Math.max(risks[risk], 1) } as CSSProperties}>
                    <Typography component="strong">{risks[risk]}</Typography>
                    <Typography component="span">{zhCN.risks[risk]}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
        </AiosInspectorSection>

        {recentReports.length > 0 && (
          <AiosSection>
            <AiosSectionHeader title="近期报告" />
            <Box className="resource-card-grid timeline">
              {recentReports.map((resource: AiosResource) => (
                <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} variant="report" onSelect={onSelect} />
              ))}
            </Box>
          </AiosSection>
        )}
    </AiosModuleFrame>
  );
}
