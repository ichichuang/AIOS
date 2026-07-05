import { Box, Button, Chip, LinearProgress, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import StopCircleRounded from "@mui/icons-material/StopCircleRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { filterResourceList } from "../../lib/filtering";
import {
  applyScanJobProgressEvent,
  cancelScanJob,
  countSkippedEntries,
  fallbackScanPolicy,
  fallbackScanProfiles,
  DEFAULT_SCAN_PROFILE_ID,
  getScanJobSnapshot,
  getScanPolicy,
  getScanProfileById,
  getScanProfileForResult,
  getScanProfiles,
  isTerminalScanJobStatus,
  isTauriRuntimeAvailable,
  listenToScanJobProgress,
  mapScanResourcesToAiosResources,
  pickScanDirectory,
  scanLifecycleFromSnapshot,
  startCustomScanJob,
  type CustomScanResult,
  type ScanJobSnapshot,
  type ScanLifecycleState,
  type ScanProfileDefinition,
  type ScanProfileId,
  type ScanResourceKind,
  type ScannerPolicy,
  type SelectedScanDirectory
} from "../../lib/customDirectoryScan";
import { ResourceGroup, type ResourceGroupData } from "../resources/ResourceGroup";
import { AiosModuleFrame, AiosSection, AiosSectionHeader, AiosTechnicalDetails, AiosUsageCard, type AiosTechnicalDetailRow } from "../ui/AiosUiPrimitives";
import type { ResourceCardVariant } from "../resources/ResourceCard";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

export function CustomScanModule({ query, selectedId, onSelect }: AiosModuleProps) {
  const [policy, setPolicy] = useState<ScannerPolicy>(fallbackScanPolicy);
  const [profiles, setProfiles] = useState<ScanProfileDefinition[]>(fallbackScanProfiles);
  const [activeProfileId, setActiveProfileId] = useState<ScanProfileId>(DEFAULT_SCAN_PROFILE_ID);
  const [selectedDirectory, setSelectedDirectory] = useState<SelectedScanDirectory | null>(null);
  const [scanJobSnapshot, setScanJobSnapshot] = useState<ScanJobSnapshot | null>(null);
  const [scanResult, setScanResult] = useState<CustomScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<"idle" | "picking">("idle");
  const tauriAvailable = isTauriRuntimeAvailable();

  useEffect(() => {
    Promise.all([getScanPolicy(), getScanProfiles()])
      .then(([nextPolicy, nextProfiles]) => {
        const usableProfiles = nextProfiles.length > 0 ? nextProfiles : fallbackScanProfiles;
        setPolicy(nextPolicy);
        setProfiles(usableProfiles);
        setActiveProfileId((currentId) => (usableProfiles.some((profile) => profile.id === currentId) ? currentId : nextPolicy.defaultProfileId));
      })
      .catch((policyError: unknown) => setError(formatCommandError(policyError)));
  }, []);

  const refreshScanJobSnapshot = useCallback(async (jobId: string) => {
    try {
      const snapshot = await getScanJobSnapshot(jobId);
      setScanJobSnapshot(snapshot);
      if (snapshot.status === "completed" && snapshot.result) {
        setScanResult(snapshot.result);
        setError(null);
      } else if (snapshot.status === "failed") {
        setScanResult(null);
        setError(snapshot.error?.message ?? "扫描任务失败。");
      } else if (snapshot.status === "cancelled") {
        setScanResult(null);
      }
    } catch (snapshotError) {
      setError(formatCommandError(snapshotError));
    }
  }, []);

  useEffect(() => {
    if (!tauriAvailable) return undefined;
    let active = true;
    let cleanup: (() => void) | null = null;

    listenToScanJobProgress((event) => {
      if (!active) return;
      setScanJobSnapshot((current) => {
        if (current && current.jobId !== event.jobId) return current;
        return applyScanJobProgressEvent(current, event);
      });
      if (isTerminalScanJobStatus(event.status)) {
        void refreshScanJobSnapshot(event.jobId);
      }
    })
      .then((unlisten) => {
        if (active) {
          cleanup = unlisten;
        } else {
          unlisten();
        }
      })
      .catch((listenError: unknown) => setError(formatCommandError(listenError)));

    return () => {
      active = false;
      cleanup?.();
    };
  }, [refreshScanJobSnapshot, tauriAvailable]);

  const activeProfile = useMemo(() => getScanProfileById(activeProfileId, profiles), [activeProfileId, profiles]);
  const scanResultProfile = useMemo(() => (scanResult ? getScanProfileForResult(scanResult, profiles) : null), [profiles, scanResult]);
  const profileForVisibleResults = scanResultProfile ?? activeProfile;
  const resources = useMemo(() => (scanResult ? mapScanResourcesToAiosResources(scanResult, profiles) : []), [profiles, scanResult]);
  const visibleResources = useMemo(() => filterResourceList(resources, query), [query, resources]);
  const groups = useMemo(() => buildScanGroups(visibleResources, profileForVisibleResults), [profileForVisibleResults, visibleResources]);
  const categorySummary = useMemo(() => (scanResult ? buildProfileCategorySummary(scanResult, profileForVisibleResults) : []), [profileForVisibleResults, scanResult]);
  const skippedCount = scanResult ? countSkippedEntries(scanResult.counts) : (scanJobSnapshot?.progress.skippedEntries ?? 0);
  const lifecycle = scanLifecycleFromSnapshot(scanJobSnapshot, Boolean(selectedDirectory), Boolean(error));
  const scanRunning = lifecycle === "running";
  const scanCancelling = lifecycle === "cancelling";
  const scanLocked = scanRunning || scanCancelling;
  const progressPercent = scanJobSnapshot ? progressPercentFor(scanJobSnapshot) : 0;

  const handleProfileChange = useCallback((_event: unknown, nextProfileId: ScanProfileId | null) => {
    if (!nextProfileId) return;
    setActiveProfileId(nextProfileId);
  }, []);

  const handlePickDirectory = useCallback(async () => {
    setBusyState("picking");
    setError(null);
    try {
      const selected = await pickScanDirectory();
      setSelectedDirectory(selected);
      setScanResult(null);
      setScanJobSnapshot(null);
    } catch (pickError) {
      setError(formatCommandError(pickError));
    } finally {
      setBusyState("idle");
    }
  }, []);

  const handleRunScan = useCallback(async () => {
    if (!selectedDirectory) return;
    setError(null);
    setScanResult(null);
    setScanJobSnapshot(null);
    try {
      const started = await startCustomScanJob(selectedDirectory.selectionId, activeProfile.id);
      setScanJobSnapshot(started.snapshot);
      if (started.snapshot.status === "completed" && started.snapshot.result) {
        setScanResult(started.snapshot.result);
      } else if (started.snapshot.status === "failed") {
        setError(started.snapshot.error?.message ?? "扫描任务失败。");
      }
    } catch (scanError) {
      setError(formatCommandError(scanError));
    }
  }, [activeProfile.id, selectedDirectory]);

  const handleCancelScan = useCallback(async () => {
    if (!scanJobSnapshot || !["queued", "running"].includes(scanJobSnapshot.status)) return;
    setError(null);
    try {
      const snapshot = await cancelScanJob(scanJobSnapshot.jobId);
      setScanJobSnapshot(snapshot);
    } catch (cancelError) {
      setError(formatCommandError(cancelError));
    }
  }, [scanJobSnapshot]);

  return (
    <AiosModuleFrame
      view="custom-scan"
      summary={zhCN.moduleSummaries["custom-scan"]}
      count={visibleResources.length}
      ariaLabel={moduleAriaLabel("custom-scan")}
      actions={
        <>
          <Chip className="status-chip status-ok" label="指定目录" />
          <Chip label="仅元数据" variant="outlined" />
          <Chip className="status-chip status-disabled" label="全盘扫描禁用" variant="outlined" />
        </>
      }
    >
      <AiosSection className="scan-profile-section">
        <AiosSectionHeader
          title="扫描模板"
          summary="模板只调整说明、分类重点和有界上限；AIOS 只扫描你随后手动选择的文件夹。"
          action={<Chip className="status-chip status-ok" label={activeProfile.displayName} variant="outlined" />}
        />
        <Box className="scan-profile-selector" aria-label="扫描模板选择">
          <ToggleButtonGroup disabled={scanLocked} exclusive value={activeProfile.id} onChange={handleProfileChange}>
            {profiles.map((profile) => (
              <ToggleButton disabled={scanLocked} key={profile.id} value={profile.id}>
                <Box component="span">{profile.displayName}</Box>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Box className="scan-profile-detail-grid">
          <Box className="scan-profile-detail">
            <Typography component="strong">{activeProfile.shortDescription}</Typography>
            <Typography color="text.secondary" variant="body2">
              {activeProfile.recommendedUseCase}
            </Typography>
          </Box>
          <Box className="scan-profile-detail">
            <Typography component="strong">安全边界</Typography>
            <Typography color="text.secondary" variant="body2">
              {activeProfile.safetyBoundary}
            </Typography>
          </Box>
          <Box className="scan-profile-detail">
            <Typography component="strong">分类重点</Typography>
            <Typography color="text.secondary" variant="body2">
              {activeProfile.classificationEmphasis.join(" / ")}
            </Typography>
          </Box>
        </Box>
      </AiosSection>

      <AiosSection className="scan-first-use-section">
        <AiosSectionHeader title="首次选择建议" summary="先选边界明确的小目录。不要选择系统根、home 根或磁盘根。" />
        <Box className="scan-first-use-grid">
          {firstUseGuides.map((guide) => (
            <Box className={`scan-first-use-item ${guide.tone}`} key={guide.title}>
              <Typography component="strong">{guide.title}</Typography>
              <Typography color="text.secondary" variant="body2">
                {guide.summary}
              </Typography>
            </Box>
          ))}
        </Box>
      </AiosSection>

      <AiosSection className="scan-control-section">
        <AiosSectionHeader title="扫描控制" summary={`当前模板：${activeProfile.displayName}。只允许系统目录选择器授权的单个目录；结果仅保存在当前界面内存中。`} />
        <Box className="scan-control-grid">
          <Box className="scan-control-card">
            <Box className="scan-control-heading">
              <FolderOpenRounded fontSize="small" />
              <Box className="scan-control-copy">
                <Typography component="strong">目录选择</Typography>
                <Typography color="text.secondary" variant="body2">
                  {selectedDirectory ? selectedDirectory.rootSummary : "尚未选择目录"}
                </Typography>
              </Box>
            </Box>
            {selectedDirectory && (
              <AiosTechnicalDetails
                rows={[
                  { label: "显示名", value: selectedDirectory.displayName },
                  { label: "根摘要", value: selectedDirectory.rootSummary, code: true },
                  { label: "扫描模板", value: activeProfile.displayName },
                  { label: "策略判定", value: "允许指定目录扫描" }
                ]}
              />
            )}
            <Box className="scan-action-row">
              <Button disabled={!tauriAvailable || busyState !== "idle" || scanLocked} startIcon={<FolderOpenRounded />} variant="outlined" onClick={handlePickDirectory}>
                选择目录
              </Button>
              <Button disabled={!tauriAvailable || !selectedDirectory || busyState !== "idle" || scanLocked} startIcon={<PlayArrowRounded />} variant="contained" onClick={handleRunScan}>
                运行扫描
              </Button>
              {scanRunning && (
                <Button color="warning" disabled={!scanJobSnapshot} startIcon={<StopCircleRounded />} variant="outlined" onClick={handleCancelScan}>
                  取消扫描
                </Button>
              )}
            </Box>
          </Box>

          <Box className="scan-control-card boundary">
            <Box className="scan-control-heading">
              <SecurityRounded fontSize="small" />
              <Box className="scan-control-copy">
                <Typography component="strong">策略摘要</Typography>
                <Typography color="text.secondary" variant="body2">
                  深度 {activeProfile.maxDepth} · 上限 {activeProfile.maxEntries} 项 · 单文件元数据阈值 {formatBytes(policy.maxFileSizeBytes)}
                </Typography>
              </Box>
            </Box>
            <AiosTechnicalDetails rows={policyRows(policy, activeProfile)} />
            <Box className="scan-policy-chip-row">
              <Chip className="status-chip status-ok" label="不读取内容" size="small" />
              <Chip className="status-chip status-ok" label="不执行脚本/MCP" size="small" />
              <Chip className="status-chip status-disabled" label="不跟随符号链接" size="small" />
              <Chip className="status-chip status-disabled" label="全盘扫描非 MVP" size="small" />
            </Box>
          </Box>
        </Box>
      </AiosSection>

      {!tauriAvailable && (
        <Box className="scan-boundary-callout warn">
          <WarningAmberRounded fontSize="small" />
          <Typography color="text.secondary" variant="body2">
            当前是 Web/Vite 运行时，只展示扫描入口与策略；目录选择和 Rust 扫描只在 Tauri 桌面应用中启用。
          </Typography>
        </Box>
      )}

      {error && (
        <Box className="scan-boundary-callout warn">
          <WarningAmberRounded fontSize="small" />
          <Typography color="text.secondary" variant="body2">
            {error}
          </Typography>
        </Box>
      )}

      {busyState !== "idle" && (
        <Box className="scan-boundary-callout info">
          <Typography color="text.secondary" variant="body2">
            正在等待目录选择器返回结果。
          </Typography>
        </Box>
      )}

      {(scanJobSnapshot || lifecycle !== "idle") && (
        <AiosSection className="scan-progress-section">
          <AiosSectionHeader
            title="扫描任务"
            summary={lifecycleSummary(lifecycle, scanJobSnapshot)}
            action={<Chip className={`status-chip ${lifecycleChipClass(lifecycle)}`} label={lifecycleLabel(lifecycle)} variant="outlined" />}
          />
          <Box className="scan-progress-card">
            <Box className="scan-progress-heading">
              <Typography component="strong">{scanJobSnapshot?.rootSummary ?? selectedDirectory?.rootSummary ?? "尚未选择目录"}</Typography>
              <Typography color="text.secondary" variant="body2">
                {scanJobSnapshot ? `模板 ${scanJobSnapshot.progress.profileId} · 阶段 ${phaseLabel(scanJobSnapshot.progress.currentPhase)}` : "等待用户选择目录并启动扫描。"}
              </Typography>
            </Box>
            <LinearProgress className="scan-progress-bar" value={progressPercent} variant="determinate" />
            <Box className="scan-progress-grid">
              <ProgressMetric label="已访问" value={scanJobSnapshot?.progress.visitedEntries ?? 0} />
              <ProgressMetric label="已匹配" value={scanJobSnapshot?.progress.matchedResources ?? 0} />
              <ProgressMetric label="已跳过" value={scanJobSnapshot?.progress.skippedEntries ?? 0} />
              <ProgressMetric label="耗时" value={`${scanJobSnapshot ? Math.max(0, Math.round(scanJobSnapshot.progress.elapsedMs / 1000)) : 0}s`} />
              <ProgressMetric label="深度上限" value={scanJobSnapshot?.progress.maxDepth ?? activeProfile.maxDepth} />
              <ProgressMetric label="条目上限" value={scanJobSnapshot?.progress.maxEntries ?? activeProfile.maxEntries} />
            </Box>
          </Box>
        </AiosSection>
      )}

      {scanResult && (
        <AiosSection className="scan-result-section">
          <AiosSectionHeader title="扫描结果" summary={`${scanResult.rootSummary} · ${profileForVisibleResults.displayName} · ${formatDate(scanResult.scannedAtMs)}`} />
          <Box className="scan-summary-grid">
            <AiosUsageCard title="模板" purpose={profileForVisibleResults.shortDescription} technicalName={profileForVisibleResults.displayName} />
            <AiosUsageCard title="已访问" purpose="遍历到的目录与文件条目数量。" technicalName={`${scanResult.counts.visitedEntries}`} />
            <AiosUsageCard title="已归类" purpose="返回到当前界面的元数据资源数量。" technicalName={`${scanResult.counts.returnedResources}`} />
            <AiosUsageCard title="已跳过" purpose="排除、过大、符号链接或权限失败条目。" technicalName={`${skippedCount}`} />
            <AiosUsageCard title="提示" purpose="扫描策略提示和可解释跳过原因。" technicalName={`${scanResult.warnings.length}`} />
          </Box>
          <Box className="scan-category-summary-grid" aria-label="扫描模板分类摘要">
            {categorySummary.map((item) => (
              <Box className="scan-category-summary-item" key={item.title}>
                <Typography component="strong">{item.title}</Typography>
                <Typography className="scan-category-count" component="span">
                  {item.value}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {item.summary}
                </Typography>
              </Box>
            ))}
          </Box>
        </AiosSection>
      )}

      {(scanResult || scanJobSnapshot) && (
        <AiosSection className="scan-skipped-summary-section">
          <AiosSectionHeader title="跳过摘要" summary="仅展示聚合计数；不会暴露绝对路径或敏感值。" count={skippedSummaryItems(scanResult, scanJobSnapshot).reduce((total, item) => total + item.value, 0)} />
          <Box className="scan-skipped-summary-grid">
            {skippedSummaryItems(scanResult, scanJobSnapshot).map((item) => (
              <Box className="scan-skipped-summary-item" key={item.label}>
                <Typography component="strong">{item.label}</Typography>
                <Typography className="scan-category-count" component="span">
                  {item.value}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {item.summary}
                </Typography>
              </Box>
            ))}
          </Box>
        </AiosSection>
      )}

      {scanResult && (scanResult.warnings.length > 0 || skippedCount > 0) && (
        <AiosSection className="scan-warning-section">
          <AiosSectionHeader title="跳过与提示" summary="仅显示 redacted 路径和策略原因，不显示敏感值。" count={scanResult.warnings.length} />
          <Box className="scan-warning-list">
            {scanResult.warnings.slice(0, 8).map((warning, index) => (
              <Box className="scan-warning-row" key={`${warning.code}:${warning.relativePath ?? index}`}>
                <Chip label={warning.code} size="small" variant="outlined" />
                <Typography color="text.secondary" variant="body2">
                  {warning.relativePath ? `${warning.relativePath} · ${warning.message}` : warning.message}
                </Typography>
              </Box>
            ))}
            {scanResult.warnings.length > 8 && (
              <Typography color="text.secondary" variant="body2">
                还有 {scanResult.warnings.length - 8} 条提示已折叠。
              </Typography>
            )}
          </Box>
        </AiosSection>
      )}

      {scanResult ? (
        groups.length === 0 ? (
          <ModuleEmptyState />
        ) : (
          groups.map((group) => (
            <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant={variantForGroup(group)} onSelect={onSelect} />
          ))
        )
      ) : (
        <Box className="scan-empty-state">
          <Typography component="strong">{emptyStateTitle(lifecycle)}</Typography>
          <Typography color="text.secondary" variant="body2">
            {emptyStateSummary(lifecycle)}
          </Typography>
        </Box>
      )}
    </AiosModuleFrame>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <Box className="scan-progress-metric">
      <Typography component="span">{label}</Typography>
      <Typography component="strong">{value}</Typography>
    </Box>
  );
}

function progressPercentFor(snapshot: ScanJobSnapshot): number {
  if (snapshot.progress.maxEntries <= 0) return 0;
  return Math.max(0, Math.min(100, (snapshot.progress.visitedEntries / snapshot.progress.maxEntries) * 100));
}

function lifecycleLabel(lifecycle: ScanLifecycleState): string {
  const labels: Record<ScanLifecycleState, string> = {
    idle: "空闲",
    "directory-selected": "已选目录",
    running: "运行中",
    cancelling: "取消中",
    completed: "已完成",
    cancelled: "已取消",
    failed: "失败"
  };
  return labels[lifecycle];
}

function lifecycleChipClass(lifecycle: ScanLifecycleState): string {
  if (lifecycle === "running" || lifecycle === "completed" || lifecycle === "directory-selected") return "status-ok";
  if (lifecycle === "cancelled" || lifecycle === "cancelling") return "status-warn";
  if (lifecycle === "failed") return "status-warn";
  return "status-disabled";
}

function lifecycleSummary(lifecycle: ScanLifecycleState, snapshot: ScanJobSnapshot | null): string {
  if (snapshot?.error?.message) return snapshot.error.message;
  if (lifecycle === "running") return "正在执行有界 metadata-only 扫描；可取消，不读取内容。";
  if (lifecycle === "cancelling") return "已请求取消，Rust 扫描器会在下一个遍历检查点停止。";
  if (lifecycle === "completed") return "扫描已完成，结果仅保存在当前界面内存中。";
  if (lifecycle === "cancelled") return "扫描已取消，可重新运行或选择其它目录。";
  if (lifecycle === "failed") return "扫描失败，可选择其它目录或重新运行。";
  if (lifecycle === "directory-selected") return "目录已选择，等待手动运行扫描。";
  return "等待指定目录扫描。";
}

function emptyStateTitle(lifecycle: ScanLifecycleState): string {
  if (lifecycle === "cancelled") return "扫描已取消";
  if (lifecycle === "failed") return "扫描失败";
  if (lifecycle === "running" || lifecycle === "cancelling") return "扫描任务运行中";
  if (lifecycle === "completed") return "没有匹配的可见结果";
  return "等待指定目录扫描";
}

function emptyStateSummary(lifecycle: ScanLifecycleState): string {
  if (lifecycle === "cancelled") return "任务已安全停止。可以重新运行当前目录，也可以选择其它目录。";
  if (lifecycle === "failed") return "错误已显示在上方。修正目录选择后可重新运行；不会保留失败历史。";
  if (lifecycle === "running" || lifecycle === "cancelling") return "正在处理任务状态，结果会在完成后显示。";
  if (lifecycle === "completed") return "扫描完成，但当前搜索或分类下没有可见结果。";
  return "先选择扫描模板，再选择一个通过策略守卫的目录并手动运行扫描。全盘扫描已禁用，非 MVP，未来需要单独批准。";
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    queued: "排队",
    walking: "遍历元数据",
    finalizing: "汇总结果",
    completed: "完成",
    cancelling: "取消中",
    cancelled: "已取消",
    failed: "失败"
  };
  return labels[phase] ?? phase;
}

interface SkippedSummaryItem {
  label: string;
  value: number;
  summary: string;
}

function skippedSummaryItems(result: CustomScanResult | null, snapshot: ScanJobSnapshot | null): SkippedSummaryItem[] {
  const counts = result?.counts;
  const cancellationCount = counts?.skippedByCancellation ?? (snapshot?.status === "cancelled" ? 1 : 0);
  return [
    {
      label: "排除规则",
      value: counts?.skippedByExclude ?? 0,
      summary: "命中依赖、缓存、构建产物、虚拟环境或工具缓存等强 exclude。"
    },
    {
      label: "路径守卫",
      value: counts?.skippedByGuard ?? 0,
      summary: "根目录、home、系统或磁盘根会在扫描前被拒绝。"
    },
    {
      label: "元数据错误",
      value: counts?.skippedByMetadataError ?? counts?.deniedErrors ?? 0,
      summary: "无法读取条目元数据或遍历权限失败的聚合计数。"
    },
    {
      label: "上限截断",
      value: counts?.skippedByLimit ?? (counts?.truncated ? 1 : 0),
      summary: "达到模板 max entries 后停止遍历。"
    },
    {
      label: "取消停止",
      value: cancellationCount,
      summary: "用户取消后在遍历检查点停止的计数。"
    },
    {
      label: "大小 / 符号链接",
      value: (counts?.skippedBySize ?? 0) + (counts?.skippedSymlinks ?? 0),
      summary: "超过元数据阈值或符号链接条目；符号链接不跟随。"
    }
  ];
}

function policyRows(policy: ScannerPolicy, profile: ScanProfileDefinition): AiosTechnicalDetailRow[] {
  return [
    { label: "默认模板", value: policy.defaultProfileId, code: true },
    { label: "模板上限", value: profile.maxDepthEntryPolicy },
    { label: "排除策略", value: profile.excludePolicySummary },
    { label: "内容读取", value: policy.contentReadingEnabled ? "启用" : "禁用" },
    { label: "执行能力", value: policy.executionEnabled ? "启用" : "禁用" },
    { label: "全盘扫描", value: policy.fullDiskScanEnabled ? "启用" : "禁用" },
    { label: "忽略规则", value: policy.respectsIgnoreFiles ? "尊重 .ignore/.gitignore" : "未启用" }
  ];
}

function buildScanGroups(resources: ReturnType<typeof mapScanResourcesToAiosResources>, profile: ScanProfileDefinition): ResourceGroupData[] {
  const groups = scanKindOrder.map((kind) => {
    const resourcesForKind = resources.filter((resource) => resource.metadata?.scanResourceKind === kind);
    return {
      title: scanKindLabels[kind],
      summary: `${profile.resultGroupLabel} · ${scanKindSummaries[kind]}`,
      resources: resourcesForKind
    };
  });

  return groups.filter((group) => group.resources.length > 0);
}

interface ScanCategorySummaryItem {
  title: string;
  value: number;
  summary: string;
}

function buildProfileCategorySummary(result: CustomScanResult, profile: ScanProfileDefinition): ScanCategorySummaryItem[] {
  const counts = countResourceKinds(result.resources);
  const emphasized = profile.emphasizedResourceKinds.map((kind) => [kind, counts.get(kind) ?? 0] as const).filter(([, count]) => count > 0);
  const emphasizedCount = emphasized.reduce((total, [, count]) => total + count, 0);
  const sensitiveCount = result.resources.filter((resource) => resource.sensitive).length;
  const otherCount = result.resources.length - emphasizedCount;

  return [
    {
      title: "模板重点",
      value: emphasizedCount,
      summary: emphasized.length > 0 ? emphasized.map(([kind, count]) => `${scanKindLabels[kind]} ${count}`).join(" / ") : "未命中当前模板重点类别。"
    },
    {
      title: "其它类别",
      value: otherCount,
      summary: otherCount > 0 ? "来自同一次扫描结果，但不在当前模板重点类别中。" : "当前返回资源均落在模板重点类别中。"
    },
    {
      title: "敏感路径",
      value: sensitiveCount,
      summary: sensitiveCount > 0 ? "命中敏感命名路径段，已按策略隐藏。" : "本次结果未返回敏感命名路径段。"
    },
    {
      title: "跳过提示",
      value: result.warnings.length,
      summary: result.warnings.length > 0 ? "扫描返回了可解释的跳过或遍历提示。" : "本次扫描未返回额外提示。"
    }
  ];
}

function countResourceKinds(resources: CustomScanResult["resources"]): Map<ScanResourceKind, number> {
  const counts = new Map<ScanResourceKind, number>();
  for (const resource of resources) {
    counts.set(resource.resourceKind, (counts.get(resource.resourceKind) ?? 0) + 1);
  }
  return counts;
}

function variantForGroup(group: ResourceGroupData): ResourceCardVariant {
  const kind = scanKindOrder.find((candidate) => scanKindLabels[candidate] === group.title);
  if (kind === "skill") return "skill";
  if (kind === "mcp-config") return "mcp";
  if (kind === "script") return "script";
  if (kind === "report-doc") return "report";
  if (kind === "policy-governance") return "policy";
  if (kind === "validator") return "validator";
  return "project-pack";
}

function formatCommandError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return String(error);
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) return `${Math.round(value / 1024 / 1024)} MiB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KiB`;
  return `${value} B`;
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}

const scanKindOrder: ScanResourceKind[] = [
  "skill",
  "prompt",
  "mcp-config",
  "script",
  "validator",
  "report-doc",
  "project-pack",
  "policy-governance",
  "package-manifest",
  "unknown-local-resource"
];

const scanKindLabels: Record<ScanResourceKind, string> = {
  skill: "技能",
  prompt: "提示词",
  "mcp-config": "MCP / 配置元数据",
  script: "脚本",
  validator: "验证器",
  "report-doc": "报告与文档",
  "project-pack": "项目包",
  "policy-governance": "策略治理",
  "package-manifest": "包清单",
  "unknown-local-resource": "未知本地资源"
};

const scanKindSummaries: Record<ScanResourceKind, string> = {
  skill: "根据路径或 SKILL.md 文件名识别，未读取技能正文。",
  prompt: "根据 prompts 路径或文件名识别，未读取提示词内容。",
  "mcp-config": "仅识别 MCP 相关配置路径和文件名，不启动或连接 MCP。",
  script: "脚本入口仅作为元数据展示，不执行。",
  validator: "验证器仅归类展示，不运行。",
  "report-doc": "报告和文档仅展示路径、时间和大小元数据。",
  "project-pack": "项目资源包元数据，保留在当前扫描结果内存中。",
  "policy-governance": "策略治理文件仅识别路径和名称，不读取策略正文。",
  "package-manifest": "包管理与项目 manifest，仅识别文件名。",
  "unknown-local-resource": "未匹配已知类别的本地条目，只保留安全元数据。"
};

const firstUseGuides: Array<{ title: string; summary: string; tone: "ok" | "warn" }> = [
  {
    title: "选择项目文件夹",
    summary: "适合包含 package.json、docs、scripts 或项目内 AI 资源的仓库目录。",
    tone: "ok"
  },
  {
    title: "选择技能 / 提示词文件夹",
    summary: "适合 skills、prompts 或项目内 .agents/skills 这类明确工作区。",
    tone: "ok"
  },
  {
    title: "选择 AIOS 工作区",
    summary: "适合本仓库或你明确授权的 AIOS 局部工作目录。",
    tone: "ok"
  },
  {
    title: "不要选择系统 / home / 磁盘根",
    summary: "根目录、home 根和系统目录会被守卫拒绝；也不会提供全盘扫描入口。",
    tone: "warn"
  }
];
