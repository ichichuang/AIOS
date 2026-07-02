export type ToolType =
  | "aios-root"
  | "codex"
  | "agents"
  | "claude"
  | "hermes"
  | "mcp"
  | "plugin"
  | "script"
  | "validator"
  | "project-local"
  | "report"
  | "automation"
  | "legacy";

export type CapabilityType =
  | "skill"
  | "mcp-server"
  | "mcp-client"
  | "plugin"
  | "script"
  | "validator"
  | "report"
  | "usage-prompt"
  | "project-pack"
  | "runtime-view"
  | "registry"
  | "policy"
  | "provider";

export type ResourceStatus = "active" | "available" | "disabled" | "missing" | "ok" | "warn" | "unknown";
export type RiskLevel = "low" | "medium" | "high";
export type PromptTarget = "codex" | "claude";

export interface SafetyProfile {
  readOnly: boolean;
  writesGlobalState: boolean;
  secretExposureRisk: RiskLevel;
  executionRisk: RiskLevel;
  notes: string[];
}

export interface TokenPressure {
  estimatedTokens: number;
  level: RiskLevel;
  reason: string;
}

export interface UsagePrompt {
  target: PromptTarget;
  title: string;
  prompt: string;
}

export interface SkillDiscoveryMetadata {
  sourceKind?: string;
  sourceKinds?: string[];
  discoveryRoot?: string;
  manifestPath?: string;
  indexed?: boolean;
  registryListed?: boolean;
  activeEntrypoint?: boolean;
  discoveredOnly?: boolean;
  archived?: boolean;
  distillationRelated?: boolean;
  scanReason?: string;
  category?: string;
  tags?: string[];
  aliases?: string[];
  capabilities?: string[];
  sourceTypes?: string[];
}

export interface AiosResource {
  id: string;
  name: string;
  zhName?: string;
  zhDescription?: string;
  zhCategory?: string;
  zhStatus?: string;
  zhRisk?: string;
  zhCapability?: string;
  zhToolType?: string;
  uiGroup?: string;
  moduleSummary?: string;
  toolType: ToolType;
  capabilityType: CapabilityType;
  status: ResourceStatus;
  risk: RiskLevel;
  path?: string;
  paths: string[];
  description: string;
  safetyProfile: SafetyProfile;
  tokenPressure: TokenPressure;
  prompts: UsagePrompt[];
  metadata?: Record<string, unknown> & Partial<SkillDiscoveryMetadata>;
  updatedAt?: string;
}

export interface McpServerRecord {
  name: string;
  command: string;
  args: string[];
  envVarNames: string[];
  transport: "stdio" | "http" | "sse" | "unknown";
  usesNpx: boolean;
  usesAtLatest: boolean;
  credentialRequired: boolean;
  localRemoteRisk: "local" | "possible-npx-fetch" | "remote" | "unknown";
  risk: RiskLevel;
  sourcePath: string;
}

export interface ValidatorSummary {
  name: string;
  status: ResourceStatus;
  summary: string;
  path?: string;
}

export interface BaselineSummary {
  aiosRoot: string;
  appSourcePath: string;
  generatedAt: string;
  policyHash: string | null;
  canonicalSkillCount: number;
  codexTopLevelCount: number;
  codexActiveUserSkillCount: number;
  agentsActiveUserSkillCount: number;
  claudeSkillCount: number | null;
  customSkillRouterCodex: boolean;
  customSkillRouterAgents: boolean;
  codexAutomationDirectoryState: {
    exists: boolean;
    isDirectory: boolean;
    entryCount: number;
    summary: string;
  };
  validators: ValidatorSummary[];
  knownWarnings: string[];
}

export interface AiosInventory {
  schemaVersion: 1;
  generatedAt: string;
  roots: {
    aiosRoot: string;
    appSourcePath: string;
  };
  baseline: BaselineSummary;
  resources: AiosResource[];
  mcpServers: McpServerRecord[];
  reports: AiosResource[];
}
