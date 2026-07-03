import { invoke } from "@tauri-apps/api/core";
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

export interface ScannerPolicy {
  policyId: string;
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
  skippedBySize: number;
  skippedSymlinks: number;
  deniedErrors: number;
  truncated: boolean;
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
  rootDisplayName: string;
  rootSummary: string;
  scannedAtMs: number;
  counts: ScanCounts;
  resources: ScanResource[];
  warnings: ScanWarning[];
}

export const fallbackScanPolicy: ScannerPolicy = {
  policyId: "custom-directory-metadata-scan-mvp",
  metadataOnly: true,
  contentReadingEnabled: false,
  executionEnabled: false,
  fullDiskScanEnabled: false,
  followSymlinks: false,
  respectsIgnoreFiles: true,
  maxDepth: 6,
  maxEntries: 2_000,
  maxFileSizeBytes: 10 * 1024 * 1024,
  blockedRootExamples: ["/", "~", "/Users", "/Volumes", "/System", "/Library", "/Applications", "/private", "/tmp", "C:\\", "C:\\Users", "C:\\Windows"],
  excludedNames: [".git", "node_modules", "target", "dist", "build", ".next", ".nuxt", ".turbo", ".cache", ".venv", "venv", "__pycache__"],
  resourceKinds: ["skill", "prompt", "mcp-config", "script", "report-doc", "project-pack", "policy-governance", "validator", "package-manifest", "unknown-local-resource"]
};

export function isTauriRuntimeAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}

export async function getScanPolicy(): Promise<ScannerPolicy> {
  if (!isTauriRuntimeAvailable()) return fallbackScanPolicy;
  return invoke<ScannerPolicy>("get_scan_policy");
}

export async function pickScanDirectory(): Promise<SelectedScanDirectory | null> {
  assertTauriRuntime();
  return invoke<SelectedScanDirectory | null>("pick_scan_directory");
}

export async function scanCustomDirectory(selectionId: string): Promise<CustomScanResult> {
  assertTauriRuntime();
  return invoke<CustomScanResult>("scan_custom_directory", { selectionId });
}

export function mapScanResourcesToAiosResources(result: CustomScanResult): AiosResource[] {
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
      zhCategory: `指定目录扫描 / ${mapping.zhLabel}`,
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
