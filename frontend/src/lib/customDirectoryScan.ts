import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AiosResource, CapabilityType, ResourceStatus, RiskLevel, ToolType } from "../types/inventory";

export type ScanResourceKind =
  | "skill"
  | "prompt"
  | "mcp-config"
  | "script"
  | "report-doc"
  | "project-pack"
  | "policy-governance"
  | "validator"
  | "package-manifest"
  | "unknown-local-resource";

export type ScanProfileId = "custom-folder" | "project-root" | "ai-toolchain" | "skills-prompts-workspace" | "docs-reports-workspace" | "aios-workspace" | "intelligent-discovery" | "advanced-full-disk";
export type ScanModeId = "custom-directory" | "intelligent-discovery" | "advanced-full-disk";

export interface ScanProfileDefinition {
  id: ScanProfileId;
  displayName: string;
  shortDescription: string;
  recommendedUseCase: string;
  safetyBoundary: string;
  exampleFolderTypes: string[];
  maxDepth: number;
  maxEntries: number;
  maxDepthEntryPolicy: string;
  excludePolicySummary: string;
  classificationEmphasis: string[];
  emphasizedResourceKinds: ScanResourceKind[];
  resultGroupLabel: string;
  metadataOnly: boolean;
  contentReadingEnabled: boolean;
  executionEnabled: boolean;
  fullDiskScanEnabled: boolean;
}

export const DEFAULT_SCAN_PROFILE_ID: ScanProfileId = "custom-folder";
export const DEFAULT_SCAN_MODE_ID: ScanModeId = "custom-directory";
export const SCAN_JOB_PROGRESS_EVENT = "aios://scan-job-progress";

export interface ScanModeDefinition {
  id: ScanModeId;
  title: string;
  sourceKind: ScanModeId;
  profileId: ScanProfileId;
  summary: string;
  warning: string;
  requiresConfirmation: boolean;
}

export interface ScanModeStartState {
  hasSelectedSources: boolean;
  advancedConfirmed: boolean;
  tauriAvailable: boolean;
  scanLocked: boolean;
}

export interface ScanModeUiState {
  modeId: ScanModeId;
  advancedConfirmed: boolean;
}

export const scanModeDefinitions: ScanModeDefinition[] = [
  {
    id: "custom-directory",
    title: "Custom Directories",
    sourceKind: "custom-directory",
    profileId: DEFAULT_SCAN_PROFILE_ID,
    summary: "Use the existing system folder picker for one or more explicit project folders.",
    warning: "Strict root guards stay enabled for normal custom directory scans.",
    requiresConfirmation: false
  },
  {
    id: "intelligent-discovery",
    title: "Intelligent Whole-Computer Discovery",
    sourceKind: "intelligent-discovery",
    profileId: "intelligent-discovery",
    summary: "Guided discovery for common user workspaces such as Desktop, Documents, Downloads, Developer, Work, Projects, and AIOS workspace candidates.",
    warning: "Runs only after Start. It does not scan system roots by default.",
    requiresConfirmation: false
  },
  {
    id: "advanced-full-disk",
    title: "Advanced Full-Disk Discovery",
    sourceKind: "advanced-full-disk",
    profileId: "advanced-full-disk",
    summary: "Advanced broad discovery path for users who explicitly accept slower, permission-sensitive scanning.",
    warning: "Requires explicit confirmation and stores metadata-only results locally.",
    requiresConfirmation: true
  }
];

export interface ScannerPolicy {
  policyId: string;
  defaultProfileId: ScanProfileId;
  metadataOnly: boolean;
  contentReadingEnabled: boolean;
  executionEnabled: boolean;
  fullDiskScanEnabled: boolean;
  followSymlinks: boolean;
  respectsIgnoreFiles: boolean;
  maxDepth: number;
  maxEntries: number;
  maxFileSizeBytes: number;
  blockedRootExamples: string[];
  excludedNames: string[];
  resourceKinds: ScanResourceKind[];
  profileIds: ScanProfileId[];
}

export interface SelectedScanDirectory {
  selectionId: string;
  displayName: string;
  rootSummary: string;
  policyDecision: string;
}

