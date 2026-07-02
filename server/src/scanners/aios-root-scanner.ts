import { APP_REPO_ROOT, AIOS_ROOT, ACTIVE_GLOBAL_POLICY_PATH } from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { GLOBAL_BOUNDARY_NOTES, readOnlySafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosInventory, AiosResource } from "../domain/types.js";
import { scanBaseline } from "./baseline-scanner.js";
import { scanMcpServers } from "./mcp-scanner.js";
import { scanProjectPacks } from "./project-pack-scanner.js";
import { scanReports } from "./report-scanner.js";
import { scanScripts } from "./script-scanner.js";
import { scanSkills } from "./skill-scanner.js";

function withPrompts(resource: Omit<AiosResource, "prompts">): AiosResource {
  const full: AiosResource = { ...resource, prompts: [] };
  return { ...full, prompts: buildUsagePrompts(full) };
}

function baselineResources(): AiosResource[] {
  const safetyDescription = "Phase 1 safety boundary: /Users/cc/.ai is canonical read-only data, and /Users/cc/.ai/AIOS is the only writable app source path.";
  const policyDescription = "active-global-skills-policy.json hash is inventoried as a guard. The policy file must not be modified by this app.";

  return [
    withPrompts({
      id: "aios-root:policy:active-global-skills-policy",
      name: "active-global-skills-policy.json",
      toolType: "aios-root",
      capabilityType: "policy",
      status: "available",
      risk: "low",
      path: ACTIVE_GLOBAL_POLICY_PATH,
      paths: [ACTIVE_GLOBAL_POLICY_PATH],
      description: policyDescription,
      safetyProfile: readOnlySafety(["Hash-only guard; policy contents are not modified."]),
      tokenPressure: tokenPressureForText(policyDescription, "Policy guard summary.")
    }),
    withPrompts({
      id: "aios-root:policy:safety-boundaries",
      name: "AIOS Phase 1 safety boundaries",
      toolType: "aios-root",
      capabilityType: "policy",
      status: "ok",
      risk: "low",
      path: APP_REPO_ROOT,
      paths: [AIOS_ROOT, APP_REPO_ROOT],
      description: safetyDescription,
      safetyProfile: readOnlySafety(GLOBAL_BOUNDARY_NOTES),
      tokenPressure: tokenPressureForText(safetyDescription, "Safety boundary summary."),
      metadata: { boundaries: GLOBAL_BOUNDARY_NOTES }
    }),
    withPrompts({
      id: "codex:usage-prompt:frontend-ui-debugging",
      name: "front-end UI debugging prompt",
      toolType: "codex",
      capabilityType: "usage-prompt",
      status: "available",
      risk: "low",
      paths: [],
      description: "Copy prompt for browser-based frontend debugging while preserving local AIOS safety boundaries.",
      safetyProfile: readOnlySafety(["Prompt only; no execution."]),
      tokenPressure: tokenPressureForText("front-end UI debugging prompt", "Prompt metadata only.")
    }),
    withPrompts({
      id: "legacy:usage-prompt:wxmp-domain-example",
      name: "WeChat Mini Program wxmp prompt example",
      toolType: "legacy",
      capabilityType: "usage-prompt",
      status: "available",
      risk: "medium",
      paths: [],
      description: "Domain-specific wxmp prompt example. This is not AIOS root governance and must not be restored as a global baseline by default.",
      safetyProfile: readOnlySafety(["wxmp is domain-specific; do not treat it as AIOS root governance."]),
      tokenPressure: tokenPressureForText("wxmp domain-specific prompt example", "Prompt metadata only."),
      metadata: {
        codexPrompt:
          "For this WeChat Mini Program target project only, use the relevant wxmp/project-local skill after checking git status. Do not modify AIOS root governance or global skill entrypoints."
      }
    })
  ];
}

export async function generateInventory(): Promise<AiosInventory> {
  const baseline = await scanBaseline();
  const [skillResources, scriptResources, reportResources, projectPackResources, mcpResult] = await Promise.all([
    scanSkills(),
    scanScripts(),
    scanReports(),
    scanProjectPacks(),
    scanMcpServers()
  ]);

  const resources = [
    ...baselineResources(),
    ...skillResources,
    ...mcpResult.resources,
    ...scriptResources,
    ...reportResources,
    ...projectPackResources
  ].sort((a, b) => `${a.toolType}:${a.capabilityType}:${a.name}`.localeCompare(`${b.toolType}:${b.capabilityType}:${b.name}`));

  const generatedAt = new Date().toISOString();
  return {
    schemaVersion: 1,
    generatedAt,
    roots: {
      aiosRoot: AIOS_ROOT,
      appSourcePath: APP_REPO_ROOT
    },
    baseline: { ...baseline, generatedAt },
    resources,
    mcpServers: mcpResult.mcpServers,
    reports: reportResources
  };
}
