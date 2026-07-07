import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildHomeMcpLibraryStats,
  fallbackMcpToolHintsUnavailableText,
  filterMcpServiceItems,
  getMcpLibraryItemIdFromResource,
  getMcpLibrarySummary,
  getMcpServiceDetail,
  listMcpServiceItems,
  mapMcpServiceItemToResource,
  mcpServiceNeedsAttention,
  type McpLibrarySummary,
  type McpServiceDetail,
  type McpServiceItem
} from "./mcpLibrary";

const fallbackSummary = await getMcpLibrarySummary();
const fallbackItems = await listMcpServiceItems();

assert.equal(fallbackSummary, null);
assert.deepEqual(fallbackItems, []);
await assert.rejects(() => getMcpServiceDetail("mcp:missing"), /Tauri 桌面运行时/);
assert.equal(fallbackMcpToolHintsUnavailableText, "暂时无法判断工具列表。AIOS Desktop 不会启动服务来获取更多内容。");

const productSummary: McpLibrarySummary = {
  generatedAtMs: 1_725_300_001_000,
  latestSearchOrScanTime: 1_725_300_001_000,
  counts: {
    mcpConfigCount: 4,
    serviceCount: 6,
    verifiedServiceCount: 2,
    unverifiedServiceCount: 4,
    toolHintCount: 0,
    needsAttentionCount: 4,
    sourceUnknownCount: 1,
    configUnreadableCount: 1
  },
  metadataOnly: true,
  contentStorageEnabled: false
};

