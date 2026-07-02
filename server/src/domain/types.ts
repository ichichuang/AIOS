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

export type ResourceStatus =
  | "active"
  | "available"
  | "disabled"
  | "missing"
  | "ok"
  | "warn"
  | "unknown";

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

export interface AiosResource {
  id: string;
  name: string;
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
  metadata?: Record<string, unknown>;
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

export interface CodexAutomationDirectoryState {
  exists: boolean;
  isDirectory: boolean;
  entryCount: number;
  summary: string;
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
  codexAutomationDirectoryState: CodexAutomationDirectoryState;
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
