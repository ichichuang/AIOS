import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import { useCallback, useState } from "react";
import { formatCount } from "../../i18n/zh-CN";
import { buildHomeMcpLibraryStats } from "../../lib/mcpLibrary";
import { homeCopy, homeFirstRunGuideCopy } from "../../lib/productShell";
import { addScanSources } from "../../lib/resourceStore";
import { buildHomeSkillLibraryStats } from "../../lib/skillLibrary";
import { AiosHeroPanel, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosUsageCard } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";

type HomeGuideIntent = "start" | "folder";
type FolderAddState = "idle" | "adding" | "added" | "error";

export function DashboardModule({ allResources, resourceCorpus, mcpLibrary, skillLibrary, viewCounts, onViewChange }: AiosModuleProps) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideIntent, setGuideIntent] = useState<HomeGuideIntent>("start");
  const [folderAddState, setFolderAddState] = useState<FolderAddState>("idle");
  const [folderAddMessage, setFolderAddMessage] = useState<string | null>(null);
  const legacyAttentionCount = allResources.filter((resource) => resource.risk !== "low" || resource.status === "warn" || resource.status === "missing" || resource.status === "unknown").length;
  const homeSkillStats = buildHomeSkillLibraryStats(skillLibrary.summary, resourceCorpus.summary, viewCounts);
  const homeMcpStats = buildHomeMcpLibraryStats(mcpLibrary.summary, viewCounts);
  const usingProductAttention = homeSkillStats.usingProductSummary || homeMcpStats.usingProductSummary;
  const attentionCount = usingProductAttention ? homeSkillStats.needsAttentionCount + homeMcpStats.needsAttentionCount : legacyAttentionCount;
  const latestScanLabel = homeSkillStats.latestScanLabel !== "还没有查找记录" ? homeSkillStats.latestScanLabel : homeMcpStats.latestSearchOrScanLabel;
  const hasResults = homeSkillStats.usingProductSummary || homeMcpStats.usingProductSummary ? (skillLibrary.summary?.counts.totalSkillCandidates ?? 0) > 0 || homeMcpStats.serviceCount > 0 || resourceCorpus.summary.resourceCount > 0 : resourceCorpus.summary.resourceCount > 0;
  const mcpCountLabel = `${formatCount(homeMcpStats.serviceCount)} / ${formatCount(homeMcpStats.toolHintCount)}`;
  const openGuide = useCallback((intent: HomeGuideIntent) => {
    setGuideIntent(intent);
    setGuideOpen(true);
    setFolderAddState("idle");
    setFolderAddMessage(null);
  }, []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);
  const goToSearchLocations = useCallback(() => {
    setGuideOpen(false);
    onViewChange("custom-scan");
  }, [onViewChange]);
  const handleChooseFolder = useCallback(async () => {
    setFolderAddState("adding");
    setFolderAddMessage(null);
    try {
      const result = await addScanSources();
      const addedCount = Math.max(result.selectedCount, result.sources.length);
      if (addedCount > 0) {
        setFolderAddState("added");
        setFolderAddMessage(`已添加 ${formatCount(addedCount)} 个文件夹。添加不会自动扫描；请在查找位置确认后手动点击开始查找。`);
        resourceCorpus.refresh();
        return;
      }
      setFolderAddState("idle");
      setFolderAddMessage("没有添加文件夹。你可以重新选择，或先查看查找位置。");
    } catch (error) {
      setFolderAddState("error");
      setFolderAddMessage(formatDashboardCommandError(error));
    }
  }, [resourceCorpus]);

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
            <Button className="aios-action-button aios-action-button--primary" startIcon={<ManageSearchRounded />} variant="contained" onClick={() => openGuide("start")}>
              {homeCopy.primaryActions[0].label}
            </Button>
            <Button className="aios-action-button aios-action-button--secondary" startIcon={<FolderOpenRounded />} variant="outlined" onClick={() => openGuide("folder")}>
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

      <HomeFirstRunGuideDialog
        folderAddMessage={folderAddMessage}
        folderAddState={folderAddState}
        intent={guideIntent}
        open={guideOpen}
        onChooseFolder={handleChooseFolder}
        onClose={closeGuide}
        onGoToSearchLocations={goToSearchLocations}
      />
    </AiosModuleFrame>
  );
}

