import path from "node:path";
import {
  AGENTS_SKILLS_DIR,
  CLAUDE_SKILLS_DIR,
  CODEX_SKILLS_DIR,
  CUSTOM_SKILL_REGISTRY_PATH,
  SKILLS_INDEX_PATH
} from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { readOnlySafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosResource, ToolType } from "../domain/types.js";
import { directoryExists, listTopLevelDirectories, readJsonIfExists } from "../utils/fs-safe.js";

interface SkillIndexEntry {
  name: string;
  category?: string;
  description?: string;
  entry?: string;
  tags?: string[];
  enabled?: boolean;
  path?: string;
  physicalPath?: string;
  capabilities?: string[];
  aliases?: string[];
}

interface RegistryLike {
  generatedAt?: string;
  registryVersion?: string;
  counts?: Record<string, unknown>;
  skills?: unknown[];
}

function resourceId(...parts: string[]): string {
  return parts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-");
}

function withPrompts(resource: Omit<AiosResource, "prompts">): AiosResource {
  const full: AiosResource = { ...resource, prompts: [] };
  return { ...full, prompts: buildUsagePrompts(full) };
}

function createEntrypointResource(toolType: ToolType, skillName: string, baseDir: string): AiosResource {
  const skillPath = path.join(baseDir, skillName);
  const description =
    skillName === "custom-skill-router"
      ? "Active router for resolving low-frequency, archived, experimental, or project-specific skills without restoring the full global baseline."
      : `${toolType} active skill entrypoint metadata. Contents are not read by the entrypoint scanner.`;

  return withPrompts({
    id: resourceId(toolType, "entrypoint", skillName),
    name: skillName,
    toolType,
    capabilityType: "runtime-view",
    status: "active",
    risk: skillName === "custom-skill-router" ? "low" : "medium",
    path: skillPath,
    paths: [skillPath],
    description,
    safetyProfile: readOnlySafety([
      "Entrypoint metadata only.",
      "Do not copy project-local or archived skills into this global entrypoint."
    ]),
    tokenPressure: tokenPressureForText(description, "Entrypoint summary only."),
    metadata: { entrypoint: true }
  });
}

export async function scanSkills(): Promise<AiosResource[]> {
  const resources: AiosResource[] = [];
  const skillsIndex = await readJsonIfExists<SkillIndexEntry[]>(SKILLS_INDEX_PATH);

  if (Array.isArray(skillsIndex)) {
    for (const skill of skillsIndex) {
      const paths = [skill.path, skill.physicalPath, skill.entry].filter((value): value is string => Boolean(value));
      const description = skill.description ?? `${skill.name} canonical shared skill.`;
      resources.push(
        withPrompts({
          id: resourceId("aios-root", "skill", skill.name),
          name: skill.name,
          toolType: "aios-root",
          capabilityType: "skill",
          status: skill.enabled === false ? "disabled" : "available",
          risk: "low",
          path: paths[0],
          paths,
          description,
          safetyProfile: readOnlySafety([
            "Canonical skill metadata from SKILLS_INDEX.json.",
            "The scanner does not modify shared skill source files."
          ]),
          tokenPressure: tokenPressureForText(`${skill.name} ${description} ${paths.join(" ")}`, "Canonical skill metadata."),
          metadata: {
            category: skill.category,
            tags: skill.tags ?? [],
            capabilities: skill.capabilities ?? [],
            aliases: skill.aliases ?? []
          }
        })
      );
    }
  }

  const registry = await readJsonIfExists<RegistryLike>(CUSTOM_SKILL_REGISTRY_PATH);
  if (registry) {
    const description = "Read-only custom skill registry used by router workflows and global baseline budget governance.";
    resources.push(
      withPrompts({
        id: "aios-root:registry:custom-skill-registry",
        name: "custom-skill-registry.json",
        toolType: "aios-root",
        capabilityType: "registry",
        status: "available",
        risk: "low",
        path: CUSTOM_SKILL_REGISTRY_PATH,
        paths: [CUSTOM_SKILL_REGISTRY_PATH],
        description,
        safetyProfile: readOnlySafety(["Registry is read as metadata only."]),
        tokenPressure: tokenPressureForText(description, "Registry summary only."),
        metadata: {
          generatedAt: registry.generatedAt,
          registryVersion: registry.registryVersion,
          counts: registry.counts,
          skillCount: Array.isArray(registry.skills) ? registry.skills.length : undefined
        }
      })
    );
  }

  for (const skillName of await listTopLevelDirectories(CODEX_SKILLS_DIR, new Set([".system"]))) {
    resources.push(createEntrypointResource("codex", skillName, CODEX_SKILLS_DIR));
  }

  for (const skillName of await listTopLevelDirectories(AGENTS_SKILLS_DIR)) {
    resources.push(createEntrypointResource("agents", skillName, AGENTS_SKILLS_DIR));
  }

  if (await directoryExists(CLAUDE_SKILLS_DIR)) {
    for (const skillName of await listTopLevelDirectories(CLAUDE_SKILLS_DIR)) {
      if (skillName.startsWith(".")) continue;
      resources.push(createEntrypointResource("claude", skillName, CLAUDE_SKILLS_DIR));
    }
  }

  return resources;
}
