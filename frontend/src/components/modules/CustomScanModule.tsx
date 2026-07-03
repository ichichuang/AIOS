import { Box, Button, Chip, Typography } from "@mui/material";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import PlayArrowRounded from "@mui/icons-material/PlayArrowRounded";
import SecurityRounded from "@mui/icons-material/SecurityRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { useCallback, useEffect, useMemo, useState } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { filterResourceList } from "../../lib/filtering";
import {
  fallbackScanPolicy,
  getScanPolicy,
  isTauriRuntimeAvailable,
  mapScanResourcesToAiosResources,
  pickScanDirectory,
  scanCustomDirectory,
  type CustomScanResult,
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
  const [selectedDirectory, setSelectedDirectory] = useState<SelectedScanDirectory | null>(null);
  const [scanResult, setScanResult] = useState<CustomScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<"idle" | "picking" | "scanning">("idle");
  const tauriAvailable = isTauriRuntimeAvailable();

  useEffect(() => {
    getScanPolicy()
      .then(setPolicy)
      .catch((policyError: unknown) => setError(formatCommandError(policyError)));
  }, []);

  const resources = useMemo(() => (scanResult ? mapScanResourcesToAiosResources(scanResult) : []), [scanResult]);
  const visibleResources = useMemo(() => filterResourceList(resources, query), [query, resources]);
  const groups = useMemo(() => buildScanGroups(visibleResources), [visibleResources]);
  const skippedCount = scanResult
    ? scanResult.counts.skippedByExclude + scanResult.counts.skippedBySize + scanResult.counts.skippedSymlinks + scanResult.counts.deniedErrors
    : 0;

  const handlePickDirectory = useCallback(async () => {
    setBusyState("picking");
    setError(null);
    try {
      const selected = await pickScanDirectory();
      setSelectedDirectory(selected);
      setScanResult(null);
    } catch (pickError) {
      setError(formatCommandError(pickError));
    } finally {
      setBusyState("idle");
    }
  }, []);

  const handleRunScan = useCallback(async () => {
    if (!selectedDirectory) return;
    setBusyState("scanning");
    setError(null);
    try {
      const result = await scanCustomDirectory(selectedDirectory.selectionId);
      setScanResult(result);
    } catch (scanError) {
      setError(formatCommandError(scanError));
    } finally {
      setBusyState("idle");
    }
  }, [selectedDirectory]);

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
      <AiosSection className="scan-control-section">
        <AiosSectionHeader title="扫描控制" summary="只允许系统目录选择器授权的单个目录；结果仅保存在当前界面内存中。" />
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
                  { label: "策略判定", value: "允许指定目录扫描" }
                ]}
              />
            )}
            <Box className="scan-action-row">
              <Button disabled={!tauriAvailable || busyState !== "idle"} startIcon={<FolderOpenRounded />} variant="outlined" onClick={handlePickDirectory}>
                选择目录
              </Button>
              <Button disabled={!tauriAvailable || !selectedDirectory || busyState !== "idle"} startIcon={<PlayArrowRounded />} variant="contained" onClick={handleRunScan}>
                运行扫描
              </Button>
            </Box>
          </Box>

          <Box className="scan-control-card boundary">
            <Box className="scan-control-heading">
              <SecurityRounded fontSize="small" />
              <Box className="scan-control-copy">
                <Typography component="strong">策略摘要</Typography>
                <Typography color="text.secondary" variant="body2">
                  深度 {policy.maxDepth} · 上限 {policy.maxEntries} 项 · 单文件元数据阈值 {formatBytes(policy.maxFileSizeBytes)}
                </Typography>
              </Box>
            </Box>
            <AiosTechnicalDetails rows={policyRows(policy)} />
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
            {busyState === "picking" ? "正在等待目录选择器返回结果。" : "正在执行有界元数据扫描。"}
          </Typography>
        </Box>
      )}

      {scanResult && (
        <AiosSection className="scan-result-section">
          <AiosSectionHeader title="扫描结果" summary={`${scanResult.rootSummary} · ${formatDate(scanResult.scannedAtMs)}`} />
          <Box className="scan-summary-grid">
            <AiosUsageCard title="已访问" purpose="遍历到的目录与文件条目数量。" technicalName={`${scanResult.counts.visitedEntries}`} />
            <AiosUsageCard title="已归类" purpose="返回到当前界面的元数据资源数量。" technicalName={`${scanResult.counts.returnedResources}`} />
            <AiosUsageCard title="已跳过" purpose="排除、过大、符号链接或权限失败条目。" technicalName={`${skippedCount}`} />
            <AiosUsageCard title="提示" purpose="扫描策略提示和可解释跳过原因。" technicalName={`${scanResult.warnings.length}`} />
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
          <Typography component="strong">等待指定目录扫描</Typography>
          <Typography color="text.secondary" variant="body2">
            选择一个通过策略守卫的目录后运行扫描。全盘扫描已禁用，非 MVP，未来需要单独批准。
          </Typography>
        </Box>
      )}
    </AiosModuleFrame>
  );
}

function policyRows(policy: ScannerPolicy): AiosTechnicalDetailRow[] {
  return [
    { label: "内容读取", value: policy.contentReadingEnabled ? "启用" : "禁用" },
    { label: "执行能力", value: policy.executionEnabled ? "启用" : "禁用" },
    { label: "全盘扫描", value: policy.fullDiskScanEnabled ? "启用" : "禁用" },
    { label: "忽略规则", value: policy.respectsIgnoreFiles ? "尊重 .ignore/.gitignore" : "未启用" }
  ];
}

function buildScanGroups(resources: ReturnType<typeof mapScanResourcesToAiosResources>): ResourceGroupData[] {
  const groups = scanKindOrder.map((kind) => {
    const resourcesForKind = resources.filter((resource) => resource.metadata?.scanResourceKind === kind);
    return {
      title: scanKindLabels[kind],
      summary: scanKindSummaries[kind],
      resources: resourcesForKind
    };
  });

  return groups.filter((group) => group.resources.length > 0);
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