export interface ScanCounts {
  visitedEntries: number;
  returnedResources: number;
  skippedByExclude: number;
  skippedByGuard?: number;
  skippedByMetadataError?: number;
  skippedByLimit?: number;
  skippedByCancellation?: number;
  skippedBySize: number;
  skippedSymlinks: number;
  deniedErrors: number;
  truncated: boolean;
}

export type ScanJobStatus = "queued" | "running" | "cancelling" | "completed" | "cancelled" | "failed";
export type ScanLifecycleState = "idle" | "directory-selected" | "running" | "cancelling" | "completed" | "cancelled" | "failed";

export interface ScanCommandErrorPayload {
  code: string;
  message: string;
}

export interface ScanProgress {
  visitedEntries: number;
  matchedResources: number;
  skippedEntries: number;
  elapsedMs: number;
  currentPhase: string;
  profileId: ScanProfileId | string;
  maxEntries: number;
  maxDepth: number;
  truncated: boolean;
  cancellationRequested: boolean;
}

export interface ScanJobSnapshot {
  jobId: string;
  status: ScanJobStatus;
  profileId: ScanProfileId | string;
  rootDisplayName: string;
  rootSummary: string;
  startedAtMs: number;
  updatedAtMs: number;
  completedAtMs: number | null;
  progress: ScanProgress;
  result: CustomScanResult | null;
  error: ScanCommandErrorPayload | null;
}

export interface ScanStarted {
  jobId: string;
  snapshot: ScanJobSnapshot;
}

export interface ScanJobEventPayload {
  jobId: string;
  status: ScanJobStatus;
  progress: ScanProgress;
  error: ScanCommandErrorPayload | null;
}

export interface ScanWarning {
  code: string;
  message: string;
  relativePath: string | null;
}

export interface ScanResource {
  id: string;
  relativePath: string;
  entryType: "file" | "directory" | "other";
  extension: string | null;
  sizeBytes: number | null;
  modifiedAtMs: number | null;
  resourceKind: ScanResourceKind;
  riskLabels: string[];
  boundaryLabels: string[];
  classificationReason: string;
  sensitive: boolean;
}

export interface CustomScanResult {
  policyId: string;
  profile?: ScanProfileDefinition | null;
  profileId?: ScanProfileId | string;
  rootDisplayName: string;
  rootSummary: string;
  scannedAtMs: number;
  counts: ScanCounts;
  resources: ScanResource[];
  warnings: ScanWarning[];
}

export const fallbackScanPolicy: ScannerPolicy = {
  policyId: "custom-directory-metadata-scan-mvp",
  defaultProfileId: DEFAULT_SCAN_PROFILE_ID,
  metadataOnly: true,
  contentReadingEnabled: false,
  executionEnabled: false,
  fullDiskScanEnabled: true,
  followSymlinks: false,
  respectsIgnoreFiles: true,
  maxDepth: 6,
  maxEntries: 2_000,
  maxFileSizeBytes: 10 * 1024 * 1024,
  blockedRootExamples: ["/", "~", "/Users", "/Volumes", "/System", "/Library", "/Applications", "/private", "/tmp", "C:\\", "C:\\Users", "C:\\Windows"],
  excludedNames: [".git", "node_modules", "target", "dist", "build", ".next", ".nuxt", ".turbo", ".cache", ".venv", "venv", "__pycache__"],
  resourceKinds: ["skill", "prompt", "mcp-config", "script", "report-doc", "project-pack", "policy-governance", "validator", "package-manifest", "unknown-local-resource"],
  profileIds: ["custom-folder", "project-root", "ai-toolchain", "skills-prompts-workspace", "docs-reports-workspace", "aios-workspace", "intelligent-discovery", "advanced-full-disk"]
};

