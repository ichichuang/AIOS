import { Box, Button, Checkbox, Chip, IconButton, LinearProgress, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import DeleteRounded from "@mui/icons-material/DeleteRounded";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import StorageRounded from "@mui/icons-material/StorageRounded";
import StopCircleRounded from "@mui/icons-material/StopCircleRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { filterResourceList } from "../../lib/filtering";
import {
  countSkippedEntries,
  canStartScanMode,
  ADVANCED_FULL_DISK_CONFIRMATION_COPY,
  fallbackScanPolicy,
  fallbackScanProfiles,
  DEFAULT_SCAN_MODE_ID,
  DEFAULT_SCAN_PROFILE_ID,
  WEB_DISCOVERY_UNAVAILABLE_COPY,
  customDirectoryScanProfiles,
  getScanModeById,
  getScanModeSafetyCard,
  getScanPolicy,
  getScanProfileById,
  getScanProfileForResult,
  getScanProfiles,
  isTauriRuntimeAvailable,
  mapScanResourcesToAiosResources,
  nextScanModeState,
  scanModeDefinitions,
  type CustomScanResult,
  type ScanJobSnapshot,
  type ScanModeId,
  type ScanProfileDefinition,
  type ScanProfileId,
  type ScanResourceKind,
  type ScannerPolicy,
} from "../../lib/customDirectoryScan";
import {
  addScanSources,
  addDiscoveryScanSources,
  buildPrivacyDataControlSummary,
  buildPersistedLibraryState,
  buildDiscoveryResultStats,
  buildSelectedBatchSourceIds,
  cancelScanBatch,
  clearResourceLibrary,
  fallbackResourceLibrarySummary,
  fallbackResourceStoreStatus,
  getScanBatchSnapshot,
  getResourceLibrarySummary,
  getResourceStoreStatus,
  isTerminalScanBatchStatus,
  listPersistedScanJobs,
  listScanSources,
  patchSourceInList,
  removeScanSource,
  scanBatchProgressPercent,
  scanBatchStatusLabel,
  startScanSourcesBatch,
  updateScanSource,
  WHAT_AIOS_NEVER_STORES_COPY,
  WHAT_AIOS_STORES_COPY,
  type PersistedScanJob,
  type PersistedScanSource,
  type ResourceLibrarySummary,
  type ResourceStoreStatus,
  type ScanBatchSnapshot
} from "../../lib/resourceStore";
import { ResourceGroup, type ResourceGroupData } from "../resources/ResourceGroup";
import { AiosModuleFrame, AiosSection, AiosSectionHeader, AiosTechnicalDetails, AiosUsageCard, type AiosTechnicalDetailRow } from "../ui/AiosUiPrimitives";
import type { ResourceCardVariant } from "../resources/ResourceCard";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

export function CustomScanModule({ query, resourceCorpus, selectedId, onSelect }: AiosModuleProps) {
  const [policy, setPolicy] = useState<ScannerPolicy>(fallbackScanPolicy);
  const [profiles, setProfiles] = useState<ScanProfileDefinition[]>(fallbackScanProfiles);
  const [activeScanModeId, setActiveScanModeId] = useState<ScanModeId>(DEFAULT_SCAN_MODE_ID);
  const [activeProfileId, setActiveProfileId] = useState<ScanProfileId>(DEFAULT_SCAN_PROFILE_ID);
  const [advancedConfirmed, setAdvancedConfirmed] = useState(false);
  const [scanResult, setScanResult] = useState<CustomScanResult | null>(null);
  const [resourceStoreStatus, setResourceStoreStatus] = useState<ResourceStoreStatus>(fallbackResourceStoreStatus);
  const [librarySummary, setLibrarySummary] = useState<ResourceLibrarySummary>(fallbackResourceLibrarySummary);
  const [persistedSources, setPersistedSources] = useState<PersistedScanSource[]>([]);
  const [persistedJobs, setPersistedJobs] = useState<PersistedScanJob[]>([]);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [sourceProjectDrafts, setSourceProjectDrafts] = useState<Record<string, string>>({});
  const [newProjectLabel, setNewProjectLabel] = useState("");
  const [batchSnapshot, setBatchSnapshot] = useState<ScanBatchSnapshot | null>(null);
  const [libraryBusyState, setLibraryBusyState] = useState<"idle" | "loading" | "clearing">("idle");
  const [sourceBusyId, setSourceBusyId] = useState<string | null>(null);
  const [batchBusyState, setBatchBusyState] = useState<"idle" | "adding" | "starting" | "cancelling">("idle");
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tauriAvailable = isTauriRuntimeAvailable();
  const refreshCorpus = resourceCorpus.refresh;

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

  const refreshResourceLibrary = useCallback(async () => {
    setLibraryBusyState("loading");
    try {
      const [nextStatus, nextSummary, nextSources, nextJobs] = await Promise.all([getResourceStoreStatus(), getResourceLibrarySummary(), listScanSources(), listPersistedScanJobs(6)]);
      setResourceStoreStatus(nextStatus);
      setLibrarySummary(nextSummary);
      setPersistedSources(nextSources);
      setPersistedJobs(nextJobs);
      setSourceProjectDrafts((current) => {
        const nextDrafts: Record<string, string> = {};
        for (const source of nextSources) {
          nextDrafts[source.id] = current[source.id] ?? source.projectLabel ?? "";
        }
        return nextDrafts;
      });
      setSelectedSourceIds((current) => {
        const existingIds = new Set(nextSources.map((source) => source.id));
        const retained = current.filter((id) => existingIds.has(id));
        if (retained.length > 0) return retained;
        return nextSources.filter((source) => source.enabled).map((source) => source.id);
      });
      setLibraryError(null);
      refreshCorpus();
    } catch (storeError) {
      setLibraryError(formatCommandError(storeError));
    } finally {
      setLibraryBusyState("idle");
    }
  }, [refreshCorpus]);

  useEffect(() => {
    void refreshResourceLibrary();
  }, [refreshResourceLibrary]);

  useEffect(() => {
    if (!tauriAvailable || !batchSnapshot || isTerminalScanBatchStatus(batchSnapshot.status)) return undefined;
    let active = true;
    const intervalId = window.setInterval(() => {
      getScanBatchSnapshot(batchSnapshot.batchId)
        .then((snapshot) => {
          if (!active) return;
          setBatchSnapshot(snapshot);
          if (isTerminalScanBatchStatus(snapshot.status)) {
            void refreshResourceLibrary();
          }
        })
        .catch((snapshotError: unknown) => {
          if (active) setError(formatCommandError(snapshotError));
        });
    }, 800);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [batchSnapshot, refreshResourceLibrary, tauriAvailable]);

  const activeScanMode = useMemo(() => getScanModeById(activeScanModeId), [activeScanModeId]);
  const customProfiles = useMemo(() => customDirectoryScanProfiles(profiles), [profiles]);
  const activeProfile = useMemo(() => getScanProfileById(activeScanMode.id === "custom-directory" ? activeProfileId : activeScanMode.profileId, profiles), [activeProfileId, activeScanMode.id, activeScanMode.profileId, profiles]);
  const scanResultProfile = useMemo(() => (scanResult ? getScanProfileForResult(scanResult, profiles) : null), [profiles, scanResult]);
  const profileForVisibleResults = scanResultProfile ?? activeProfile;
  const resources = useMemo(() => (scanResult ? mapScanResourcesToAiosResources(scanResult, profiles) : []), [profiles, scanResult]);
  const visibleResources = useMemo(() => filterResourceList(resources, query), [query, resources]);
  const groups = useMemo(() => buildScanGroups(visibleResources, profileForVisibleResults), [profileForVisibleResults, visibleResources]);
  const categorySummary = useMemo(() => (scanResult ? buildProfileCategorySummary(scanResult, profileForVisibleResults) : []), [profileForVisibleResults, scanResult]);
  const persistedLibraryState = useMemo(() => buildPersistedLibraryState(librarySummary, persistedSources, persistedJobs, selectedSourceIds), [librarySummary, persistedJobs, persistedSources, selectedSourceIds]);
  const privacySummary = useMemo(() => buildPrivacyDataControlSummary(resourceStoreStatus, librarySummary, persistedSources), [librarySummary, persistedSources, resourceStoreStatus]);
  const selectedBatchSourceIds = useMemo(() => buildSelectedBatchSourceIds(persistedSources, selectedSourceIds), [persistedSources, selectedSourceIds]);
  const discoveryStats = useMemo(() => buildDiscoveryResultStats(librarySummary, persistedSources, batchSnapshot), [batchSnapshot, librarySummary, persistedSources]);
  const hasDiscoverySources = persistedSources.some((source) => source.sourceKind === "intelligent-discovery" || source.sourceKind === "advanced-full-disk");
  const skippedCount = scanResult ? countSkippedEntries(scanResult.counts) : 0;
  const scanRunning = Boolean(batchSnapshot && !isTerminalScanBatchStatus(batchSnapshot.status) && batchSnapshot.status !== "cancelling");
  const scanCancelling = batchSnapshot?.status === "cancelling" || batchBusyState === "cancelling";
  const scanLocked = scanRunning || scanCancelling;
  const batchProgressPercent = scanBatchProgressPercent(batchSnapshot);
  const canStartActiveScanMode = canStartScanMode(activeScanMode.id, {
    hasSelectedSources: selectedBatchSourceIds.length > 0,
    advancedConfirmed,
    tauriAvailable,
    scanLocked
  }) && batchBusyState === "idle";

  const handleScanModeChange = useCallback((modeId: ScanModeId) => {
    const next = nextScanModeState(modeId, { advancedConfirmed });
    setActiveScanModeId(next.modeId);
    setAdvancedConfirmed(next.advancedConfirmed);
    setError(null);
  }, [advancedConfirmed]);

  const handleProfileChange = useCallback((_event: unknown, nextProfileId: ScanProfileId | null) => {
    if (!nextProfileId) return;
    setActiveProfileId(nextProfileId);
  }, []);

  const handleAddSources = useCallback(async () => {
    setBatchBusyState("adding");
    setError(null);
    try {
      const result = await addScanSources(activeProfile.id, newProjectLabel);
      await refreshResourceLibrary();
      if (result.sources.length > 0) {
        setSelectedSourceIds((current) => Array.from(new Set([...current, ...result.sources.map((source) => source.id)])));
      }
    } catch (addError) {
      setError(formatCommandError(addError));
    } finally {
      setBatchBusyState("idle");
    }
  }, [activeProfile.id, newProjectLabel, refreshResourceLibrary]);

  const handleStartBatch = useCallback(async () => {
    if (selectedBatchSourceIds.length === 0) {
      setError("请至少选择一个已启用的扫描来源。");
      return;
    }
    setBatchBusyState("starting");
    setError(null);
    setScanResult(null);
    try {
      const started = await startScanSourcesBatch(selectedBatchSourceIds, { advancedConfirmationAccepted: advancedConfirmed });
      setBatchSnapshot(started.snapshot);
    } catch (scanError) {
      setError(formatCommandError(scanError));
    } finally {
      setBatchBusyState("idle");
    }
  }, [advancedConfirmed, selectedBatchSourceIds]);

  const handleStartDiscovery = useCallback(async () => {
    if (activeScanMode.id === "custom-directory") {
      await handleStartBatch();
      return;
    }
    setBatchBusyState("starting");
    setError(null);
    setScanResult(null);
    try {
      const added = await addDiscoveryScanSources(activeScanMode.id, advancedConfirmed, newProjectLabel);
      const sourceIds = added.sources.filter((source) => source.enabled).map((source) => source.id);
      if (sourceIds.length === 0) {
        setError("未找到可扫描的发现来源。");
        return;
      }
      setSelectedSourceIds((current) => Array.from(new Set([...current, ...sourceIds])));
      const started = await startScanSourcesBatch(sourceIds, { advancedConfirmationAccepted: advancedConfirmed });
      setBatchSnapshot(started.snapshot);
      await refreshResourceLibrary();
    } catch (scanError) {
      setError(formatCommandError(scanError));
    } finally {
      setBatchBusyState("idle");
    }
  }, [activeScanMode.id, advancedConfirmed, handleStartBatch, newProjectLabel, refreshResourceLibrary]);

  const handleCancelBatch = useCallback(async () => {
    if (!batchSnapshot || isTerminalScanBatchStatus(batchSnapshot.status)) return;
    setBatchBusyState("cancelling");
    setError(null);
    try {
      const snapshot = await cancelScanBatch(batchSnapshot.batchId);
      setBatchSnapshot(snapshot);
    } catch (cancelError) {
      setError(formatCommandError(cancelError));
    } finally {
      setBatchBusyState("idle");
    }
  }, [batchSnapshot]);

  const handleToggleSourceSelection = useCallback((sourceId: string, checked: boolean) => {
    setSelectedSourceIds((current) => (checked ? Array.from(new Set([...current, sourceId])) : current.filter((id) => id !== sourceId)));
  }, []);

  const handleUpdateSourceProfile = useCallback(async (source: PersistedScanSource, profileId: string) => {
    setSourceBusyId(source.id);
    setError(null);
    try {
      const updated = await updateScanSource({ id: source.id, profileId });
      setPersistedSources((current) => patchSourceInList(current, updated));
      await refreshResourceLibrary();
    } catch (updateError) {
      setError(formatCommandError(updateError));
    } finally {
      setSourceBusyId(null);
    }
  }, [refreshResourceLibrary]);

  const handleUpdateSourceEnabled = useCallback(async (source: PersistedScanSource, enabled: boolean) => {
    setSourceBusyId(source.id);
    setError(null);
    try {
      const updated = await updateScanSource({ id: source.id, enabled });
      setPersistedSources((current) => patchSourceInList(current, updated));
      setSelectedSourceIds((current) => (enabled ? current : current.filter((id) => id !== source.id)));
      await refreshResourceLibrary();
    } catch (updateError) {
      setError(formatCommandError(updateError));
    } finally {
      setSourceBusyId(null);
    }
  }, [refreshResourceLibrary]);

  const handleProjectDraftChange = useCallback((sourceId: string, value: string) => {
    setSourceProjectDrafts((current) => ({ ...current, [sourceId]: value }));
  }, []);

  const handleProjectBlur = useCallback(async (source: PersistedScanSource) => {
    const nextProjectLabel = sourceProjectDrafts[source.id] ?? "";
    if ((source.projectLabel ?? "") === nextProjectLabel.trim()) return;
    setSourceBusyId(source.id);
    setError(null);
    try {
      const updated = await updateScanSource({ id: source.id, projectLabel: nextProjectLabel });
      setPersistedSources((current) => patchSourceInList(current, updated));
      await refreshResourceLibrary();
    } catch (updateError) {
      setError(formatCommandError(updateError));
    } finally {
      setSourceBusyId(null);
    }
  }, [refreshResourceLibrary, sourceProjectDrafts]);

  const handleRemoveSource = useCallback(async (source: PersistedScanSource) => {
    setSourceBusyId(source.id);
    setError(null);
    try {
      await removeScanSource(source.id);
      setSelectedSourceIds((current) => current.filter((id) => id !== source.id));
      await refreshResourceLibrary();
    } catch (removeError) {
      setError(formatCommandError(removeError));
    } finally {
      setSourceBusyId(null);
    }
  }, [refreshResourceLibrary]);

  const handleClearResourceLibrary = useCallback(async () => {
    setLibraryBusyState("clearing");
    setLibraryError(null);
    try {
      await clearResourceLibrary();
      setSelectedSourceIds([]);
      setBatchSnapshot(null);
      setScanResult(null);
      resourceCorpus.onSetFirstRunOnboardingDismissed(false);
      await refreshResourceLibrary();
    } catch (clearError) {
      setLibraryError(formatCommandError(clearError));
    } finally {
      setLibraryBusyState("idle");
    }
  }, [refreshResourceLibrary]);

  return (
    <AiosModuleFrame
      view="custom-scan"
      summary={zhCN.moduleSummaries["custom-scan"]}
      count={librarySummary.resourceCount}
      ariaLabel={moduleAriaLabel("custom-scan")}
      actions={
        <>
          <Chip className="status-chip status-ok" label="扫描管理" />
          <Chip label="仅元数据" variant="outlined" />
          <Chip className="status-chip status-disabled" label="显式启动" variant="outlined" />
        </>
      }
    >
      <AiosSection className="scan-profile-section">
        <AiosSectionHeader
          title="扫描模式"
          summary="AIOS 首次启动不会扫描这台机器。必须选择模式、阅读边界说明，并手动点击开始。"
          action={<Chip className="status-chip status-ok" label={activeScanMode.title} variant="outlined" />}
        />
        {resourceCorpus.summary.resourceCount === 0 && (
          <Box className="scan-boundary-callout info">
            <SecurityRounded fontSize="small" />
            <Typography color="text.secondary" variant="body2">
              AIOS 尚未扫描任何目录或尚未产生动态资源。AIOS 不会自动扫描；可以手动添加项目文件夹，或让非技术用户使用智能全机发现。高级全盘发现更慢、受权限影响，并且必须显式确认。所有扫描都是本地 metadata-only。
            </Typography>
          </Box>
        )}
        {resourceCorpus.summary.resourceCount > 0 && (
          <Box className="scan-boundary-callout info">
            <StorageRounded fontSize="small" />
            <Typography color="text.secondary" variant="body2">
              本机已有 AIOS 本地资源库：{resourceCorpus.summary.resourceCount} 项动态资源。清空本地数据仍需用户手动触发，不会自动删除或重置。
            </Typography>
          </Box>
        )}
        <Box className="scan-mode-card-grid" aria-label="扫描模式选择">
          {scanModeDefinitions.map((mode) => {
            const safetyCard = getScanModeSafetyCard(mode.id);
            return (
              <Button
                className={`scan-mode-card ${activeScanMode.id === mode.id ? "active" : ""}`}
                disabled={scanLocked}
                key={mode.id}
                variant="outlined"
                onClick={() => handleScanModeChange(mode.id)}
              >
                <Box className="scan-mode-card-copy">
                  <Typography component="strong">{mode.title}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    {mode.summary}
                  </Typography>
                  <Box className="scan-mode-safety-list">
                    <Typography color="text.secondary" variant="body2">
                      适合：{safetyCard.intendedUsers}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      扫描：{safetyCard.whatScans}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      跳过：{safetyCard.whatSkips}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      确认：{safetyCard.confirmation}
                    </Typography>
                  </Box>
                  <Chip label={mode.requiresConfirmation ? "需要确认" : "手动启动"} size="small" variant="outlined" />
                </Box>
              </Button>
            );
          })}
        </Box>
      </AiosSection>

      <AiosSection className="scan-profile-section">
        <AiosSectionHeader
          title={activeScanMode.id === "custom-directory" ? "扫描模板" : "发现模式边界"}
          summary={activeScanMode.id === "custom-directory" ? "模板只改变分类重点；添加来源不会自动扫描。" : activeScanMode.warning}
          action={<Chip className="status-chip status-ok" label={activeProfile.displayName} variant="outlined" />}
        />
        <Box className="scan-profile-selector" aria-label="扫描模板选择">
          <ToggleButtonGroup disabled={scanLocked || activeScanMode.id !== "custom-directory"} exclusive value={activeScanMode.id === "custom-directory" ? activeProfile.id : activeProfile.id} onChange={handleProfileChange}>
            {customProfiles.map((profile) => (
              <ToggleButton disabled={scanLocked || activeScanMode.id !== "custom-directory"} key={profile.id} value={profile.id}>
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
        <AiosSectionHeader title="来源设置" summary="添加来源只保存授权目录元数据，不会自动扫描；扫描必须手动启动。" />
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
        <AiosSectionHeader title="批次控制" summary={activeScanMode.id === "custom-directory" ? `默认新来源模板：${activeProfile.displayName}。批次扫描按已选择且已启用的来源顺序执行。` : "发现模式会先创建用户确认的来源，再使用同一个可取消批次扫描运行时。"} />
        <Box className="scan-control-grid">
          <Box className="scan-control-card">
            <Box className="scan-control-heading">
              <FolderOpenRounded fontSize="small" />
              <Box className="scan-control-copy">
                <Typography component="strong">{activeScanMode.id === "custom-directory" ? "添加扫描来源" : "启动发现扫描"}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {activeScanMode.id === "custom-directory" ? "系统目录选择器可一次选择多个目录；添加后不会自动扫描。" : "候选来源只在点击开始后解析；Web/Vite 预览不会运行真实发现扫描。"}
                </Typography>
              </Box>
            </Box>
            <TextField
              disabled={scanLocked}
              label="默认项目 / scope 标签"
              size="small"
              value={newProjectLabel}
              onChange={(event) => setNewProjectLabel(event.target.value)}
            />
            {activeScanMode.id === "advanced-full-disk" && (
              <Box className="scan-advanced-confirmation">
                <Checkbox checked={advancedConfirmed} disabled={scanLocked} onChange={(event) => setAdvancedConfirmed(event.target.checked)} />
                <Typography color="text.secondary" variant="body2">
                  {ADVANCED_FULL_DISK_CONFIRMATION_COPY}
                </Typography>
              </Box>
            )}
            <Box className="scan-action-row">
              {activeScanMode.id === "custom-directory" && (
                <Button disabled={!tauriAvailable || batchBusyState !== "idle" || scanLocked} startIcon={<AddRounded />} variant="outlined" onClick={handleAddSources}>
                  添加目录
                </Button>
              )}
              <Button disabled={!canStartActiveScanMode} startIcon={<PlayArrowRounded />} variant="contained" onClick={activeScanMode.id === "custom-directory" ? handleStartBatch : handleStartDiscovery}>
                {activeScanMode.id === "custom-directory" ? "扫描所选" : "开始发现"}
              </Button>
              <Button disabled={libraryBusyState !== "idle" || scanLocked} startIcon={<RefreshRounded />} variant="outlined" onClick={refreshResourceLibrary}>
                刷新
              </Button>
              {scanLocked && (
                <Button color="warning" disabled={!batchSnapshot || batchBusyState === "cancelling"} startIcon={<StopCircleRounded />} variant="outlined" onClick={handleCancelBatch}>
                  取消批次
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
              <Chip className="status-chip status-disabled" label="本地 SQLite" size="small" />
              <Chip className="status-chip status-disabled" label="可取消" size="small" />
            </Box>
            <Box className="scan-boundary-callout warn">
              <WarningAmberRounded fontSize="small" />
              <Typography color="text.secondary" variant="body2">
                macOS 或桌面受保护文件夹可能被跳过，permission denied 属于预期结果。你可以改为手动添加具体项目文件夹；AIOS 不会自动修改系统设置。
              </Typography>
            </Box>
          </Box>
        </Box>
      </AiosSection>

      <AiosSection className="scan-sources-section">
        <AiosSectionHeader title="已保存扫描来源" summary="移除来源只删除 AIOS 本地库中的来源、任务和资源位置记录，不删除用户文件。" count={persistedSources.length} />
        <Box className="scan-source-list" aria-label="扫描来源列表">
          {persistedSources.length > 0 ? (
            persistedSources.map((source) => {
              const row = persistedLibraryState.sourceRows.find((candidate) => candidate.id === source.id);
              const sourceBusy = sourceBusyId === source.id || scanLocked;
              const batchSource = batchSnapshot?.sources.find((candidate) => candidate.scanSourceId === source.id);
              const status = batchSource?.status ?? row?.status ?? "idle";
              const sourceProfileOptions = source.sourceKind === "custom-directory" ? customProfiles : [getScanProfileById(source.profileId, profiles)];
              return (
                <Box className={`scan-source-row ${source.enabled ? "" : "disabled"}`} key={source.id}>
                  <Checkbox
                    checked={selectedSourceIds.includes(source.id)}
                    disabled={!source.enabled || sourceBusy}
                    slotProps={{ input: { "aria-label": `选择扫描来源 ${source.displayName}` } }}
                    onChange={(event) => handleToggleSourceSelection(source.id, event.target.checked)}
                  />
                  <Box className="scan-source-main">
                    <Typography component="strong" title={source.displayName}>
                      {source.displayName}
                    </Typography>
                    <Typography color="text.secondary" variant="body2" title={source.rootDisplayPath}>
                      {source.rootDisplayPath}
                    </Typography>
                    <Box className="scan-source-chip-row">
                      <Chip className={`status-chip ${source.enabled ? "status-ok" : "status-disabled"}`} label={source.enabled ? "已启用" : "已停用"} size="small" />
                      <Chip label={scanBatchStatusLabel(status)} size="small" variant="outlined" />
                      <Chip label={sourceKindLabel(source.sourceKind)} size="small" variant="outlined" />
                      {source.projectLabel && <Chip label={source.projectLabel} size="small" variant="outlined" />}
                    </Box>
                  </Box>
                  <TextField disabled={sourceBusy || source.sourceKind !== "custom-directory"} label="模板" select size="small" value={source.profileId} onChange={(event) => void handleUpdateSourceProfile(source, event.target.value)}>
                    {sourceProfileOptions.map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.displayName}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    disabled={sourceBusy}
                    label="项目 / scope"
                    size="small"
                    value={sourceProjectDrafts[source.id] ?? source.projectLabel ?? ""}
                    onBlur={() => void handleProjectBlur(source)}
                    onChange={(event) => handleProjectDraftChange(source.id, event.target.value)}
                  />
                  <Box className="scan-source-metrics">
                    <ProgressMetric label="资源" value={batchSource?.resourcesFound ?? source.resourceCount} />
                    <ProgressMetric label="跳过" value={batchSource?.skippedEntries ?? source.skippedEntries} />
                    <ProgressMetric label="错误" value={batchSource?.errorCount ?? source.errorCount} />
                  </Box>
                  <Box className="scan-source-actions">
                    <Button disabled={sourceBusyId === source.id || scanLocked} size="small" variant="outlined" onClick={() => void handleUpdateSourceEnabled(source, !source.enabled)}>
                      {source.enabled ? "停用" : "启用"}
                    </Button>
                    <IconButton aria-label={`移除扫描来源 ${source.displayName}`} disabled={sourceBusyId === source.id || scanLocked} size="small" onClick={() => void handleRemoveSource(source)}>
                      <DeleteRounded fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box className="scan-empty-state">
              <Typography component="strong">尚无扫描来源</Typography>
              <Typography color="text.secondary" variant="body2">
                添加目录后会保存为本地 SQLite scan_source。添加不会触发扫描。
              </Typography>
            </Box>
          )}
        </Box>
      </AiosSection>

      {batchSnapshot && (
        <AiosSection className="scan-progress-section">
          <AiosSectionHeader
            title="批次进度"
            summary={`状态：${scanBatchStatusLabel(batchSnapshot.status)}。当前来源：${batchSnapshot.activeSourceId ?? "无"}`}
            action={<Chip className={`status-chip ${batchSnapshot.status === "completed" ? "status-ok" : batchSnapshot.status === "failed" || batchSnapshot.status === "cancelled" ? "status-warn" : "status-disabled"}`} label={scanBatchStatusLabel(batchSnapshot.status)} variant="outlined" />}
          />
          <Box className="scan-progress-card">
            <Box className="scan-progress-heading">
              <Typography component="strong">
                {batchSnapshot.completedSources} / {batchSnapshot.totalSources} 来源已结束
              </Typography>
              <Typography color="text.secondary" variant="body2">
                活动来源已访问 {batchSnapshot.progress.activeVisitedEntries} 项，匹配 {batchSnapshot.progress.activeMatchedResources} 项，跳过 {batchSnapshot.progress.activeSkippedEntries} 项。
              </Typography>
            </Box>
            <LinearProgress className="scan-progress-bar" value={batchProgressPercent} variant="determinate" />
            <Box className="scan-progress-grid">
              <ProgressMetric label="总来源" value={batchSnapshot.totalSources} />
              <ProgressMetric label="已结束" value={batchSnapshot.completedSources} />
              <ProgressMetric label="已取消" value={batchSnapshot.cancelledSources} />
              <ProgressMetric label="失败" value={batchSnapshot.failedSources} />
              <ProgressMetric label="耗时" value={`${Math.max(0, Math.round(batchSnapshot.progress.elapsedMs / 1000))}s`} />
            </Box>
          </Box>
        </AiosSection>
      )}

      {(hasDiscoverySources || activeScanMode.id !== "custom-directory") && (
        <AiosSection className="scan-discovery-summary-section">
          <AiosSectionHeader title="发现结果统计" summary="来自同一个 SQLite 动态资源语料；仅展示聚合计数和安全分类。" count={discoveryStats.totalResources} />
          <Box className="scan-summary-grid">
            <AiosUsageCard title="总资源" purpose="已持久化的 metadata-only 资源数量。" technicalName={`${discoveryStats.totalResources}`} />
            <AiosUsageCard title="扫描来源" purpose="本次或最近发现批次结束的来源数量。" technicalName={`${discoveryStats.scannedSources}`} />
            <AiosUsageCard title="跳过条目" purpose="排除、权限、上限、取消、大小或符号链接等聚合计数。" technicalName={`${discoveryStats.skippedEntries}`} />
            <AiosUsageCard title="权限拒绝" purpose="无法读取元数据或遍历失败的安全聚合计数。" technicalName={`${discoveryStats.permissionDeniedCount}`} />
            <AiosUsageCard title="排除目录" purpose="命中强 exclude 的目录或条目计数。" technicalName={`${discoveryStats.excludedCount}`} />
            <AiosUsageCard title="错误" purpose="保存到本地库的安全错误摘要数量。" technicalName={`${discoveryStats.errors}`} />
            <AiosUsageCard title="耗时" purpose="最近发现批次的聚合耗时。" technicalName={`${discoveryStats.elapsedSeconds}s`} />
            <AiosUsageCard title="本地库" purpose="当前 SQLite 动态资源库资源数量。" technicalName={`${discoveryStats.storedLibraryCount}`} />
          </Box>
          <Box className="scan-category-summary-grid compact" aria-label="发现资源分类计数">
            {discoveryStats.resourcesByKind.length > 0 ? (
              discoveryStats.resourcesByKind.map((item) => (
                <Box className="scan-category-summary-item" key={item.resourceKind}>
                  <Typography component="strong">{item.label}</Typography>
                  <Typography className="scan-category-count" component="span">
                    {item.count}
                  </Typography>
                </Box>
              ))
            ) : (
              <Box className="scan-category-summary-item">
                <Typography component="strong">暂无发现结果</Typography>
                <Typography color="text.secondary" variant="body2">
                  选择发现模式并手动开始后，统计会从本地 SQLite 资源库读取。
                </Typography>
              </Box>
            )}
          </Box>
        </AiosSection>
      )}

      <AiosSection className="scan-library-section">
        <AiosSectionHeader
          title="本地资源库"
          summary={tauriAvailable ? "Rust 后端拥有的 SQLite 元数据资源库；不保存文件内容、secret、env value、auth/session 或 cookie。" : "Web/Vite 预览模式不连接本地 SQLite，仅显示空的降级状态。"}
          action={<Chip className={`status-chip ${resourceStoreStatus.databaseReady ? "status-ok" : "status-disabled"}`} label={resourceStoreStatus.databaseReady ? "SQLite 已就绪" : "未连接本地库"} variant="outlined" />}
        />
        <Box className="scan-library-grid">
          <Box className="scan-control-card library">
            <Box className="scan-control-heading">
              <StorageRounded fontSize="small" />
              <Box className="scan-control-copy">
                <Typography component="strong">持久化摘要</Typography>
                <Typography color="text.secondary" variant="body2">
                  最近任务：{persistedLibraryState.latestJobLabel}
                </Typography>
              </Box>
            </Box>
            <Box className="scan-progress-grid">
              <ProgressMetric label="保存来源" value={librarySummary.sourceCount} />
              <ProgressMetric label="已启用" value={librarySummary.enabledSourceCount} />
              <ProgressMetric label="扫描任务" value={librarySummary.jobCount} />
              <ProgressMetric label="资源" value={librarySummary.resourceCount} />
              <ProgressMetric label="跳过" value={librarySummary.skippedEntryTotal} />
              <ProgressMetric label="错误" value={librarySummary.errorTotal} />
            </Box>
            <Box className="scan-library-list" aria-label="已保存扫描来源">
              <Typography component="strong">最近成功扫描</Typography>
              <Box className="scan-library-row">
                <Typography component="span">{persistedLibraryState.latestSuccessfulScanLabel}</Typography>
                <Typography color="text.secondary" variant="body2">
                  最近任务：{persistedLibraryState.latestJobLabel}
                </Typography>
              </Box>
              <Typography component="strong">扫描来源</Typography>
              {persistedLibraryState.sourceRows.length > 0 ? (
                persistedLibraryState.sourceRows.slice(0, 4).map((source) => (
                  <Box className="scan-library-row" key={source.id}>
                    <Typography component="span" title={source.primary}>
                      {source.primary}
                    </Typography>
                    <Typography color="text.secondary" variant="body2" title={source.secondary}>
                      {source.secondary}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2">
                  尚无持久化扫描来源。完成一次指定目录扫描后会出现在这里。
                </Typography>
              )}
            </Box>
          </Box>

          <Box className="scan-control-card library">
            <Box className="scan-control-heading">
              <SecurityRounded fontSize="small" />
              <Box className="scan-control-copy">
                <Typography component="strong">隐私与数据控制</Typography>
                <Typography color="text.secondary" variant="body2">
                  本地库只属于 AIOS Desktop；重置只删除应用记录，不删除用户文件。
                </Typography>
              </Box>
            </Box>
            <AiosTechnicalDetails
              rows={[
                { label: "数据边界", value: privacySummary.localBoundaryLabel },
                { label: "数据库", value: privacySummary.databaseStatus },
                { label: "扫描来源", value: privacySummary.sourceCountLabel },
                { label: "持久资源", value: privacySummary.persistedResourceCountLabel },
                { label: "最近扫描", value: privacySummary.lastScanLabel },
                { label: "扫描时间", value: privacySummary.lastScanTimeLabel },
                { label: "元数据策略", value: privacySummary.metadataPolicyLabel },
                { label: "内容存储", value: privacySummary.contentPolicyLabel },
                { label: "执行边界", value: privacySummary.executionPolicyLabel }
              ]}
            />
            <Box className="scan-privacy-copy-grid">
              <Box className="scan-first-use-item ok">
                <Typography component="strong">AIOS 保存</Typography>
                <Typography color="text.secondary" variant="body2">
                  {WHAT_AIOS_STORES_COPY}
                </Typography>
              </Box>
              <Box className="scan-first-use-item warn">
                <Typography component="strong">AIOS 不保存</Typography>
                <Typography color="text.secondary" variant="body2">
                  {WHAT_AIOS_NEVER_STORES_COPY}
                </Typography>
              </Box>
            </Box>
            <Box className="scan-boundary-callout warn">
              <WarningAmberRounded fontSize="small" />
              <Typography color="text.secondary" variant="body2">
                {privacySummary.resetWarning}
              </Typography>
            </Box>
            <Box className="scan-category-summary-grid compact" aria-label="持久化资源分类计数">
              {persistedLibraryState.categoryRows.length > 0 ? (
                persistedLibraryState.categoryRows.slice(0, 6).map((item) => (
                  <Box className="scan-category-summary-item" key={item.resourceKind}>
                    <Typography component="strong">{item.label}</Typography>
                    <Typography className="scan-category-count" component="span">
                      {item.count}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Box className="scan-category-summary-item">
                  <Typography component="strong">无持久资源</Typography>
                  <Typography color="text.secondary" variant="body2">
                    本地资源库为空。
                  </Typography>
                </Box>
              )}
            </Box>
            <Box className="scan-action-row">
              <Button
                color="warning"
                disabled={!tauriAvailable || scanLocked || libraryBusyState !== "idle" || !persistedLibraryState.canClear}
                startIcon={<DeleteSweepRounded />}
                variant="outlined"
                onClick={handleClearResourceLibrary}
              >
                删除 AIOS 本地数据
              </Button>
              <Chip label={libraryBusyState === "idle" ? "本地记录可重建" : libraryBusyState === "clearing" ? "正在清空" : "正在读取"} size="small" variant="outlined" />
            </Box>
          </Box>
        </Box>
      </AiosSection>

      <Box className="scan-boundary-callout info">
        <SecurityRounded fontSize="small" />
        <Typography color="text.secondary" variant="body2">
          发现模式仅在扫描管理中可启动；Dashboard、Skills、MCP、Scripts、Reports、Project Packs、Policies、Validators、Legacy 和 Inspector 只读取已持久化的动态资源语料。
        </Typography>
      </Box>

      {!tauriAvailable && (
        <Box className="scan-boundary-callout warn">
          <WarningAmberRounded fontSize="small" />
          <Typography color="text.secondary" variant="body2">
            {WEB_DISCOVERY_UNAVAILABLE_COPY}
          </Typography>
        </Box>
      )}

      {libraryError && (
        <Box className="scan-boundary-callout warn">
          <WarningAmberRounded fontSize="small" />
          <Typography color="text.secondary" variant="body2">
            {libraryError}
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

      {batchBusyState === "adding" && (
        <Box className="scan-boundary-callout info">
          <Typography color="text.secondary" variant="body2">
            正在等待目录选择器返回结果；添加来源不会自动扫描。
          </Typography>
        </Box>
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

      {scanResult && (
        <AiosSection className="scan-skipped-summary-section">
          <AiosSectionHeader title="跳过摘要" summary="仅展示聚合计数；不会暴露绝对路径或敏感值。" count={skippedSummaryItems(scanResult, null).reduce((total, item) => total + item.value, 0)} />
          <Box className="scan-skipped-summary-grid">
            {skippedSummaryItems(scanResult, null).map((item) => (
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
          <Typography component="strong">{scanManagementEmptyTitle(batchSnapshot)}</Typography>
          <Typography color="text.secondary" variant="body2">
            {scanManagementEmptySummary(batchSnapshot)}
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

function scanManagementEmptyTitle(snapshot: ScanBatchSnapshot | null): string {
  if (snapshot?.status === "running" || snapshot?.status === "queued" || snapshot?.status === "cancelling") return "批次扫描运行中";
  if (snapshot?.status === "completed") return "批次扫描已完成";
  if (snapshot?.status === "cancelled") return "批次扫描已取消";
  if (snapshot?.status === "failed") return "批次扫描有失败来源";
  return "等待配置扫描来源";
}

function scanManagementEmptySummary(snapshot: ScanBatchSnapshot | null): string {
  if (snapshot?.status === "running" || snapshot?.status === "queued" || snapshot?.status === "cancelling") return "结果会写入本地 SQLite 资源库；此视图展示来源状态和持久资源计数。";
  if (snapshot?.status === "completed") return "可在本地资源库摘要和来源行查看持久资源计数。";
  if (snapshot?.status === "cancelled") return "当前来源已安全停止，队列中未开始的来源会标记为取消。";
  if (snapshot?.status === "failed") return "失败来源只保留安全错误摘要；可调整来源后重新手动扫描。";
  return "添加一个或多个目录后，选择要扫描的已启用来源，再手动启动顺序扫描。全盘扫描仍未启用。";
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
    { label: "高级发现", value: profile.fullDiskScanEnabled ? "需显式确认" : "普通模式禁用" },
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

function sourceKindLabel(sourceKind: string): string {
  if (sourceKind === "intelligent-discovery") return "智能发现";
  if (sourceKind === "advanced-full-disk") return "高级发现";
  return "自选目录";
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
  "project-pack": "项目资源包元数据，完成扫描后写入本地资源库。",
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
    summary: "普通自选目录会拒绝根目录、home 根和系统目录；高级发现必须走独立确认。",
    tone: "warn"
  }
];