const homeStats = buildHomeMcpLibraryStats(productSummary, {
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
assert.equal(homeStats.serviceCount, 6);
assert.equal(homeStats.toolHintCount, 0);
assert.equal(homeStats.needsAttentionCount, 4);
assert.equal(homeStats.usingProductSummary, true);
assert.notEqual(homeStats.serviceCount, homeStats.viewCounts.mcp, "MCP product totals must not come from filteredResources.length or view counts");

const fallbackHomeStats = buildHomeMcpLibraryStats(null, {
  ...homeStats.viewCounts,
  mcp: 2
});
assert.equal(fallbackHomeStats.serviceCount, 2);
assert.equal(fallbackHomeStats.toolHintCount, 0);
assert.equal(fallbackHomeStats.needsAttentionCount, 0);
assert.equal(fallbackHomeStats.usingProductSummary, false);
assert.notEqual(fallbackHomeStats.serviceCount, productSummary.counts.serviceCount, "non-Tauri fallback must not fake authoritative MCP service totals");

const serviceItem: McpServiceItem = {
  id: "mcp:filesystem",
  displayName: "filesystem",
  shortPurpose: "显示本机已保存的 MCP 服务配置线索。",
  status: "needsAttention",
  sourceLabel: "多来源",
  sourceKindLabel: "多来源",
  configLocationHint: "~/.codex/mcp/filesystem.server.json",
  toolHintCount: 0,
  toolHints: [],
  safetyText: "AIOS Desktop 只显示已保存的本机 MCP 基本信息；不会启动服务、不会连接端点、不会调用 MCP 工具。",
  attentionReasons: [
    {
      code: "env-required",
      label: "需要环境变量",
      detail: "这个服务需要环境变量 FILESYSTEM_ROOT，但 AIOS Desktop 不会读取它的值。",
      severity: "medium"
    }
  ],
  commandName: "npx",
  transport: "stdio",
  requiredEnvNames: ["FILESYSTEM_ROOT"],
  remoteHostHint: null,
  updatedAt: "2024-09-05T00:00:00.000Z",
  lastSeenAt: "2024-09-05T00:00:01.000Z"
};

const mapped = mapMcpServiceItemToResource(serviceItem);
assert.equal(mapped.id, "mcp-library:mcp:filesystem");
assert.equal(mapped.capabilityType, "mcp-server");
assert.equal(mapped.zhName, "filesystem");
assert.equal(mapped.zhStatus, "需要处理");
assert.equal(mapped.metadata?.mcpLibraryItemId, "mcp:filesystem");
assert.equal(mapped.metadata?.sourceLabel, "多来源");
assert.equal(mapped.metadata?.toolHintCount, 0);
assert.equal(mapped.metadata?.toolHintsUnavailableExplanation, fallbackMcpToolHintsUnavailableText);
assert.equal(mapped.safetyProfile.readOnly, true);
assert.equal(mapped.safetyProfile.writesGlobalState, false);
assert.equal(mapped.safetyProfile.executionRisk, "low");
assert.deepEqual(mapped.prompts, []);
assert.equal(getMcpLibraryItemIdFromResource(mapped), "mcp:filesystem");
assert.equal(mcpServiceNeedsAttention(serviceItem), true);
assert(!JSON.stringify(mapped).includes("super-secret-token"));
assert(!JSON.stringify(mapped).includes("https://"));

const remoteItem: McpServiceItem = {
  ...serviceItem,
  id: "mcp:remote-api",
  displayName: "remote-api",
  status: "needsAttention",
  sourceLabel: "Codex 配置",
  sourceKindLabel: "Codex 配置",
  configLocationHint: "~/.codex/mcp/remote-api.server.json",
  commandName: null,
  transport: "http",
  requiredEnvNames: [],
  remoteHostHint: "api.example.com",
  attentionReasons: [
    {
      code: "remote-host",
      label: "可能远程连接",
      detail: "这个服务可能连接 api.example.com；AIOS Desktop 不会连接端点。",
      severity: "medium"
    }
  ]
};
const mappedRemote = mapMcpServiceItemToResource(remoteItem);
assert.equal(mappedRemote.metadata?.remoteHostHint, "api.example.com");
assert(!JSON.stringify(mappedRemote).includes("bearer"));
assert(!JSON.stringify(mappedRemote).includes("token="));

const detail: McpServiceDetail = {
  ...serviceItem,
  whatItDoes: "暂时无法判断这个服务具体提供哪些工具。",
  configSources: [
    {
      id: "resource:filesystem",
      sourceLabel: "Codex 配置",
      sourceKindLabel: "Codex 配置",
      pathHint: "~/.codex/mcp/filesystem.server.json",
      rootPathHint: "~/.codex",
      lastSeenAt: "2024-09-05T00:00:01.000Z",
      scanStatus: "completed",
      findingCount: 1,
      verified: true,
      configUnreadable: false
    }
  ],
  toolHintsUnavailableExplanation: fallbackMcpToolHintsUnavailableText,
  manualCheckSuggestions: ["请确认相关工具已经安装。"],
  safetySummary: {
    readOnly: true,
    startsServices: false,
    connectsEndpoints: false,
    callsTools: false,
    readsEnvValues: false,
    storesEnvValues: false,
    text: serviceItem.safetyText
  },
  findings: serviceItem.attentionReasons,
  safeAdvancedMetadataSummary: [{ label: "本地记录边界", value: "仅使用 AIOS Desktop 已保存的基本信息。" }]
};
assert.equal(detail.toolHintsUnavailableExplanation, fallbackMcpToolHintsUnavailableText);
assert.equal(detail.safetySummary.startsServices, false);
assert.equal(detail.safetySummary.callsTools, false);

const filteredBySource = filterMcpServiceItems([serviceItem, remoteItem], "Codex 配置");
assert.deepEqual(filteredBySource.map((item) => item.id), ["mcp:remote-api"]);
assert.equal(productSummary.counts.serviceCount, 6, "product totals remain separate from search result length");
assert.equal(filteredBySource.length, 1);

const mcpModuleSource = readFrontendFile("components/modules/McpModule.tsx");
const mcpLibrarySource = readFrontendFile("lib/mcpLibrary.ts");
for (const forbidden of ["已启动", "已连接", "调用了 MCP 工具", "resource corpus", "SQLite state", "raw scan diagnostics"]) {
  assert(!`${mcpModuleSource}\n${mcpLibrarySource}`.includes(forbidden), `ordinary MCP copy must not claim unsafe behavior or expose ${forbidden}`);
}
for (const required of ["不启动服务", "不连接端点", "不调用 MCP 工具"]) {
  assert(mcpModuleSource.includes(required) || mcpLibrarySource.includes(required), `ordinary MCP copy must include ${required}`);
}

console.log("mcpLibrary client tests passed");

function readFrontendFile(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}
