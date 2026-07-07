import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import { formatCount } from "../../i18n/zh-CN";
import { buildHomeMcpLibraryStats } from "../../lib/mcpLibrary";
import { homeCopy } from "../../lib/productShell";
import { buildHomeSkillLibraryStats } from "../../lib/skillLibrary";
import { AiosHeroPanel, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosUsageCard } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";

export function DashboardModule({ allResources, resourceCorpus, mcpLibrary, skillLibrary, viewCounts, onViewChange }: AiosModuleProps) {
  const legacyAttentionCount = allResources.filter((resource) => resource.risk !== "low" || resource.status === "warn" || resource.status === "missing" || resource.status === "unknown").length;
  const homeSkillStats = buildHomeSkillLibraryStats(skillLibrary.summary, resourceCorpus.summary, viewCounts);
  const homeMcpStats = buildHomeMcpLibraryStats(mcpLibrary.summary, viewCounts);
  const usingProductAttention = homeSkillStats.usingProductSummary || homeMcpStats.usingProductSummary;
  const attentionCount = usingProductAttention ? homeSkillStats.needsAttentionCount + homeMcpStats.needsAttentionCount : legacyAttentionCount;
  const latestScanLabel = homeSkillStats.latestScanLabel !== "还没有查找记录" ? homeSkillStats.latestScanLabel : homeMcpStats.latestSearchOrScanLabel;
  const hasResults = homeSkillStats.usingProductSummary || homeMcpStats.usingProductSummary ? (skillLibrary.summary?.counts.totalSkillCandidates ?? 0) > 0 || homeMcpStats.serviceCount > 0 || resourceCorpus.summary.resourceCount > 0 : resourceCorpus.summary.resourceCount > 0;
  const mcpCountLabel = `${formatCount(homeMcpStats.serviceCount)} / ${formatCount(homeMcpStats.toolHintCount)}`;

  return (
    <AiosModuleFrame
      className="dashboard-module"
      contentClassName="dashboard-scroll"
      view="dashboard"
      summary={homeCopy.summary}
      ariaLabel="AIOS Desktop 首页"
      motionKey={`dashboard:${homeSkillStats.skillCount}:${viewCounts.mcp}:${attentionCount}`}
    >
      <AiosHeroPanel className="dashboard-hero">
        <Box className="dashboard-hero-copy">
          <Typography component="h2" variant="h1">
            {homeCopy.title}
          </Typography>
          <Typography className="dashboard-hero-summary" color="text.secondary" variant="body1">
            {hasResults ? "这是当前整理好的本机结果，可从左侧进入技能或 MCP 查看详情。" : "开始查找后，这里会显示这台电脑上的 AI 技能和 MCP 工具。"}
          </Typography>

          <Stack className="dashboard-hero-actions" direction="row">
            <Button className="aios-action-button aios-action-button--primary" startIcon={<ManageSearchRounded />} variant="contained" onClick={() => onViewChange("advanced")}>
              {homeCopy.primaryActions[0].label}
            </Button>
            <Button className="aios-action-button aios-action-button--secondary" startIcon={<FolderOpenRounded />} variant="outlined" onClick={() => onViewChange("advanced")}>
              {homeCopy.primaryActions[1].label}
            </Button>
          </Stack>
        </Box>
        <Box className="dashboard-hero-status" aria-label="首页摘要">
          <Box className="dashboard-hero-stat">
            <Typography component="strong">{formatCount(homeSkillStats.skillCount)}</Typography>
            <Typography color="text.secondary" variant="body2">
              AI 技能
            </Typography>
          </Box>
          <Box className="dashboard-hero-stat">
            <Typography component="strong">{mcpCountLabel}</Typography>
            <Typography color="text.secondary" variant="body2">
              MCP 服务 / 工具
            </Typography>
          </Box>
          <Box className="dashboard-hero-stat">
            <Typography component="strong">{latestScanLabel}</Typography>
            <Typography color="text.secondary" variant="body2">
              最近查找
            </Typography>
          </Box>
        </Box>
      </AiosHeroPanel>

      <AiosSection className="dashboard-summary-section">
        <AiosSectionHeader title="当前概览" summary="只展示普通用户需要先看到的本机结果。" />
        <Box className="dashboard-summary-grid">
          <AiosUsageCard
            className="dashboard-summary-card"
            icon={null}
            purpose="已识别或可使用的 AI 技能线索。"
            selected={false}
            technicalName={formatCount(homeSkillStats.skillCount)}
            title="AI 技能"
          />
          <AiosUsageCard
            className="dashboard-summary-card"
            icon={null}
            purpose="本机已配置的 MCP 服务，以及可安全识别的工具名称线索。"
            selected={false}
            technicalName={mcpCountLabel}
            title="MCP 服务 / 工具"
          />
          <AiosUsageCard
            className="dashboard-summary-card"
            icon={null}
            purpose="权限跳过、来源异常或需要人工查看的项目。"
            selected={false}
            technicalName={formatCount(attentionCount)}
            title="需要处理"
          />
          <AiosUsageCard
            className="dashboard-summary-card"
            icon={null}
            purpose="只显示 AIOS Desktop 自己保存的本机记录。"
            selected={false}
            technicalName={latestScanLabel}
            title="最近一次查找"
          />
        </Box>
      </AiosSection>

      <AiosSection className="dashboard-privacy-section">
        <Alert className="dashboard-privacy-alert" severity="info" variant="outlined">
          这些结果只用于本机查看；AIOS Desktop 不上传查找结果，也不会读取密钥、令牌、密码、浏览器 Cookie 或登录会话。
        </Alert>
        <Box className="dashboard-privacy-line">
          {homeCopy.safetyReminders.map((reminder) => (
            <Chip key={reminder} label={reminder} size="small" variant="outlined" />
          ))}
        </Box>
      </AiosSection>
    </AiosModuleFrame>
  );
}
