import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildSkillDetailViewModel,
  buildHomeSkillLibraryStats,
  fallbackSkillUsageText,
  filterSkillLibraryItems,
  getSkillDetail,
  getSkillLibraryItemIdFromResource,
  getSkillLibrarySummary,
  listSkillLibraryItems,
  mapSkillListItemToResource,
  sanitizeSkillDetailLoadError,
  skillStatusFilterOptions,
  type SkillDetail,
  type SkillLibrarySummary,
  type SkillListItem,
  type SkillStatusFilter
} from "./skillLibrary";
import { productVirtualListHeight, shouldShowProductRowsMismatchDiagnostic } from "./productListRendering";
import { fallbackResourceCorpusSummary } from "./resourceCorpus";

const fallbackSummary = await getSkillLibrarySummary();
const fallbackItems = await listSkillLibraryItems();

assert.equal(fallbackSummary, null);
assert.deepEqual(fallbackItems, []);
await assert.rejects(() => getSkillDetail("skill:missing"), /Tauri 桌面运行时/);
assert.equal(fallbackSkillUsageText, "暂时无法判断使用方法。请在高级信息里查看来源。");
assert.equal(productVirtualListHeight(0, 108), "0px");
assert.equal(productVirtualListHeight(1, 108), "108px");
assert.equal(productVirtualListHeight(20, 108), "min(864px, var(--aios-module-scroll-body-height, 864px))");
assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 1, rowCount: 0, query: "", statusFilterActive: false, loading: false, error: null }),
  true
);
assert.equal(
  shouldShowProductRowsMismatchDiagnostic({ summaryCount: 1, rowCount: 0, query: "writer", statusFilterActive: false, loading: false, error: null }),
  false
);

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
assert.notEqual(homeStats.skillCount, homeStats.viewCounts.skills, "product summary count must win over loaded or filtered view counts");

const fallbackHomeStats = buildHomeSkillLibraryStats(null, fallbackResourceCorpusSummary, {
  ...homeStats.viewCounts,
  skills: 2
});
assert.equal(fallbackHomeStats.skillCount, 2);
assert.equal(fallbackHomeStats.needsAttentionCount, 0);
assert.equal(fallbackHomeStats.latestScanLabel, "还没有查找记录");
assert.equal(fallbackHomeStats.usingProductSummary, false);
assert.notEqual(fallbackHomeStats.skillCount, productSummary.counts.dedupedSkillCount, "non-Tauri fallback must not fake authoritative product totals");

