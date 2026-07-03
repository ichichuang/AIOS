import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getResourceDisplay } from "../i18n/resourceText.ts";
import type { AiosInventory, AiosResource } from "../types/inventory.ts";
import { buildSkillDisplayEnrichment } from "./skillDisplayEnrichment.ts";
import { buildSkillIdentityRows, filterSkillIdentityRows } from "./skillIdentityModel.ts";

const snapshotUrl = new URL("../../public/aios-inventory.snapshot.json", import.meta.url);
const inventory = JSON.parse(readFileSync(snapshotUrl, "utf8")) as AiosInventory;
const rows = buildSkillIdentityRows(inventory.resources);

function resourceByName(name: string): AiosResource {
  const resource = inventory.resources.find((candidate) => candidate.name === name);
  assert.ok(resource, `missing resource ${name}`);
  return resource;
}

function enrichmentForName(name: string) {
  const resource = resourceByName(name);
  return buildSkillDisplayEnrichment(resource, getResourceDisplay(resource));
}

function searchRows(query: string) {
  return filterSkillIdentityRows(rows, query);
}

function makeSkillResource(overrides: Partial<AiosResource> & Pick<AiosResource, "id" | "name" | "description">): AiosResource {
  return {
    toolType: "aios-root",
    capabilityType: "skill",
    status: "available",
    risk: "low",
    paths: [],
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
    ...overrides
  };
}

assert.equal(enrichmentForName("andrej-karpathy-perspective").displayNameZh, "Andrej Karpathy 视角");
assert.equal(enrichmentForName("evan-you-perspective").displayNameZh, "Evan You 视角");
assert.equal(enrichmentForName("zhangxuefeng-perspective").displayNameZh, "张雪峰视角");
assert.equal(enrichmentForName("x-mastery-mentor").displayNameZh, "X 成长导师");
assert.equal(enrichmentForName("andrej-karpathy-perspective").displayDescriptionZh, "以 Andrej Karpathy 的视角、判断方式和表达风格辅助分析任务。");
assert.equal(enrichmentForName("x-mastery-mentor").displayDescriptionZh, "用于把目标拆成可执行的成长、训练或技能精进建议。");

const genericName = makeSkillResource({
  id: "skill:custom-prompt-helper",
  name: "custom-prompt-helper",
  description: "registry skill metadata"
});
const genericNameEnrichment = buildSkillDisplayEnrichment(genericName, getResourceDisplay(genericName));
assert.notEqual(genericNameEnrichment.displayNameZh, "技能");
assert.equal(genericNameEnrichment.qualityLevel, "needs-review");

const genericPrompt = makeSkillResource({
  id: "skill:persona-helper",
  name: "persona-helper",
  description: "执行提示词资源；复制后由用户显式使用"
});
const genericPromptEnrichment = buildSkillDisplayEnrichment(genericPrompt, getResourceDisplay(genericPrompt));
assert.equal(genericPromptEnrichment.displayDescriptionZh, "用于调用特定人物或方法论视角分析问题，复制提示词后由用户显式使用。");
assert.equal(genericPromptEnrichment.enrichmentSource, "inferred");

const weakMetadata = enrichmentForName("andrej-karpathy-perspective");
assert.equal(weakMetadata.qualityLevel, "usable");
assert(weakMetadata.suggestedFields.includes("aliases"));
assert(weakMetadata.suggestedFields.includes("tags"));
assert(weakMetadata.suggestedFields.includes("capabilities"));

assert.equal(searchRows("nvwa").length, 21);
assert(searchRows("persona").some((row) => row.sources.some((source) => source.name === "x-mastery-mentor")));
assert(searchRows("perspective").some((row) => row.sources.some((source) => source.name === "andrej-karpathy-perspective")));
assert(searchRows("frontend").some((row) => row.sources.some((source) => source.name === "frontend-skill")));
assert(searchRows("top-ui").some((row) => row.sources.some((source) => source.name === "top-ui-frontend-framework")));
assert(searchRows("huashu").some((row) => row.sources.some((source) => source.name === "zhangxuefeng-perspective")));
