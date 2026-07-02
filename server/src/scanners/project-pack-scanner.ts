import path from "node:path";
import { PROJECT_PACK_ROOTS, shouldSkipDirectory } from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { readOnlySafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosResource } from "../domain/types.js";
import { directoryExists, listDirectorySafe, pathExists } from "../utils/fs-safe.js";

interface QueueItem {
  directory: string;
  depth: number;
}

const MAX_DIRS_PER_ROOT = 1000;
const MAX_DEPTH = 7;
const MAX_PACKS = 60;

function packResource(skillName: string, skillPath: string, root: string): AiosResource {
  const description = `Project-local skill pack detected under ${root}. Use only in the owning project; do not promote to global AIOS entrypoints.`;
  const base: AiosResource = {
    id: `project-local:pack:${skillPath.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: skillName,
    toolType: "project-local",
    capabilityType: "project-pack",
    status: "available",
    risk: "medium",
    path: skillPath,
    paths: [skillPath],
    description,
    safetyProfile: readOnlySafety([
      "Project-local pack detection is bounded.",
      "The scanner does not modify or copy this skill pack."
    ]),
    tokenPressure: tokenPressureForText(description, "Project-local pack metadata only."),
    prompts: [],
    metadata: { root }
  };
  return { ...base, prompts: buildUsagePrompts(base) };
}

async function collectFromAgentsSkills(directory: string, root: string, resources: AiosResource[]): Promise<void> {
  const skillsDir = path.join(directory, ".agents/skills");
  if (!(await directoryExists(skillsDir))) return;

  for (const entry of await listDirectorySafe(skillsDir)) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (await pathExists(skillPath)) {
      resources.push(packResource(entry.name, skillPath, root));
      if (resources.length >= MAX_PACKS) return;
    }
  }
}

export async function scanProjectPacks(): Promise<AiosResource[]> {
  const resources: AiosResource[] = [];

  for (const root of PROJECT_PACK_ROOTS) {
    if (!(await directoryExists(root))) continue;
    const queue: QueueItem[] = [{ directory: root, depth: 0 }];
    let visited = 0;

    while (queue.length > 0 && visited < MAX_DIRS_PER_ROOT && resources.length < MAX_PACKS) {
      const current = queue.shift();
      if (!current) break;
      visited += 1;

      await collectFromAgentsSkills(current.directory, root, resources);
      if (resources.length >= MAX_PACKS || current.depth >= MAX_DEPTH) continue;

      for (const entry of await listDirectorySafe(current.directory)) {
        if (!entry.isDirectory()) continue;
        if (shouldSkipDirectory(entry.name)) continue;
        queue.push({ directory: path.join(current.directory, entry.name), depth: current.depth + 1 });
      }
    }
  }

  return resources;
}
