import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildMcpServiceDetailViewModel,
  buildHomeMcpLibraryStats,
  fallbackMcpToolHintsUnavailableText,
  filterMcpServiceItems,
  getMcpLibraryItemIdFromResource,
  getMcpLibrarySummary,
  getMcpServiceDetail,
  listMcpServiceItems,
  mapMcpServiceItemToResources,
  mapMcpServiceItemToResource,
  mcpServiceNeedsAttention,
  sanitizeMcpDetailLoadError,
  type McpLibrarySummary,
  type McpServiceDetail,
  type McpServiceItem
} from "./mcpLibrary";

const fallbackSummary = await getMcpLibrarySummary();
const fallbackItems = await listMcpServiceItems();

assert.equal(fallbackSummary, null);
assert.deepEqual(fallbackItems, []);
await assert.rejects(() => getMcpServiceDetail("mcp:missing"), /Tauri 桌面运行时/);
assert.equal(fallbackMcpToolHintsUnavailableText, "暂时无法读取工具列表。AIOS Desktop 不会启动服务来获取更多内容。");

const productSummary: McpLibrarySummary = {
  generatedAtMs: 1_725_300_001_000,
  latestSearchOrScanTime: 1_725_300_001_000,
  counts: {
    mcpConfigCount: 35,
    serviceCount: 50,
    verifiedServiceCount: 15,
    unverifiedServiceCount: 35,
    toolHintCount: 2,
    needsAttentionCount: 49,
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
assert.equal(homeStats.serviceCount, 50);
assert.equal(homeStats.toolHintCount, 2);
assert.equal(homeStats.needsAttentionCount, 49);
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

const serviceAndToolResources = mapMcpServiceItemToResources({
  ...serviceItem,
  toolHintCount: 2,
  toolHints: [
    { name: "read_file", purpose: "已保存的工具名称线索。", serviceLabel: "filesystem", status: "unverified" },
    { name: "write_file", purpose: "已保存的工具名称线索。", serviceLabel: "filesystem", status: "unverified" }
  ]
});
assert.equal(serviceAndToolResources.length, 3);
assert.equal(serviceAndToolResources[0].capabilityType, "mcp-server");
assert.deepEqual(
  serviceAndToolResources.slice(1).map((resource) => resource.capabilityType),
  ["mcp-client", "mcp-client"]
);
assert.deepEqual(
  serviceAndToolResources.slice(1).map((resource) => resource.metadata?.mcpLibraryItemId),
  [serviceItem.id, serviceItem.id]
);
assert.equal(getMcpLibraryItemIdFromResource(serviceAndToolResources[1]), serviceItem.id, "tool rows must open the parent MCP service detail");
assert(!JSON.stringify(serviceAndToolResources).includes("super-secret-token"));

const visibleMissingToolListItem: McpServiceItem = {
  ...serviceItem,
  id: "mcp:visible-missing-tools",
  status: "visible",
  commandName: "node",
  requiredEnvNames: [],
  attentionReasons: [
    {
      code: "missing-tool-list",
      label: "工具列表不可用",
      detail: fallbackMcpToolHintsUnavailableText,
      severity: "low"
    }
  ]
};
assert.equal(mcpServiceNeedsAttention(visibleMissingToolListItem), true, "visible services still need attention when product detail flags a missing tool list");

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

const detailModel = buildMcpServiceDetailViewModel({
  detail,
  error: null,
  fallbackItem: serviceItem,
  loading: false
});
assert.equal(detailModel.mode, "ready");
assert.equal(detailModel.title, "filesystem");
assert.equal(detailModel.whatItDoes, "暂时无法判断这个服务具体提供哪些工具。");
assert.equal(detailModel.statusText, "需要处理");
assert.equal(detailModel.sourceText, "多来源");
assert.equal(detailModel.configLocationText, "~/.codex/mcp/filesystem.server.json");
assert.equal(detailModel.toolHintsText, fallbackMcpToolHintsUnavailableText);
assert.equal(detailModel.safetyText, serviceItem.safetyText);
assert.equal(detailModel.commandNameText, "npx");
assert.equal(detailModel.requiredEnvNamesText, "FILESYSTEM_ROOT");
assert.equal(detailModel.remoteHostText, "暂时无法判断");
assert.equal(detailModel.manualCheckSuggestions[0], "请确认相关工具已经安装。");
assert.equal(detailModel.configSources.length, 1);
assert.equal(detailModel.advancedRows[0]?.label, "本地记录边界");
assert(!Object.keys(detailModel).includes("visibleCount"));
assert(!JSON.stringify(detailModel).includes("super-secret-token"));

const toolHintDetailModel = buildMcpServiceDetailViewModel({
  detail: {
    ...detail,
    toolHintCount: 2,
    toolHints: [
      { name: "read_file", purpose: "已保存的工具名称线索。", serviceLabel: "filesystem", status: "unverified" },
      { name: "write_file", purpose: "已保存的工具名称线索。", serviceLabel: "filesystem", status: "unverified" }
    ],
    toolHintsUnavailableExplanation: "",
    whatItDoes: "显示已保存的工具名称线索：read_file、write_file。"
  },
  error: null,
  fallbackItem: null,
  loading: false
});
assert.equal(toolHintDetailModel.toolHintsText, "read_file、write_file");
assert(!toolHintDetailModel.toolHintsText.includes("2 个"), "tool detail must show names, not fake counts");

const unsafeDetailModel = buildMcpServiceDetailViewModel({
  detail: {
    ...detail,
    configLocationHint: "/Users/example/secret-token-root/.env",
    commandName: "node --token=super-secret-token",
    requiredEnvNames: ["FILESYSTEM_ROOT=super-secret-token"],
    remoteHostHint: "https://bearer-token:super-secret-token@api.example.com/path?token=super-secret-token",
    attentionReasons: [
      {
        code: "unsafe-fixture",
        label: "需要查看",
        detail: "raw log stderr stack trace bearer super-secret-token",
        severity: "high"
      }
    ],
    findings: [
      {
        code: "unsafe-finding",
        label: "需要查看",
        detail: "stdout token=super-secret-token",
        severity: "high"
      }
    ],
    configSources: [
      {
        ...detail.configSources[0],
        pathHint: "/Users/example/secret-token-root/.env",
        rootPathHint: "/Users/example/secret-token-root"
      }
    ],
    safeAdvancedMetadataSummary: [
      { label: "命令", value: "node --token=super-secret-token" },
      { label: "日志", value: "stderr stack trace bearer super-secret-token" }
    ]
  },
  error: null,
  fallbackItem: null,
  loading: false
});
assertNoUnsafeMcpCopy(JSON.stringify(unsafeDetailModel));

const unsafeMapped = mapMcpServiceItemToResource({
  ...serviceItem,
  configLocationHint: "/Users/example/secret-token-root/.env",
  commandName: "node --token=super-secret-token",
  requiredEnvNames: ["FILESYSTEM_ROOT=super-secret-token"],
  remoteHostHint: "https://bearer-token:super-secret-token@api.example.com/path?token=super-secret-token",
  attentionReasons: [
    {
      code: "unsafe-fixture",
      label: "需要查看",
      detail: "raw log stderr stack trace bearer super-secret-token",
      severity: "high"
    }
  ]
});
assertNoUnsafeMcpCopy(JSON.stringify(unsafeMapped));

const fallbackDetailModel = buildMcpServiceDetailViewModel({
  detail: null,
  error: sanitizeMcpDetailLoadError(new Error("/Users/example/secret-token-root token=super-secret-token")),
  fallbackItem: serviceItem,
  loading: false
});
assert.equal(fallbackDetailModel.mode, "unavailable");
assert.equal(fallbackDetailModel.title, "filesystem");
assert.equal(fallbackDetailModel.toolHintsText, fallbackMcpToolHintsUnavailableText);
assert.equal(fallbackDetailModel.notice, "无法读取 MCP 服务详情。请在高级信息里查看来源。");
assert(!JSON.stringify(fallbackDetailModel).includes("/Users/example"));
assert(!JSON.stringify(fallbackDetailModel).includes("super-secret-token"));

const filteredBySource = filterMcpServiceItems([serviceItem, remoteItem], "Codex 配置");
assert.deepEqual(filteredBySource.map((item) => item.id), ["mcp:remote-api"]);
assert.equal(productSummary.counts.serviceCount, 50, "product totals remain separate from search result length");
assert.equal(filteredBySource.length, 1);

const mcpModuleSource = readFrontendFile("components/modules/McpModule.tsx");
const mcpLibrarySource = readFrontendFile("lib/mcpLibrary.ts");
const mcpDetailInspectorSource = readFrontendFile("components/inspector/McpServiceDetailInspector.tsx");
const appSource = readFrontendFile("App.tsx");
const resourceInspectorSource = readFrontendFile("components/inspector/ResourceInspector.tsx");
for (const forbidden of ["已启动", "已连接", "调用了 MCP 工具", "resource corpus", "SQLite state", "raw scan diagnostics"]) {
  assert(!`${mcpModuleSource}\n${mcpLibrarySource}\n${mcpDetailInspectorSource}`.includes(forbidden), `ordinary MCP copy must not claim unsafe behavior or expose ${forbidden}`);
}
for (const required of ["不启动服务", "不连接端点", "不调用 MCP 工具"]) {
  assert(mcpModuleSource.includes(required) || mcpLibrarySource.includes(required) || mcpDetailInspectorSource.includes(required), `ordinary MCP copy must include ${required}`);
}
assert(appSource.includes("getMcpServiceDetail(productMcpServiceId)"), "product MCP selection must fetch detail from the product API");
assert(resourceInspectorSource.includes("McpServiceDetailInspector"), "product MCP resources must use the dedicated MCP detail inspector");
for (const forbiddenDependency of ["getResourceDisplay", "buildSkillDisplayEnrichment", "filteredResources.length", "visibleCount"]) {
  assert(!`${mcpDetailInspectorSource}\n${mcpLibrarySource}`.includes(forbiddenDependency), `MCP product detail must not rely on generic resource enrichment or ${forbiddenDependency}`);
}

const mcpServiceRowSource = readFrontendFile("components/resources/McpServiceRow.tsx");
assert(!mcpModuleSource.includes("AiosAccordionPanel"), "MCP service list must not use heavy accordion groups");
assert(mcpModuleSource.includes("mcp-service-list"), "MCP module must render a deterministic service list");
assert(mcpModuleSource.includes("McpServiceRow"), "MCP module must render dedicated service rows");
assert(mcpModuleSource.includes("showToolHints"), "MCP tool hints must be rendered as subordinate rows");
assert(mcpServiceRowSource.includes("mapMcpServiceItemToResource"), "MCP service rows must map to real service items");
assert(mcpServiceRowSource.includes("fallbackMcpToolHintsUnavailableText"), "MCP service rows must surface static/unverified tool hint copy");
assert(mcpLibrarySource.includes('"unverified"'), "MCP tool hints must remain marked as unverified in the library mapper");
assert(mcpModuleSource.includes("没有匹配结果"), "MCP must show a user-friendly search-empty state");

console.log("mcpLibrary client tests passed");

function readFrontendFile(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function assertNoUnsafeMcpCopy(value: string): void {
  for (const forbidden of ["super-secret-token", "secret-token-root", "token=", "bearer-token", "Bearer", "raw log", "stdout", "stderr", "stack trace", "https://", "node --"]) {
    assert(!value.includes(forbidden), `MCP frontend copy must not expose unsafe fixture text: ${forbidden}`);
  }
}
