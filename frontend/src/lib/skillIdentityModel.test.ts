import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSkillIdentityRows, filterSkillIdentityRows, getSkillIdentityKey } from "./skillIdentityModel.ts";
import { getSkillFamilyInheritedAliases } from "./skillDiscoveryMetadata.ts";
import type { AiosInventory, AiosResource } from "../types/inventory.ts";

const snapshotUrl = new URL("../../public/aios-inventory.snapshot.json", import.meta.url);
const inventory = JSON.parse(readFileSync(snapshotUrl, "utf8")) as AiosInventory;
const rows = buildSkillIdentityRows(inventory.resources);

function resourcesByName(name: string): AiosResource[] {
  return inventory.resources.filter((resource) => resource.name === name);
}

function rowsByName(name: string) {
  return rows.filter((row) => row.primaryResource.name === name || row.sources.some((source) => source.name === name));
}

function searchRows(query: string) {
  return filterSkillIdentityRows(rows, query);
}

function huashuExampleRowsForQuery(query: string) {
  return searchRows(query).filter((row) => row.sources.some((source) => source.paths.some((sourcePath) => sourcePath.includes("huashu-nuwa/examples/"))));
}

const googleMaterialResources = resourcesByName("aios-google-material-style");
assert.equal(googleMaterialResources.length, 2);
assert.equal(getSkillIdentityKey(googleMaterialResources[0]), getSkillIdentityKey(googleMaterialResources[1]));

const googleMaterialRows = rowsByName("aios-google-material-style");
assert.equal(googleMaterialRows.length, 1);
assert.equal(googleMaterialRows[0].sources.length, 2);
assert.deepEqual(
  googleMaterialRows[0].sourceBadges.map((badge) => badge.label),
  ["文件系统", "项目"]
);

const polishRows = rowsByName("aios-ui-polish-react-gsap");
assert.equal(polishRows.length, 1);
assert.equal(polishRows[0].sources.length, 2);

const topUiRows = rowsByName("top-ui-frontend-framework");
assert.equal(topUiRows.length, 1);
assert.equal(topUiRows[0].sources.length, 2);
assert.deepEqual(
  topUiRows[0].sourceBadges.map((badge) => badge.label),
  ["索引", "目录", "文件系统", "Claude"]
);

const frontendRows = rowsByName("frontend-skill");
assert.equal(frontendRows.length, 1);
assert.equal(frontendRows[0].sources.length, 4);
assert.deepEqual(
  frontendRows[0].sourceBadges.map((badge) => badge.label),
  ["索引", "目录", "文件系统", "Codex", "Agents", "Claude"]
);

const xMastery = resourcesByName("x-mastery-mentor")[0];
assert.ok(xMastery);
assert.deepEqual(getSkillFamilyInheritedAliases(xMastery), [
  "huashu",
  "huashu-nuwa",
  "huashu-nvwa",
  "nuwa",
  "nvwa",
  "女娲",
  "蒸馏",
  "distill",
  "distilled",
  "distillation",
  "persona",
  "perspective",
  "人物",
  "角色"
]);

assert.equal(huashuExampleRowsForQuery("nvwa").length, 20);
assert(searchRows("nvwa").some((row) => row.primaryResource.name === "huashu-nuwa"));
assert.equal(huashuExampleRowsForQuery("nuwa").length, 20);
assert.equal(huashuExampleRowsForQuery("huashu").length, 20);
assert(searchRows("persona").some((row) => row.primaryResource.name === "x-mastery-mentor"));
assert(searchRows("perspective").some((row) => row.primaryResource.name === "x-mastery-mentor"));
assert.equal(searchRows("top-ui").filter((row) => row.sources.some((source) => source.name === "top-ui-frontend-framework")).length, 1);
assert.equal(searchRows("frontend").filter((row) => row.sources.some((source) => source.name === "frontend-skill")).length, 1);
