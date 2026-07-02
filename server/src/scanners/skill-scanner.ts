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
import { dedupeSkillResources, discoverFilesystemSkillResources, expandRegistrySkillResources, expandSkillAliases, markSkillActiveEntrypoint, toManifestPath } from "./skill-discovery-scanner.js";

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
    metadata: {
      sourceKind: "active-entrypoint",
      sourceKinds: ["active-entrypoint"],
      entrypoint: true,
      activeEntrypoint: true,
      indexed: false,
      registryListed: false,
      discoveredOnly: false,
      scanReason: `${toolType} top-level active skill entrypoint`
    }
  });
}

export async function scanSkills(): Promise<AiosResource[]> {
  const skillResources: AiosResource[] = [];
  const registryResources: AiosResource[] = [];
  const entrypointResources: AiosResource[] = [];
  const activeSkillNames = new Set<string>();
  const skillsIndex = await readJsonIfExists<SkillIndexEntry[]>(SKILLS_INDEX_PATH);

  if (Array.isArray(skillsIndex)) {
    for (const skill of skillsIndex) {
      const manifestPath = toManifestPath(skill.physicalPath ?? skill.entry);
      const paths = [skill.path, skill.physicalPath, skill.entry, manifestPath].filter((value): value is string => Boolean(value));
      const description = skill.description ?? `${skill.name} canonical shared skill.`;
      skillResources.push(
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
            sourceKind: "skills-index",
            sourceKinds: ["skills-index"],
            manifestPath,
            indexed: true,
            registryListed: false,
            activeEntrypoint: false,
            discoveredOnly: false,
            archived: skill.enabled === false,
            distillationRelated: isDistillationRelated(skill),
            scanReason: "SKILLS_INDEX.json entry",
            category: skill.category,
            tags: skill.tags ?? [],
            capabilities: skill.capabilities ?? [],
            aliases: expandSkillAliases(skill.name, skill.aliases ?? [])
          }
        })
      );
    }
  }

  const registry = await readJsonIfExists<RegistryLike>(CUSTOM_SKILL_REGISTRY_PATH);
  if (registry) {
    const description = "Read-only custom skill registry used by router workflows and global baseline budget governance.";
    registryResources.push(
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
          sourceKind: "custom-registry",
          sourceKinds: ["custom-registry"],
          generatedAt: registry.generatedAt,
          registryVersion: registry.registryVersion,
          counts: registry.counts,
          skillCount: Array.isArray(registry.skills) ? registry.skills.length : undefined
        }
      })
    );
    skillResources.push(...expandRegistrySkillResources(registry));
  }

  skillResources.push(...(await discoverFilesystemSkillResources()));

  for (const skillName of await listTopLevelDirectories(CODEX_SKILLS_DIR, new Set([".system"]))) {
    activeSkillNames.add(skillName);
    entrypointResources.push(createEntrypointResource("codex", skillName, CODEX_SKILLS_DIR));
  }

  for (const skillName of await listTopLevelDirectories(AGENTS_SKILLS_DIR)) {
    activeSkillNames.add(skillName);
    entrypointResources.push(createEntrypointResource("agents", skillName, AGENTS_SKILLS_DIR));
  }

  if (await directoryExists(CLAUDE_SKILLS_DIR)) {
    for (const skillName of await listTopLevelDirectories(CLAUDE_SKILLS_DIR)) {
      if (skillName.startsWith(".")) continue;
      activeSkillNames.add(skillName);
      entrypointResources.push(createEntrypointResource("claude", skillName, CLAUDE_SKILLS_DIR));
    }
  }

  const mergedSkillResources = dedupeSkillResources(skillResources).map((resource) => markSkillActiveEntrypoint(resource, activeSkillNames));
  return [...mergedSkillResources, ...registryResources, ...entrypointResources];
}

function isDistillationRelated(skill: SkillIndexEntry): boolean {
  return [skill.name, skill.description, skill.category, skill.path, skill.physicalPath, ...(skill.tags ?? []), ...(skill.aliases ?? []), ...(skill.capabilities ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .match(/huashu|nuwa|nvwa|distill|distillation|distilled|perspective|persona|蒸馏|女娲|人物/)
    ? true
    : false;
}