export const fallbackScanProfiles: ScanProfileDefinition[] = [
  {
    id: DEFAULT_SCAN_PROFILE_ID,
    displayName: "通用自选目录",
    shortDescription: "适合先用一个普通文件夹试扫，观察 AIOS 如何只按元数据归类。",
    recommendedUseCase: "不确定目录类型时使用；先选择一个小而明确的工作文件夹。",
    safetyBoundary: "仅扫描用户通过系统目录选择器授权的单个目录，不读取内容、不执行脚本、不跟随符号链接。",
    exampleFolderTypes: ["临时工作目录", "导出的本地资源包", "单个待审文件夹"],
    maxDepth: 6,
    maxEntries: 2_000,
    maxDepthEntryPolicy: "最多 6 层、2,000 个条目；达到上限后停止并给出提示。",
    excludePolicySummary: "继承 Phase 2A 强 exclude：依赖目录、缓存、构建产物、日志、临时目录和工具缓存默认跳过。",
    classificationEmphasis: ["通用资源识别", "敏感路径隐藏", "未知资源保守归类"],
    emphasizedResourceKinds: ["skill", "prompt", "mcp-config", "script", "report-doc", "project-pack", "policy-governance", "validator", "package-manifest", "unknown-local-resource"],
    resultGroupLabel: "通用分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "project-root",
    displayName: "项目根目录",
    shortDescription: "适合选择一个代码仓库或产品项目根目录，查看项目内 AI 相关入口。",
    recommendedUseCase: "选择包含 package.json、Cargo.toml、docs、scripts 或 repo-local skills 的项目文件夹。",
    safetyBoundary: "模板只改变归类重点；仍必须手动选择目录，且不会运行 build/test/lint 或 package scripts。",
    exampleFolderTypes: ["代码仓库根目录", "含 manifest 的应用项目", "项目内 .agents/skills 子目录"],
    maxDepth: 6,
    maxEntries: 2_000,
    maxDepthEntryPolicy: "最多 6 层、2,000 个条目；适合中小型项目根目录的元数据视图。",
    excludePolicySummary: "尊重 ignore 文件，并跳过依赖、构建、覆盖率、缓存和临时目录。",
    classificationEmphasis: ["项目 manifest", "repo-local skills/prompts", "脚本与验证器", "docs/reports"],
    emphasizedResourceKinds: ["package-manifest", "skill", "prompt", "script", "validator", "report-doc", "policy-governance", "project-pack"],
    resultGroupLabel: "项目资源分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "ai-toolchain",
    displayName: "AI 工具链目录",
    shortDescription: "适合审视用户明确选择的 AI 工具链配置副本或局部工具目录。",
    recommendedUseCase: "选择一个小范围工具链工作目录、插件元数据目录或 prompts/skills 子目录。",
    safetyBoundary: "不会自动扫描 ~/.codex、~/.claude、~/.ai 或 home；不会读取 auth/session/token/env 值或启动 MCP。",
    exampleFolderTypes: ["工具链配置工作副本", "插件元数据目录", "工具 prompts/skills 子目录"],
    maxDepth: 5,
    maxEntries: 1_500,
    maxDepthEntryPolicy: "最多 5 层、1,500 个条目；工具链模板默认更保守。",
    excludePolicySummary: "继承强 exclude，并将 credential/auth/session/cookie/key/token 样式路径段隐藏为 [sensitive]。",
    classificationEmphasis: ["MCP/config 元数据", "技能入口", "提示词入口", "策略边界"],
    emphasizedResourceKinds: ["mcp-config", "skill", "prompt", "policy-governance", "script", "validator"],
    resultGroupLabel: "工具链元数据分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "skills-prompts-workspace",
    displayName: "技能 / 提示词工作区",
    shortDescription: "适合选择 skills、prompts 或二者混合的工作目录。",
    recommendedUseCase: "选择一个明确的 skills/prompts 文件夹，检查 AIOS 如何区分技能、提示词和验证边界。",
    safetyBoundary: "仅按路径、扩展名、大小、修改时间和文件名归类；不会读取 SKILL.md 或 prompt 正文。",
    exampleFolderTypes: ["skills 目录", "prompts 目录", "项目内技能工作区"],
    maxDepth: 6,
    maxEntries: 1_500,
    maxDepthEntryPolicy: "最多 6 层、1,500 个条目；适合中等规模技能/提示词目录。",
    excludePolicySummary: "跳过依赖、缓存、构建产物和虚拟环境目录；敏感命名路径段仍会隐藏。",
    classificationEmphasis: ["技能", "提示词", "验证器", "策略说明"],
    emphasizedResourceKinds: ["skill", "prompt", "validator", "policy-governance", "unknown-local-resource"],
    resultGroupLabel: "技能提示词分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "docs-reports-workspace",
    displayName: "文档 / 报告工作区",
    shortDescription: "适合选择 docs、reports 或交付物目录，整理只读报告与治理材料元数据。",
    recommendedUseCase: "选择一个项目文档、报告归档或策略材料目录。",
    safetyBoundary: "不会读取文档正文；只展示路径、扩展名、大小、mtime 和保守分类原因。",
    exampleFolderTypes: ["docs 目录", "reports 目录", "策略与交付物归档"],
    maxDepth: 5,
    maxEntries: 1_500,
    maxDepthEntryPolicy: "最多 5 层、1,500 个条目；偏向文档归档的浅层元数据视图。",
    excludePolicySummary: "跳过缓存、构建产物、日志和临时目录；敏感命名路径段仍会隐藏。",
    classificationEmphasis: ["报告与文档", "策略治理", "项目资源包"],
    emphasizedResourceKinds: ["report-doc", "policy-governance", "project-pack", "package-manifest", "unknown-local-resource"],
    resultGroupLabel: "文档报告分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "aios-workspace",
    displayName: "AIOS 工作区",
    shortDescription: "适合选择一个 AIOS 相关工作区或本仓库内局部目录，查看桌面资源边界。",
    recommendedUseCase: "选择 AIOS 应用仓库、报告/脚本工作区或 repo-local skill module 目录。",
    safetyBoundary: "不会自动扫描 ~/.ai 或任何全局根；只扫描用户本次明确选择的文件夹。",
    exampleFolderTypes: ["AIOS 应用仓库", "AIOS 报告/脚本工作区", "repo-local skill modules"],
    maxDepth: 6,
    maxEntries: 2_000,
    maxDepthEntryPolicy: "最多 6 层、2,000 个条目；与 Phase 2A MVP 上限一致。",
    excludePolicySummary: "继承强 exclude；不会写回生成视图、全局技能入口或治理文件。",
    classificationEmphasis: ["AIOS skills/prompts", "报告与脚本", "策略治理", "验证器"],
    emphasizedResourceKinds: ["skill", "prompt", "script", "report-doc", "project-pack", "policy-governance", "validator", "package-manifest"],
    resultGroupLabel: "AIOS 工作区分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "intelligent-discovery",
    displayName: "智能全机发现",
    shortDescription: "面向非技术用户的引导式发现，只从常见用户工作区候选目录创建来源。",
    recommendedUseCase: "点击开始后解析 Desktop、Documents、Downloads、Developer、Work、Projects 和 AIOS 工作区候选目录。",
    safetyBoundary: "不会扫描系统根、home 根、/Users、/Volumes 或磁盘根；候选目录不存在或不可访问时安全跳过。",
    exampleFolderTypes: ["Desktop", "Documents", "Downloads", "Developer", "Work", "Projects", "AIOS 工作区"],
    maxDepth: 5,
    maxEntries: 1_500,
    maxDepthEntryPolicy: "每个候选来源最多 5 层、1,500 个条目；候选来源按批次顺序扫描，可取消。",
    excludePolicySummary: "继承强 exclude，并额外跳过 SSH/GPG/Kube、Keychains、Cookies 等敏感配置目录。",
    classificationEmphasis: ["项目工作区", "AI 资源入口", "文档报告", "脚本与验证器"],
    emphasizedResourceKinds: ["package-manifest", "skill", "prompt", "mcp-config", "script", "validator", "report-doc", "project-pack", "policy-governance"],
    resultGroupLabel: "智能发现分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: false
  },
  {
    id: "advanced-full-disk",
    displayName: "高级全盘发现",
    shortDescription: "高风险高级模式，只在用户勾选确认后创建 broad discovery 来源。",
    recommendedUseCase: "仅在普通目录和智能发现无法定位资源时使用；受保护目录和权限失败会被跳过。",
    safetyBoundary: "必须显式确认；仅保存元数据，不读取内容、不执行脚本/MCP、不跟随符号链接，并使用更强 exclude。",
    exampleFolderTypes: ["用户 home 根", "受限 broad discovery 来源"],
    maxDepth: 5,
    maxEntries: 3_000,
    maxDepthEntryPolicy: "高级模式每个来源最多 5 层、3,000 个条目；达到上限即停止并记录跳过摘要。",
    excludePolicySummary: "额外跳过 Library、System、Applications、Volumes、SSH/GPG/Kube、Keychains、Cookies 等目录。",
    classificationEmphasis: ["保守资源发现", "权限跳过统计", "敏感路径隐藏", "本地库可删除"],
    emphasizedResourceKinds: ["skill", "prompt", "mcp-config", "script", "validator", "report-doc", "project-pack", "policy-governance", "package-manifest", "unknown-local-resource"],
    resultGroupLabel: "高级发现分类",
    metadataOnly: true,
    contentReadingEnabled: false,
    executionEnabled: false,
    fullDiskScanEnabled: true
  }
];

