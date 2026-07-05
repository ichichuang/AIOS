import { Box, Button, Chip, Typography } from "@mui/material";
import logoLarge from "../../assets/image/logo.png";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { formatAutomationState, formatCount, formatSnapshotDate, shortHash, zhCN } from "../../i18n/zh-CN";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";
import { buildLocalResourceLibraryViewState, getScopeSemanticDescription, shouldShowFirstRunOnboarding, type ProjectResourceMapEntry, type ScanSourceResourceMapEntry } from "../../lib/resourceCorpus";
import { normalizeResourceKindCounts, scanBatchStatusLabel } from "../../lib/resourceStore";
import type { AiosResource, RiskLevel } from "../../types/inventory";
import { moduleIcons } from "../shell/moduleConfig";
import { ResourceCard } from "../resources/ResourceCard";
import { AiosCapabilityLauncherCard, AiosInspectorSection, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosTechnicalDetails, AiosUsageCard, type AiosUsageChip } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { riskCounts, sortByUpdatedAt } from "./moduleUtils";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

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
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";

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
  { label: "无自动扫描", className: "status-chip status-disabled" }
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
    purpose: "扫描结果写入动态资源库；未扫描时主模块保持空资源库，不使用示例快照充数。",
    icon: <StorageRounded fontSize="small" />,
    chips: [
      { label: "Phase 3C", className: "status-chip status-ok", variant: "filled" },
      { label: "动态优先" }
    ]
  },
  {
    title: "高级发现",
    purpose: "高级全盘发现不是默认能力；只能在扫描管理中勾选确认后手动启动。",
    icon: <FolderOffRounded fontSize="small" />,
    chips: [
      { label: "显式确认", className: "status-chip status-warn", variant: "filled" },
      { label: "非默认" }
    ]
  }
];

