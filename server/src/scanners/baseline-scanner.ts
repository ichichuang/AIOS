import path from "node:path";
import {
  ACTIVE_GLOBAL_POLICY_PATH,
  AGENTS_SKILLS_DIR,
  AIOS_ROOT,
  APP_REPO_ROOT,
  CLAUDE_SKILLS_DIR,
  CODEX_AUTOMATIONS_DIR,
  CODEX_SKILLS_DIR,
  CUSTOM_SKILL_REGISTRY_PATH,
  SKILLS_INDEX_PATH
} from "../domain/path-policy.js";
import type { BaselineSummary, ValidatorSummary } from "../domain/types.js";
import { countTopLevelDirectories, directoryExists, listDirectorySafe, pathExists, readJsonIfExists } from "../utils/fs-safe.js";
import { sha256File } from "../utils/hash.js";

interface RegistryLike {
  counts?: {
    canonical?: number;
  };
  skills?: unknown[];
}

async function canonicalSkillCount(): Promise<number> {
  const skillsIndex = await readJsonIfExists<unknown>(SKILLS_INDEX_PATH);
  if (Array.isArray(skillsIndex)) return skillsIndex.length;

  const registry = await readJsonIfExists<RegistryLike>(CUSTOM_SKILL_REGISTRY_PATH);
  if (registry?.counts?.canonical) return registry.counts.canonical;
  if (Array.isArray(registry?.skills)) return registry.skills.length;
  return 0;
}

async function automationDirectoryState() {
  const exists = await pathExists(CODEX_AUTOMATIONS_DIR);
  const isDirectory = exists ? await directoryExists(CODEX_AUTOMATIONS_DIR) : false;
  const entryCount = isDirectory ? (await listDirectorySafe(CODEX_AUTOMATIONS_DIR)).length : 0;
  return {
    exists,
    isDirectory,
    entryCount,
    summary: exists ? `exists=${isDirectory ? "dir" : "non-dir"} entries=${entryCount}` : "missing"
  };
}

function validatorSummaries(): ValidatorSummary[] {
  const validators = [
    {
      name: "validate-skills.mjs",
      path: path.join(AIOS_ROOT, "scripts/validate-skills.mjs"),
      summary: "Observation-only validator. Known WARN applies only when stale deleted Codex automation scan targets are the sole failure."
    },
    {
      name: "ai-local-doctor.mjs",
      path: path.join(AIOS_ROOT, "scripts/ai-local-doctor.mjs"),
      summary: "Observation-only local AIOS doctor. The scanner records metadata; validation is run separately."
    }
  ];

  return validators.map((validator) => ({
    ...validator,
    status: "available" as const
  }));
}

export async function scanBaseline(): Promise<BaselineSummary> {
  const codexExcludeSystem = new Set([".system"]);
  const generatedAt = new Date().toISOString();
  const policyHash = await sha256File(ACTIVE_GLOBAL_POLICY_PATH);

  return {
    aiosRoot: AIOS_ROOT,
    appSourcePath: APP_REPO_ROOT,
    generatedAt,
    policyHash,
    canonicalSkillCount: await canonicalSkillCount(),
    codexTopLevelCount: await countTopLevelDirectories(CODEX_SKILLS_DIR),
    codexActiveUserSkillCount: await countTopLevelDirectories(CODEX_SKILLS_DIR, codexExcludeSystem),
    agentsActiveUserSkillCount: await countTopLevelDirectories(AGENTS_SKILLS_DIR),
    claudeSkillCount: (await directoryExists(CLAUDE_SKILLS_DIR)) ? await countTopLevelDirectories(CLAUDE_SKILLS_DIR) : null,
    customSkillRouterCodex: await directoryExists(path.join(CODEX_SKILLS_DIR, "custom-skill-router")),
    customSkillRouterAgents: await directoryExists(path.join(AGENTS_SKILLS_DIR, "custom-skill-router")),
    codexAutomationDirectoryState: await automationDirectoryState(),
    validators: validatorSummaries(),
    knownWarnings: [
      "If validate-skills.mjs exits 1 only because deleted Codex automation TOML scan targets are missing, classify it as a known WARN and do not remediate in this app.",
      "Codex .system is client-owned reserved content, not shared AIOS skill drift.",
      "WeChat Mini Program/wxmp is a domain-specific package example, not AIOS root governance."
    ]
  };
}