export function isTauriRuntimeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function getScanPolicy(): Promise<ScannerPolicy> {
  if (!isTauriRuntimeAvailable()) return fallbackScanPolicy;
  return invoke<ScannerPolicy>("get_scan_policy");
}

export async function getScanProfiles(): Promise<ScanProfileDefinition[]> {
  if (!isTauriRuntimeAvailable()) return fallbackScanProfiles;
  return invoke<ScanProfileDefinition[]>("get_scan_profiles");
}

export async function pickScanDirectory(): Promise<SelectedScanDirectory | null> {
  assertTauriRuntime();
  return invoke<SelectedScanDirectory | null>("pick_scan_directory");
}

export async function scanCustomDirectory(selectionId: string, profileId: ScanProfileId = DEFAULT_SCAN_PROFILE_ID): Promise<CustomScanResult> {
  assertTauriRuntime();
  return invoke<CustomScanResult>("scan_custom_directory", { selectionId, profileId });
}

export async function startCustomScanJob(selectionId: string, profileId: ScanProfileId = DEFAULT_SCAN_PROFILE_ID): Promise<ScanStarted> {
  assertTauriRuntime();
  return invoke<ScanStarted>("start_custom_scan_job", { selectionId, profileId });
}

export async function cancelScanJob(jobId: string): Promise<ScanJobSnapshot> {
  assertTauriRuntime();
  return invoke<ScanJobSnapshot>("cancel_scan_job", { jobId });
}