const item: SkillListItem = {
  id: "skill:writer",
  displayName: "writer",
  originalName: "writer",
  shortPurpose: "用于撰写和润色文本。",
  status: "duplicate",
  sourceLabel: "Codex",
  sourceKindLabel: "Codex",
  availableInTools: ["Codex"],
  aliases: ["writer", "copy-helper"],
  tags: ["writing", "product-copy"],
  capabilities: ["drafting", "editing"],
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
assert.deepEqual(mapped.metadata?.aliases, ["writer", "copy-helper"]);
assert.deepEqual(mapped.metadata?.tags, ["writing", "product-copy"]);
assert.deepEqual(mapped.metadata?.capabilities, ["drafting", "editing"]);
assert.equal(mapped.prompts[0]?.target, "codex");
assert.match(mapped.prompts[0]?.prompt ?? "", /\$writer/);
assert.equal(mapped.paths[0], "~/.codex/skills/writer/SKILL.md");
assert.equal(getSkillLibraryItemIdFromResource(mapped), "skill:writer");

const sourceUnknownItem: SkillListItem = {
  ...item,
  id: "skill:mystery",
  displayName: "mystery",
  originalName: "mystery",
  shortPurpose: "暂时无法判断用途。请在高级信息里查看来源。",
  status: "sourceUnknown",
  sourceLabel: "来源不明",
  sourceKindLabel: "来源不明",
  availableInTools: ["Unknown"],
  aliases: [],
  tags: [],
  capabilities: [],
  usageText: null,
  attentionReasons: [
    {
      code: "source-unknown",
      label: "来源不明",
      detail: "AIOS Desktop 还不能判断这个技能来自哪个清楚来源。",
      severity: "medium"
    }
  ],
  primaryPathHint: "[sensitive]/SKILL.md",
  sourceCount: 1
};
const mappedUnknown = mapSkillListItemToResource(sourceUnknownItem);
assert.equal(mappedUnknown.zhStatus, "来源不明");
assert.equal(mappedUnknown.zhCategory, "来源不明 / 技能");
assert.equal(mappedUnknown.metadata?.sourceLabel, "来源不明");
assert.equal(mappedUnknown.metadata?.usageText, fallbackSkillUsageText);
assert.deepEqual(mappedUnknown.prompts, [], "unknown usage must not create copyable invocation prompts");

const detail: SkillDetail = {
  ...item,
  whatItDoes: "帮助用户撰写、改写和润色文本。",
  whenToUse: "需要起草、整理或改写文字时使用。",
  howToUse: "在 Codex 中输入 `$writer`。",
  usageSummary: {
    usageKnown: true,
    usageText: "在 Codex 中输入 `$writer`。",
    availableInTools: ["Codex"]
  },
  sourceSummaries: [
    {
      id: "resource:writer",
      sourceLabel: "Codex",
      sourceKindLabel: "Codex",
      availableInTools: ["Codex"],
      pathHint: "~/.codex/skills/writer/SKILL.md",
      rootPathHint: "~/.codex",
      lastSeenAt: "2024-09-01T00:00:01.000Z",
      scanStatus: "completed",
      findingCount: 0,
      duplicate: false
    }
  ],
  relatedDuplicateSources: [],
  safeAdvancedMetadataSummary: [{ label: "本地记录边界", value: "仅使用 AIOS Desktop 已保存的基本信息，不读取技能正文。" }],
  findings: []
};

const detailModel = buildSkillDetailViewModel({
  detail,
  error: null,
  fallbackItem: item,
  loading: false
});
assert.equal(detailModel.mode, "ready");
assert.equal(detailModel.title, "writer");
assert.equal(detailModel.originalName, "writer");
assert.equal(detailModel.whatItDoes, "帮助用户撰写、改写和润色文本。");
assert.equal(detailModel.whenToUse, "需要起草、整理或改写文字时使用。");
assert.equal(detailModel.aliasesText, "writer、copy-helper");
assert.equal(detailModel.tagsText, "writing、product-copy");
assert.equal(detailModel.capabilitiesText, "drafting、editing");
assert.equal(detailModel.availableInToolsText, "Codex");
assert.equal(detailModel.howToUse, "在 Codex 中输入 `$writer`。");
assert.equal(detailModel.sourceText, "Codex");
assert.equal(detailModel.statusText, "重复");
assert.equal(detailModel.advancedRows[0]?.label, "本地记录边界");

const detailOnlyModel = buildSkillDetailViewModel({
  detail,
  error: null,
  fallbackItem: null,
  loading: false
});
assert.equal(detailOnlyModel.mode, "ready");
assert.equal(detailOnlyModel.title, "writer");
assert.equal(detailOnlyModel.howToUse, "在 Codex 中输入 `$writer`。");
assert.equal(detailOnlyModel.sourceSummaries.length, 1);

const fallbackDetailModel = buildSkillDetailViewModel({
  detail: null,
  error: sanitizeSkillDetailLoadError(new Error("/Users/example/secret-token-root token=super-secret-token")),
  fallbackItem: item,
  loading: false
});
assert.equal(fallbackDetailModel.mode, "unavailable");
assert.equal(fallbackDetailModel.howToUse, fallbackSkillUsageText);
assert.equal(fallbackDetailModel.sourceText, "Codex");
assert.equal(fallbackDetailModel.statusText, "重复");
assert(!JSON.stringify(fallbackDetailModel).includes("/Users/example"));
assert(!JSON.stringify(fallbackDetailModel).includes("super-secret-token"));
assert(!Object.keys(detailModel).includes("visibleCount"));

const searchableItems: SkillListItem[] = [
  item,
  sourceUnknownItem,
  {
    ...item,
    id: "skill:needs-review",
    displayName: "needs-review",
    originalName: "needs-review",
    shortPurpose: "需要用户查看来源。",
    status: "needsAttention",
    sourceLabel: "手动添加",
    sourceKindLabel: "手动添加",
    aliases: ["review-helper"],
    tags: ["review"],
    capabilities: ["检查"],
    attentionReasons: [
      {
        code: "manual-review",
        label: "需要处理",
        detail: "这个技能需要人工确认来源。",
        severity: "medium"
      }
    ],
    primaryPathHint: "~/manual/needs-review/SKILL.md",
    sourceCount: 1
  },
  {
    ...item,
    id: "skill:broken",
    displayName: "broken",
    originalName: "broken",
    shortPurpose: "来源缺少说明文件。",
    status: "broken",
    sourceLabel: "项目来源",
    sourceKindLabel: "项目来源",
    aliases: ["repair-helper"],
    tags: ["broken"],
    capabilities: ["修复线索"],
    attentionReasons: [
      {
        code: "missing-manifest",
        label: "已损坏",
        detail: "找不到技能说明文件。",
        severity: "high"
      }
    ],
    primaryPathHint: "~/workspace/broken/SKILL.md",
    sourceCount: 1
  },
  {
    ...item,
    id: "skill:unchecked",
    displayName: "unchecked",
    originalName: "unchecked",
    shortPurpose: "来源还没有完成查找。",
    status: "unchecked",
    sourceLabel: "全局来源",
    sourceKindLabel: "全局来源",
    aliases: ["pending-helper"],
    tags: ["pending"],
    capabilities: ["待检查"],
    attentionReasons: [
      {
        code: "unchecked-source",
        label: "未检查",
        detail: "最近记录尚未完成。",
        severity: "medium"
      }
    ],
    primaryPathHint: "~/global/unchecked/SKILL.md",
    sourceCount: 1
  },
  {
    ...item,
    id: "skill:project-helper",
    displayName: "project-helper",
    originalName: "project-helper",
    shortPurpose: "用于项目内技能整理。",
    status: "available",
    sourceLabel: "项目来源",
    sourceKindLabel: "项目来源",
    availableInTools: ["Unknown"],
    aliases: [],
    tags: ["project"],
    capabilities: ["整理"],
    usageText: fallbackSkillUsageText,
    attentionReasons: [],
    primaryPathHint: "~/workspace/project-helper/SKILL.md",
    sourceCount: 1
  }
];
assert.deepEqual(
  skillStatusFilterOptions.map((option) => option.label),
  ["全部", "可用", "需要处理", "重复", "已损坏", "来源不明", "未检查"]
);
const filteredBySource = filterSkillLibraryItems(searchableItems, "来源不明");
assert.deepEqual(filteredBySource.map((row) => row.id), ["skill:mystery"]);
const filteredByAlias = filterSkillLibraryItems(searchableItems, "copy-helper");
assert.deepEqual(filteredByAlias.map((row) => row.id), ["skill:writer"]);
const filteredByCapability = filterSkillLibraryItems(searchableItems, "drafting");
assert.deepEqual(filteredByCapability.map((row) => row.id), ["skill:writer"]);
const statusFilterExpectations: Array<[SkillStatusFilter, string[]]> = [
  ["all", ["skill:writer", "skill:mystery", "skill:needs-review", "skill:broken", "skill:unchecked", "skill:project-helper"]],
  ["available", ["skill:project-helper"]],
  ["needsAttention", ["skill:writer", "skill:mystery", "skill:needs-review", "skill:broken", "skill:unchecked"]],
  ["duplicate", ["skill:writer"]],
  ["broken", ["skill:broken"]],
  ["sourceUnknown", ["skill:mystery"]],
  ["unchecked", ["skill:unchecked"]]
];
for (const [filter, expectedIds] of statusFilterExpectations) {
  assert.deepEqual(
    filterSkillLibraryItems(searchableItems, "", filter).map((row) => row.id),
    expectedIds,
    `${filter} status filter should match product status semantics`
  );
}
assert.deepEqual(
  filterSkillLibraryItems(searchableItems, "copy-helper", "duplicate").map((row) => row.id),
  ["skill:writer"],
  "search and duplicate status filtering must compose"
);
assert.deepEqual(
  filterSkillLibraryItems(searchableItems, "copy-helper", "available").map((row) => row.id),
  [],
  "query matches must still respect the selected status filter"
);
assert.deepEqual(
  filterSkillLibraryItems(searchableItems, "mystery", "needsAttention").map((row) => row.id),
  ["skill:mystery"],
  "needsAttention includes sourceUnknown/broken/duplicate/unchecked semantics but still composes with query"
);
const productCountsBeforeFiltering = { ...productSummary.counts };
const visibleNeedsAttentionRows = filterSkillLibraryItems(searchableItems, "", "needsAttention");
assert.equal(productSummary.counts.dedupedSkillCount, 4, "product totals remain separate from search result length");
assert.equal(filteredBySource.length, 1);
assert.equal(visibleNeedsAttentionRows.length, 5);
assert.deepEqual(productSummary.counts, productCountsBeforeFiltering, "status filtering must not mutate authoritative product totals");
assert.equal(fallbackHomeStats.skillCount, 2, "non-Tauri fallback still uses view counts rather than product status filters");

const ordinarySurfaceText = [
  readFrontendFile("components/modules/DashboardModule.tsx"),
  readFrontendFile("components/modules/SkillsModule.tsx"),
  readFrontendFile("components/inspector/SkillDetailInspector.tsx")
].join("\n");
for (const forbidden of ["resource corpus", "SQLite state", "raw scan diagnostics", "模块切换", "注册表", "运行时视图"]) {
  assert(!ordinarySurfaceText.includes(forbidden), `ordinary Home/Skills skill surfaces must not expose ${forbidden}`);
}

console.log("skillLibrary client tests passed");

function readFrontendFile(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}
