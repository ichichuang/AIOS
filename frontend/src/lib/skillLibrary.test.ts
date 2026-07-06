import assert from "node:assert/strict";
import {
  buildHomeSkillLibraryStats,
  fallbackSkillUsageText,
  getSkillDetail,
  getSkillLibrarySummary,
  listSkillLibraryItems,
  mapSkillListItemToResource,
  type SkillLibrarySummary,
  type SkillListItem
} from "./skillLibrary";
import { fallbackResourceCorpusSummary } from "./resourceCorpus";

const fallbackSummary = await getSkillLibrarySummary();
const fallbackItems = await listSkillLibraryItems();

assert.equal(fallbackSummary, null);
assert.deepEqual(fallbackItems, []);
await assert.rejects(() => getSkillDetail("skill:missing"), /Tauri 桌面运行时/);
assert.equal(fallbackSkillUsageText, "暂时无法判断使用方法。请在高级信息里查看来源。");

const productSummary: SkillLibrarySummary = {
  generatedAtMs: 1_725_100_001_000,
  latestScanAtMs: 1_725_100_001_000,
  latestSuccessfulScanAtMs: 1_725_100_001_000,
  counts: {
    totalSkillCandidates: 5,
    dedupedSkillCount: 4,
    availableSkillCount: 1,
    needsAttentionCount: 3,
    duplicateCount: 1,
    brokenCount: 1,
    sourceUnknownCount: 1,
    uncheckedCount: 0
  },
  metadataOnly: true,
  contentStorageEnabled: false
};

const homeStats = buildHomeSkillLibraryStats(productSummary, fallbackResourceCorpusSummary, {
  skills: 99,
  mcp: 2,
  dashboard: 101,
  advanced: 0,
  "custom-scan": 0,
  scripts: 0,
  reports: 0,
  "project-packs": 0,
  policies: 0,
  validators: 0,
  legacy: 0
});
assert.equal(homeStats.skillCount, 4);
assert.equal(homeStats.needsAttentionCount, 3);
assert.ok(homeStats.latestScanLabel.includes("2024"));
assert.equal(homeStats.usingProductSummary, true);

const fallbackHomeStats = buildHomeSkillLibraryStats(null, fallbackResourceCorpusSummary, {
  ...homeStats.viewCounts,
  skills: 2
});
assert.equal(fallbackHomeStats.skillCount, 2);
assert.equal(fallbackHomeStats.needsAttentionCount, 0);
assert.equal(fallbackHomeStats.latestScanLabel, "还没有查找记录");
assert.equal(fallbackHomeStats.usingProductSummary, false);

const item: SkillListItem = {
  id: "skill:writer",
  displayName: "writer",
  originalName: "writer",
  shortPurpose: "用于撰写和润色文本。",
  status: "duplicate",
  sourceLabel: "Codex",
  sourceKindLabel: "Codex",
  availableInTools: ["Codex"],
  usageText: "在 Codex 中输入 `$writer`。",
  attentionReasons: [
    {
      code: "duplicate-sources",
      label: "发现重复来源",
      detail: "保留一个推荐项，其余在详情里查看。",
      severity: "medium"
    }
  ],
  primaryPathHint: "~/.codex/skills/writer/SKILL.md",
  sourceCount: 2,
  updatedAt: "2024-09-01T00:00:00.000Z",
  lastSeenAt: "2024-09-01T00:00:01.000Z"
};

const mapped = mapSkillListItemToResource(item);
assert.equal(mapped.id, "skill-library:skill:writer");
assert.equal(mapped.name, "writer");
assert.equal(mapped.zhName, "writer");
assert.equal(mapped.zhDescription, "用于撰写和润色文本。");
assert.equal(mapped.zhStatus, "重复");
assert.equal(mapped.metadata?.skillLibraryItemId, "skill:writer");
assert.equal(mapped.metadata?.sourceLabel, "Codex");
assert.equal(mapped.metadata?.usageText, "在 Codex 中输入 `$writer`。");
assert.equal(mapped.prompts[0]?.target, "codex");
assert.match(mapped.prompts[0]?.prompt ?? "", /\$writer/);
assert.equal(mapped.paths[0], "~/.codex/skills/writer/SKILL.md");

console.log("skillLibrary client tests passed");