export async function getScanJobSnapshot(jobId: string): Promise<ScanJobSnapshot> {
  assertTauriRuntime();
  return invoke<ScanJobSnapshot>("get_scan_job_snapshot", { jobId });
}

export async function listenToScanJobProgress(onEvent: (event: ScanJobEventPayload) => void): Promise<UnlistenFn> {
  assertTauriRuntime();
  return listen<ScanJobEventPayload>(SCAN_JOB_PROGRESS_EVENT, (event) => onEvent(event.payload));
}

export function getScanProfileById(profileId?: string | null, profiles: ScanProfileDefinition[] = fallbackScanProfiles): ScanProfileDefinition {
  const requested = profiles.find((profile) => profile.id === profileId);
  if (requested) return requested;
  return profiles.find((profile) => profile.id === DEFAULT_SCAN_PROFILE_ID) ?? fallbackScanProfiles[0];
}

export function getScanModeById(modeId?: string | null): ScanModeDefinition {
  return scanModeDefinitions.find((mode) => mode.id === modeId) ?? scanModeDefinitions[0];
}

export function canStartScanMode(modeId: ScanModeId, state: ScanModeStartState): boolean {
  if (!state.tauriAvailable || state.scanLocked) return false;
  if (modeId === "custom-directory") return state.hasSelectedSources;
  if (modeId === "advanced-full-disk") return state.advancedConfirmed;
  return true;
}