export function DashboardModule({ allResources, baseline, resourceCorpus, selectedId, viewCounts, onSelect, onViewChange, onQueryChange }: AiosModuleProps) {
  const risks = useMemo(() => riskCounts(allResources), [allResources]);
  const recentReports = useMemo(() => sortByUpdatedAt(allResources.filter((resource) => resource.capabilityType === "report")).slice(0, 3), [allResources]);
  const showFirstRunOnboarding = shouldShowFirstRunOnboarding(resourceCorpus.summary, resourceCorpus.firstRunOnboardingDismissed);
  const localLibraryView = buildLocalResourceLibraryViewState(resourceCorpus.summary, resourceCorpus.activeScope, resourceCorpus.mode);
  const activeScopeDescription = getScopeSemanticDescription(resourceCorpus.activeScope, resourceCorpus.mode);
  const dataSourceCopy =
    resourceCorpus.dataSource.activeSource === "dynamic-corpus"
      ? `本机已有 AIOS 本地资源库，当前动态资源 ${resourceCorpus.dataSource.dynamicResourceCount} 项。Legacy 示例数据不参与默认统计。`
      : "尚未扫描任何目录。Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators 和 Inspector 默认显示 0 项；Legacy 示例数据只在旧入口查看。";

  const handleCapabilityClick = (queryText: string) => {
    if (onQueryChange) {
      onQueryChange(queryText);
    }
    onViewChange("skills");
  };
  const handleScopeSwitch = (scopeId: string) => {
    const scope = resourceCorpus.scopes.find((candidate) => candidate.id === scopeId);
    if (scope) resourceCorpus.onScopeChange(scope);
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
          <ResourceCorpusIndicator state={resourceCorpus} />
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
              {dataSourceCopy} 扫描仍需在扫描管理中手动启动，不执行脚本、MCP 或全盘遍历。
            </Typography>
          </Box>
          <Box className="dashboard-status-chip-row">
            {desktopStatusChips.map((chip) => (
              <Chip className={chip.className} key={chip.label} label={chip.label} variant={chip.variant ?? "filled"} />
            ))}
          </Box>
        </Box>
      </Box>

      <AiosSection className="local-resource-library-section">
        <AiosSectionHeader
          title="本机资源库"
          summary={`${localLibraryView.activeScopeLabel}。${activeScopeDescription}`}
          action={<Chip className={resourceCorpus.summary.resourceCount > 0 ? "status-chip status-ok" : "status-chip status-disabled"} label={localLibraryView.statusLabel} variant="outlined" />}
        />
        <Box className="local-library-grid">
          <AiosUsageCard title="动态资源" purpose="只统计 Rust-owned SQLite 本地资源库，不包含 Legacy 示例快照。" technicalName={`${localLibraryView.dynamicResourceCount}`} chips={[{ label: "SQLite 动态" }]} />
          <AiosUsageCard title="扫描来源" purpose="用户已选择并保存的目录来源；添加来源不会自动扫描。" technicalName={`${localLibraryView.scanSourceCount}`} chips={[{ label: `${resourceCorpus.summary.enabledSourceCount} 已启用` }]} />
          <AiosUsageCard title="项目 scope" purpose="由扫描来源的 project/scope 标签形成，用于回答项目拥有哪些资源。" technicalName={`${localLibraryView.projectScopeCount}`} chips={[{ label: "Project" }]} />
          <AiosUsageCard title="最近扫描" purpose="最近持久化扫描任务的状态与时间；扫描只在扫描管理中启动。" technicalName={localLibraryView.latestScanLabel} chips={[{ label: "metadata-only" }]} />
        </Box>
        {localLibraryView.scanManagementCtaVisible && (
          <Box className="scan-boundary-callout info local-library-cta">
            <StorageRounded fontSize="small" />
            <Box className="scan-control-copy">
              <Typography component="strong">这台机器还没有动态资源</Typography>
              <Typography color="text.secondary" variant="body2">
                先到扫描管理添加项目目录，或使用智能发现创建候选来源；不会自动开始扫描。
              </Typography>
            </Box>
            <Box className="scan-action-row compact">
              <Button startIcon={<FolderOpenRounded />} variant="contained" onClick={() => onViewChange("custom-scan")}>
                {localLibraryView.firstUseActions[0]}
              </Button>
              <Button startIcon={<ManageSearchRounded />} variant="outlined" onClick={() => onViewChange("custom-scan")}>
                {localLibraryView.firstUseActions[1]}
              </Button>
            </Box>
          </Box>
        )}
      </AiosSection>

      <AiosSection className="resource-map-section">
        <AiosSectionHeader title="项目资源地图" summary="每个项目 / scope 只汇总动态资源库中该标签下的资源与来源目录。" count={resourceCorpus.projectMap.length} />
        {resourceCorpus.projectMap.length > 0 ? (
          <Box className="resource-map-grid">
            {resourceCorpus.projectMap.map((project) => (
              <ProjectMapCard activeScopeId={resourceCorpus.activeScope.id} key={project.scopeId} project={project} onScopeSwitch={handleScopeSwitch} />
            ))}
          </Box>
        ) : (
          <Box className="scan-empty-state">
            <Typography component="strong">尚无项目 scope</Typography>
            <Typography color="text.secondary" variant="body2">
              为扫描来源填写项目 / scope 标签后，这里会显示每个项目拥有哪些动态资源。跨项目共享/重复检测是后续能力。
            </Typography>
          </Box>
        )}
      </AiosSection>

      <AiosSection className="resource-map-section">
        <AiosSectionHeader title="扫描来源目录地图" summary="每个已选择目录来源的 profile、项目标签、启用状态、资源和跳过/错误计数。" count={resourceCorpus.scanSourceMap.length} />
        {resourceCorpus.scanSourceMap.length > 0 ? (
          <Box className="resource-map-grid source-map">
            {resourceCorpus.scanSourceMap.map((source) => (
              <SourceMapCard activeScopeId={resourceCorpus.activeScope.id} key={source.scopeId} source={source} onScopeSwitch={handleScopeSwitch} />
            ))}
          </Box>
        ) : (
          <Box className="scan-empty-state">
            <Typography component="strong">尚无扫描来源目录</Typography>
            <Typography color="text.secondary" variant="body2">
              打开扫描管理后添加自选目录，或手动启动智能发现来创建候选来源。添加来源不会自动扫描。
            </Typography>
          </Box>
        )}
      </AiosSection>

      {showFirstRunOnboarding && (
        <AiosSection className="first-run-onboarding-section">
          <AiosSectionHeader
            title="尚未扫描任何目录"
            summary="AIOS 尚未扫描这台机器；启动、切换模块和搜索都不会自动扫描，默认资源计数保持 0。"
            action={<Chip className="status-chip status-ok" label="metadata-only local" variant="outlined" />}
          />
          <Box className="first-run-onboarding-grid">
            <Box className="scan-first-use-item ok">
              <Typography component="strong">从自选目录开始</Typography>
              <Typography color="text.secondary" variant="body2">
                手动添加项目文件夹后，再选择已启用来源并点击扫描所选。
              </Typography>
            </Box>
            <Box className="scan-first-use-item ok">
              <Typography component="strong">使用智能发现</Typography>
              <Typography color="text.secondary" variant="body2">
                非技术用户可让 AIOS 查找常见工作区候选；仍需手动点击开始。
              </Typography>
            </Box>
            <Box className="scan-first-use-item warn">
              <Typography component="strong">高级全盘发现</Typography>
              <Typography color="text.secondary" variant="body2">
                更慢、受权限影响，必须勾选显式确认；受保护目录可能跳过。
              </Typography>
            </Box>
            <Box className="scan-first-use-item ok">
              <Typography component="strong">本地元数据</Typography>
              <Typography color="text.secondary" variant="body2">
                扫描只保存名称、类型、相对路径、大小、修改时间、来源和安全摘要。
              </Typography>
            </Box>
          </Box>
          <Box className="scan-action-row">
            <Button startIcon={<FolderOpenRounded />} variant="contained" onClick={() => onViewChange("custom-scan")}>
              添加自选目录
            </Button>
            <Button startIcon={<ManageSearchRounded />} variant="outlined" onClick={() => onViewChange("custom-scan")}>
              查看智能发现
            </Button>
            <Button variant="text" onClick={() => resourceCorpus.onSetFirstRunOnboardingDismissed(true)}>
              不再显示
            </Button>
          </Box>
        </AiosSection>
      )}

      <AiosSection className="desktop-boundary-section">
        <AiosSectionHeader title="桌面能力边界" summary="Phase 3C 接入动态资源库，扫描管理仍是唯一扫描入口。" />
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

function ProjectMapCard({ activeScopeId, project, onScopeSwitch }: { activeScopeId: string; project: ProjectResourceMapEntry; onScopeSwitch: (scopeId: string) => void }) {
  const active = activeScopeId === project.scopeId;
  const directorySummary = project.directories.length > 0 ? project.directories.map((directory) => directory.rootDisplayPath).join(" / ") : "尚无关联目录";
  return (
    <Box className={active ? "resource-map-card active" : "resource-map-card"}>
      <Box className="resource-map-card-heading">
        <Box className="resource-map-card-title">
          <Typography component="strong">{project.projectLabel}</Typography>
          <Typography color="text.secondary" variant="body2" title={directorySummary}>
            {directorySummary}
          </Typography>
        </Box>
        <Chip className={active ? "status-chip status-ok" : undefined} label={active ? "当前项目" : "Project"} size="small" variant={active ? "filled" : "outlined"} />
      </Box>
      <Box className="resource-map-metrics">
        <MapMetric label="资源" value={project.resourceCount} />
        <MapMetric label="来源" value={project.directories.length} />
        <MapMetric label="跳过" value={project.skippedEntries} />
        <MapMetric label="错误" value={project.errorCount} />
      </Box>
      <Typography color="text.secondary" variant="body2">
        {formatKindCounts(project.countsByKind)}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        最近扫描：{formatScanStatusTime(project.lastScanStatus, project.lastScanFinishedAtMs)}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        此项目 scope 包含 {project.resourceCount} 项动态资源；跨项目共享/重复检测是后续能力。
      </Typography>
      <Box className="resource-map-directory-list">
        {project.directories.slice(0, 3).map((directory) => (
          <Chip key={directory.scanSourceId} label={`${directory.displayName} · ${directory.profileId}`} size="small" variant="outlined" />
        ))}
        {project.directories.length > 3 && <Chip label={`+${project.directories.length - 3} 来源`} size="small" variant="outlined" />}
      </Box>
      <Button disabled={active} size="small" variant="outlined" onClick={() => onScopeSwitch(project.scopeId)}>
        切换到项目 scope
      </Button>
    </Box>
  );
}

function SourceMapCard({ activeScopeId, source, onScopeSwitch }: { activeScopeId: string; source: ScanSourceResourceMapEntry; onScopeSwitch: (scopeId: string) => void }) {
  const active = activeScopeId === source.scopeId;
  return (
    <Box className={active ? "resource-map-card active" : "resource-map-card"}>
      <Box className="resource-map-card-heading">
        <Box className="resource-map-card-title">
          <Typography component="strong">{source.displayName}</Typography>
          <Typography color="text.secondary" variant="body2" title={source.rootDisplayPath}>
            {source.rootDisplayPath}
          </Typography>
        </Box>
        <Chip className={source.enabled ? "status-chip status-ok" : "status-chip status-disabled"} label={source.enabled ? "已启用" : "已停用"} size="small" variant="outlined" />
      </Box>
      <Box className="resource-map-metrics">
        <MapMetric label="资源" value={source.resourceCount} />
        <MapMetric label="跳过" value={source.skippedEntries} />
        <MapMetric label="错误" value={source.errorCount} />
      </Box>
      <Box className="resource-map-directory-list">
        <Chip label={source.profileId} size="small" variant="outlined" />
        <Chip label={source.projectLabel || "未归类"} size="small" variant="outlined" />
        <Chip label={source.sourceKind} size="small" variant="outlined" />
      </Box>
      <Typography color="text.secondary" variant="body2">
        {formatKindCounts(source.countsByKind)}
      </Typography>
      <Typography color="text.secondary" variant="body2">
        最近扫描：{formatScanStatusTime(source.lastScanStatus, source.lastScanFinishedAtMs)}
      </Typography>
      <Button disabled={active} size="small" variant="outlined" onClick={() => onScopeSwitch(source.scopeId)}>
        切换到来源 scope
      </Button>
    </Box>
  );
}

function MapMetric({ label, value }: { label: string; value: number }) {
  return (
    <Box className="resource-map-metric">
      <Typography component="span">{label}</Typography>
      <Typography component="strong">{value}</Typography>
    </Box>
  );
}

function formatKindCounts(counts: ProjectResourceMapEntry["countsByKind"]): string {
  const normalized = normalizeResourceKindCounts(counts);
  if (normalized.length === 0) return "资源类型：暂无动态资源";
  return `资源类型：${normalized.slice(0, 4).map((item) => `${resourceKindLabel(item.resourceKind)} ${item.count}`).join(" / ")}`;
}

function formatScanStatusTime(status: string | null, finishedAtMs: number | null): string {
  const statusLabel = scanBatchStatusLabel(status);
  if (!finishedAtMs) return statusLabel;
  return `${statusLabel} · ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(finishedAtMs))}`;
}

function resourceKindLabel(resourceKind: string): string {
  const labels: Record<string, string> = {
    skill: "技能",
    prompt: "提示词",
    "mcp-config": "MCP",
    script: "脚本",
    validator: "验证器",
    "report-doc": "报告",
    "project-pack": "项目包",
    "policy-governance": "策略",
    "package-manifest": "包清单",
    "unknown-local-resource": "未知资源"
  };
  return labels[resourceKind] ?? resourceKind;
}