function HomeFirstRunGuideDialog({
  folderAddMessage,
  folderAddState,
  intent,
  open,
  onChooseFolder,
  onClose,
  onGoToSearchLocations
}: {
  folderAddMessage: string | null;
  folderAddState: FolderAddState;
  intent: HomeGuideIntent;
  open: boolean;
  onChooseFolder: () => void;
  onClose: () => void;
  onGoToSearchLocations: () => void;
}) {
  const adding = folderAddState === "adding";
  const added = folderAddState === "added";
  const messageSeverity = folderAddState === "error" ? "error" : added ? "success" : "info";
  const highlightedStepId = intent === "folder" ? "choose-folder" : "review-location";

  return (
    <Dialog
      aria-describedby="home-first-run-guide-description"
      aria-labelledby="home-first-run-guide-title"
      className="home-first-run-dialog"
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={adding ? undefined : onClose}
    >
      <DialogTitle id="home-first-run-guide-title">
        <Box className="home-guide-title">
          <ManageSearchRounded fontSize="small" />
          <Typography component="span">{homeFirstRunGuideCopy.title}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Stack className="home-guide-content" spacing={2}>
          <Box className="home-guide-intro" id="home-first-run-guide-description">
            <Typography variant="body1">{homeFirstRunGuideCopy.intro}</Typography>
            <Typography color="text.secondary" variant="body2">
              {homeFirstRunGuideCopy.mcpExplanation}
            </Typography>
          </Box>

          <Box className="home-guide-steps" aria-label="开始查找步骤">
            {homeFirstRunGuideCopy.steps.map((step, index) => {
              const active = step.id === highlightedStepId;
              return (
                <Box className={["home-guide-step", active ? "active" : ""].filter(Boolean).join(" ")} key={step.id}>
                  <Box className="home-guide-step-index" aria-hidden="true">
                    {index + 1}
                  </Box>
                  <Box className="home-guide-step-copy">
                    <Typography component="strong">{step.title}</Typography>
                    <Typography color="text.secondary" variant="body2">
                      {step.summary}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Alert className="home-guide-safety-alert" icon={<SecurityRounded fontSize="small" />} severity="info" variant="outlined">
            <Typography component="strong">{homeFirstRunGuideCopy.safetyLine}</Typography>
            <Box component="ul" className="home-guide-safety-list">
              {homeFirstRunGuideCopy.safetyCommitments.map((commitment) => (
                <Typography component="li" key={commitment} variant="body2">
                  {commitment}
                </Typography>
              ))}
            </Box>
          </Alert>

          {folderAddMessage && (
            <Alert className="home-guide-result-alert" severity={messageSeverity} variant="outlined">
              {folderAddMessage}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions className="home-guide-actions">
        <Button disabled={adding} onClick={onClose}>
          {homeFirstRunGuideCopy.closeAction}
        </Button>
        <Button className="aios-action-button aios-action-button--secondary" disabled={adding} startIcon={<FolderOpenRounded />} variant="outlined" onClick={onGoToSearchLocations}>
          {homeFirstRunGuideCopy.reviewLocationAction}
        </Button>
        {added ? (
          <Button className="aios-action-button aios-action-button--primary" startIcon={<CheckCircleRounded />} variant="contained" onClick={onGoToSearchLocations}>
            {homeFirstRunGuideCopy.nextStepAction}
          </Button>
        ) : (
          <Button className="aios-action-button aios-action-button--primary" disabled={adding} startIcon={<FolderOpenRounded />} variant="contained" onClick={onChooseFolder}>
            {adding ? "正在打开文件夹选择器" : homeFirstRunGuideCopy.chooseFolderAction}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

function formatDashboardCommandError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return String(error);
}