export function nextScanModeState(modeId: ScanModeId, current: Pick<ScanModeUiState, "advancedConfirmed">): ScanModeUiState {
  return {
    modeId,
    advancedConfirmed: modeId === "advanced-full-disk" ? false : current.advancedConfirmed
  };
}

export function getScanProfileForResult(result: CustomScanResult, profiles: ScanProfileDefinition[] = fallbackScanProfiles): ScanProfileDefinition {
  return result.profile ?? getScanProfileById(result.profileId, profiles);
}

export function mapScanResourcesToAiosResources(result: CustomScanResult, profiles: ScanProfileDefinition[] = fallbackScanProfiles): AiosResource[] {
  const scanProfile = getScanProfileForResult(result, profiles);

  return result.resources.map((scanResource) => {
    const mapping = kindMapping[scanResource.resourceKind] ?? kindMapping["unknown-local-resource"];
    const risk = riskForScanResource(scanResource);
    const status = statusForScanResource(scanResource);
    const displayName = displayNameForScanResource(scanResource);
    const updatedAt = formatIsoTime(scanResource.modifiedAtMs ?? result.scannedAtMs);

    return {
      id: scanResource.id,
      name: displayName,
      zhName: `${mapping.zhLabel} · ${displayName}`,
      zhDescription: `${scanResource.classificationReason} 扫描仅返回路径、大小、扩展名和修改时间等元数据。`,
      zhCategory: `${scanProfile.resultGroupLabel} / ${mapping.zhLabel}`,
      zhStatus: scanResource.sensitive ? "敏感路径已隐藏" : undefined,
      zhRisk: scanResource.sensitive ? "中风险" : undefined,
      toolType: mapping.toolType,
      capabilityType: mapping.capabilityType,
      status,
      risk,
      path: scanResource.relativePath,
      paths: [scanResource.relativePath],
      description: `${scanResource.resourceKind} metadata from custom directory scan`,
      safetyProfile: {
        readOnly: true,
        writesGlobalState: false,
        secretExposureRisk: scanResource.sensitive ? "medium" : "low",
        executionRisk: executionRiskForScanResource(scanResource),
        notes: [
          "metadata-only custom directory scan",
          "no file contents read",
          "no scripts or MCP executed",
          `scan profile: ${scanProfile.id}`,
          ...(scanResource.sensitive ? ["sensitive path segment redacted"] : [])
        ]
      },
      tokenPressure: {
        estimatedTokens: 0,
        level: "low",
        reason: "metadata-only custom directory scan"
      },
      prompts: [],
      metadata: {
        sourceKind: "custom-directory-scan",
        root: result.rootSummary,
        scanPolicyId: result.policyId,
        scanProfileId: scanProfile.id,
        scanProfileName: scanProfile.displayName,
        scanProfileSummary: scanProfile.shortDescription,
        scanProfileBoundary: scanProfile.safetyBoundary,
        scanProfileResultGroupLabel: scanProfile.resultGroupLabel,
        scanProfileClassificationEmphasis: scanProfile.classificationEmphasis,
        scanResourceKind: scanResource.resourceKind,
        entryType: scanResource.entryType,
        extension: scanResource.extension,
        sizeBytes: scanResource.sizeBytes,
        modifiedAtMs: scanResource.modifiedAtMs,
        riskLabels: scanResource.riskLabels,
        boundaryLabels: scanResource.boundaryLabels,
        classificationReason: scanResource.classificationReason,
        sensitive: scanResource.sensitive
      },
      updatedAt
    };
  });
}

export function createFallbackScanJobSnapshot(jobId: string, profileId: ScanProfileId = DEFAULT_SCAN_PROFILE_ID): ScanJobSnapshot {
  const now = Date.now();
  const profile = getScanProfileById(profileId);
  return {
    jobId,
    status: "queued",
    profileId,
    rootDisplayName: "已选择目录",
    rootSummary: "未记录",
    startedAtMs: now,
    updatedAtMs: now,
    completedAtMs: null,
    progress: {
      visitedEntries: 0,
      matchedResources: 0,
      skippedEntries: 0,
      elapsedMs: 0,
      currentPhase: "queued",
      profileId,
      maxEntries: profile.maxEntries,
      maxDepth: profile.maxDepth,
      truncated: false,
      cancellationRequested: false
    },
    result: null,
    error: null
  };
}

