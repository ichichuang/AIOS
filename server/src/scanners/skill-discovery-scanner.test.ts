import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { AiosResource } from "../domain/types.js";
import {
  dedupeSkillResources,
  discoverFilesystemSkillResources,
  expandRegistrySkillResources,
  parseSkillManifestMetadata
} from "./skill-discovery-scanner.js";

test("parseSkillManifestMetadata reads safe frontmatter fields", () => {
  const metadata = parseSkillManifestMetadata(`---
name: huashu-nvwa
description: "Distills tasks into reusable skills."
category: 07-knowledge-research
tags:
  - distillation
  - research
aliases: [huashu-nuwa, nvwa.skill, 女娲]
capabilities:
  - skill-discovery
  - documentation-synthesis
---

# Ignored Heading

Body is intentionally not retained.
`);

  assert.equal(metadata.name, "huashu-nvwa");
  assert.equal(metadata.description, "Distills tasks into reusable skills.");
  assert.equal(metadata.category, "07-knowledge-research");
  assert.deepEqual(metadata.tags, ["distillation", "research"]);
  assert.deepEqual(metadata.aliases, ["huashu-nuwa", "nvwa.skill", "女娲"]);
  assert.deepEqual(metadata.capabilities, ["skill-discovery", "documentation-synthesis"]);
});

test("parseSkillManifestMetadata falls back to the first heading", () => {
  const metadata = parseSkillManifestMetadata(`# Distilled Perspective

Short body that must not become inventory metadata.
`);

  assert.equal(metadata.name, "Distilled Perspective");
  assert.equal(metadata.description, undefined);
});

test("expandRegistrySkillResources creates individual safe registry skill resources", () => {
  const resources = expandRegistrySkillResources({
    skills: [
      {
        name: "andrej-karpathy-perspective",
        category: "07-knowledge-research",
        description: "AI-optimized distilled perspective skill.",
        skillMdPath: "/Users/cc/.ai/skill-modules/07-knowledge-research/huashu-nuwa/examples/andrej-karpathy-perspective/SKILL.md",
        aliases: ["karpathy"],
        tags: ["distilled"],
        capabilities: ["documentation-synthesis"],
        sourceTypes: ["embedded-skill-md"]
      }
    ]
  });

  assert.equal(resources.length, 1);
  assert.equal(resources[0].name, "andrej-karpathy-perspective");
  assert.equal(resources[0].capabilityType, "skill");
  assert.equal(resources[0].metadata?.registryListed, true);
  assert.equal(resources[0].metadata?.distillationRelated, true);
  assert.equal(
    resources[0].metadata?.manifestPath,
    "/Users/cc/.ai/skill-modules/07-knowledge-research/huashu-nuwa/examples/andrej-karpathy-perspective/SKILL.md"
  );
  assert.deepEqual(resources[0].metadata?.aliases, ["karpathy"]);
});

test("dedupeSkillResources prefers indexed resources and merges discovered metadata", () => {
  const manifestPath = "/Users/cc/.ai/skill-modules/07-knowledge-research/huashu-nuwa/SKILL.md";
  const discovered = makeSkillResource({
    id: "aios-root:skill-discovered:huashu-nuwa",
    name: "huashu-nuwa",
    path: manifestPath,
    paths: [manifestPath],
    metadata: {
      sourceKind: "filesystem",
      sourceKinds: ["filesystem"],
      manifestPath,
      discoveredOnly: true,
      indexed: false,
      tags: ["distillation"],
      aliases: ["nuwa"],
      distillationRelated: true
    }
  });
  const indexed = makeSkillResource({
    id: "aios-root:skill:huashu-nuwa",
    name: "huashu-nuwa",
    path: "07-knowledge-research/huashu-nuwa",
    paths: ["07-knowledge-research/huashu-nuwa", manifestPath],
    metadata: {
      sourceKind: "skills-index",
      sourceKinds: ["skills-index"],
      manifestPath,
      indexed: true,
      discoveredOnly: false,
      aliases: ["nvwa"],
      capabilities: ["skill-discovery"]
    }
  });

  const deduped = dedupeSkillResources([discovered, indexed]);

  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].id, "aios-root:skill:huashu-nuwa");
  assert.equal(deduped[0].metadata?.indexed, true);
  assert.equal(deduped[0].metadata?.discoveredOnly, false);
  assert.deepEqual(deduped[0].metadata?.sourceKinds, ["skills-index", "filesystem"]);
  assert.deepEqual(deduped[0].metadata?.aliases, ["nvwa", "nuwa"]);
  assert.deepEqual(deduped[0].metadata?.tags, ["distillation"]);
});

test("discoverFilesystemSkillResources finds huashu-nvwa from a bounded SKILL.md root", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "aios-skill-discovery-"));
  try {
    const skillDir = path.join(tempRoot, "skills", "huashu-nvwa");
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: huashu-nvwa
description: Distills tasks into reusable skills.
aliases: [huashu-nuwa, nvwa, nvwa.skill]
tags: [distillation, skill-generation]
capabilities: [skill-discovery]
---
# huashu-nvwa
`,
      "utf8"
    );

    const resources = await discoverFilesystemSkillResources({
      aiosRoot: tempRoot,
      roots: [path.join(tempRoot, "skills")],
      maxDirs: 20,
      maxDepth: 4,
      maxSkills: 10
    });

    assert.equal(resources.length, 1);
    assert.equal(resources[0].name, "huashu-nvwa");
    assert.equal(resources[0].metadata?.sourceKind, "filesystem");
    assert.equal(resources[0].metadata?.discoveredOnly, true);
    assert.equal(resources[0].metadata?.indexed, false);
    assert.equal(resources[0].metadata?.manifestPath, path.join(skillDir, "SKILL.md"));
    assert.deepEqual(resources[0].metadata?.aliases, ["huashu-nuwa", "nvwa", "nvwa.skill"]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

function makeSkillResource(overrides: Partial<AiosResource> & Pick<AiosResource, "id" | "name">): AiosResource {
  const { id, name, ...rest } = overrides;
  return {
    id,
    name,
    toolType: "aios-root",
    capabilityType: "skill",
    status: "available",
    risk: "low",
    paths: [],
    description: `${overrides.name} metadata.`,
    safetyProfile: {
      readOnly: true,
      writesGlobalState: false,
      secretExposureRisk: "low",
      executionRisk: "low",
      notes: []
    },
    tokenPressure: {
      estimatedTokens: 0,
      level: "low",
      reason: "metadata"
    },
    prompts: [],
    ...rest
  };
}