export function applyScanJobProgressEvent(snapshot: ScanJobSnapshot | null, event: ScanJobEventPayload): ScanJobSnapshot {
  const base = snapshot ?? createFallbackScanJobSnapshot(event.jobId, getScanProfileById(event.progress.profileId).id);
  return {
    ...base,
    jobId: event.jobId,
    status: event.status,
    profileId: event.progress.profileId,
    updatedAtMs: Date.now(),
    progress: event.progress,
    error: event.error,
    result: isTerminalScanJobStatus(event.status) && event.status !== "completed" ? null : base.result
  };
}

export function isTerminalScanJobStatus(status: ScanJobStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "failed";
}

export function scanLifecycleFromSnapshot(snapshot: ScanJobSnapshot | null, hasSelectedDirectory: boolean, hasError: boolean): ScanLifecycleState {
  if (hasError) return "failed";
  if (!snapshot) return hasSelectedDirectory ? "directory-selected" : "idle";
  if (snapshot.status === "queued") return "running";
  return snapshot.status;
}

export function countSkippedEntries(counts: ScanCounts): number {
  return (
    counts.skippedByExclude +
    (counts.skippedByGuard ?? 0) +
    (counts.skippedByMetadataError ?? counts.deniedErrors) +
    (counts.skippedByLimit ?? (counts.truncated ? 1 : 0)) +
    (counts.skippedByCancellation ?? 0) +
    counts.skippedBySize +
    counts.skippedSymlinks
  );
}

function assertTauriRuntime(): void {
  if (!isTauriRuntimeAvailable()) {
    throw new Error("当前页面不在 Tauri 桌面运行时中，无法选择或扫描本地目录。");
  }
}

const kindMapping: Record<ScanResourceKind, { zhLabel: string; capabilityType: CapabilityType; toolType: ToolType }> = {
  skill: { zhLabel: "技能", capabilityType: "skill", toolType: "project-local" },
  prompt: { zhLabel: "提示词", capabilityType: "usage-prompt", toolType: "project-local" },
  "mcp-config": { zhLabel: "MCP 配置元数据", capabilityType: "mcp-client", toolType: "mcp" },
  script: { zhLabel: "脚本", capabilityType: "script", toolType: "script" },
  "report-doc": { zhLabel: "报告 / 文档", capabilityType: "report", toolType: "report" },
  "project-pack": { zhLabel: "项目包", capabilityType: "project-pack", toolType: "project-local" },
  "policy-governance": { zhLabel: "策略治理", capabilityType: "policy", toolType: "aios-root" },
  validator: { zhLabel: "验证器", capabilityType: "validator", toolType: "validator" },
  "package-manifest": { zhLabel: "包清单", capabilityType: "project-pack", toolType: "project-local" },
  "unknown-local-resource": { zhLabel: "未知本地资源", capabilityType: "project-pack", toolType: "project-local" }
};

function riskForScanResource(resource: ScanResource): RiskLevel {
  if (resource.sensitive) return "medium";
  if (resource.resourceKind === "script" || resource.resourceKind === "validator" || resource.resourceKind === "mcp-config") return "medium";
  return "low";
}

function statusForScanResource(resource: ScanResource): ResourceStatus {
  return resource.sensitive ? "warn" : "available";
}

function executionRiskForScanResource(resource: ScanResource): RiskLevel {
  return resource.resourceKind === "script" || resource.resourceKind === "validator" ? "medium" : "low";
}

function displayNameForScanResource(resource: ScanResource): string {
  const segments = resource.relativePath.split("/").filter(Boolean);
  return segments.at(-1) ?? resource.relativePath;
}

function formatIsoTime(value: number | null): string | undefined {
  if (!value || !Number.isFinite(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
