import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fallbackResourceCorpusSummary, globalCorpusScope } from "../../lib/resourceCorpus";
import type { AiosModuleProps } from "./moduleUtils";

function setupSsrEnvironment() {
  if (typeof globalThis.window === "undefined") {
    (globalThis as unknown as Record<string, unknown>).window = {
      matchMedia: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false
      })
    };
  }
}

setupSsrEnvironment();

const { DashboardModule } = await import("./DashboardModule");

const emptyViewCounts: AiosModuleProps["viewCounts"] = {
  dashboard: 0,
  skills: 0,
  mcp: 0,
  advanced: 0,
  "custom-scan": 0,
  scripts: 0,
  reports: 0,
  "project-packs": 0,
  policies: 0,
  validators: 0,
  legacy: 0
};

const emptySkillSummary = {
  generatedAtMs: 0,
  latestScanAtMs: null,
  latestSuccessfulScanAtMs: null,
  counts: {
    totalSkillCandidates: 0,
    dedupedSkillCount: 0,
    availableSkillCount: 0,
    needsAttentionCount: 0,
    duplicateCount: 0,
    brokenCount: 0,
    sourceUnknownCount: 0,
    uncheckedCount: 0
  },
  metadataOnly: true,
  contentStorageEnabled: false
};

const emptyMcpSummary = {
  generatedAtMs: 0,
  latestSearchOrScanTime: null,
  counts: {
    mcpConfigCount: 0,
    serviceCount: 0,
    verifiedServiceCount: 0,
    unverifiedServiceCount: 0,
    toolHintCount: 0,
    needsAttentionCount: 0,
    sourceUnknownCount: 0,
    configUnreadableCount: 0
  },
  metadataOnly: true,
  contentStorageEnabled: false
};

const populatedSkillSummary = {
  ...emptySkillSummary,
  generatedAtMs: 1_725_100_001_000,
  latestScanAtMs: 1_725_100_001_000,
  latestSuccessfulScanAtMs: 1_725_100_001_000,
  counts: {
    ...emptySkillSummary.counts,
    totalSkillCandidates: 9,
    dedupedSkillCount: 7,
    availableSkillCount: 5,
    needsAttentionCount: 2
  }
};

const populatedMcpSummary = {
  ...emptyMcpSummary,
  generatedAtMs: 1_725_300_001_000,
  latestSearchOrScanTime: 1_725_300_001_000,
  counts: {
    ...emptyMcpSummary.counts,
    mcpConfigCount: 3,
    serviceCount: 4,
    unverifiedServiceCount: 4,
    toolHintCount: 6,
    needsAttentionCount: 1
  }
};

function buildProps(overrides: Partial<AiosModuleProps> = {}): AiosModuleProps {
  return {
    allResources: [],
    baseline: {
      aiosRoot: "",
      appSourcePath: "",
      generatedAt: "",
      policyHash: null,
      canonicalSkillCount: 0,
      codexTopLevelCount: 0,
      codexActiveUserSkillCount: 0,
      agentsActiveUserSkillCount: 0,
      claudeSkillCount: null,
      customSkillRouterCodex: false,
      customSkillRouterAgents: false,
      codexAutomationDirectoryState: { exists: false, isDirectory: false, entryCount: 0, summary: "目录缺失" },
      validators: [],
      knownWarnings: []
    },
    resourceCorpus: {
      activeScope: globalCorpusScope,
      dataSource: {
        activeSource: "empty",
        dynamicResourceCount: 0,
        legacySnapshotCount: 0,
        hasDynamicCorpus: false,
        hasLegacySnapshot: false,
        displayLabel: "还没有查找"
      },
      error: null,
      firstRunOnboardingDismissed: false,
      loading: false,
      mode: "empty",
      projectMap: [
        {
          scopeId: "project:fake",
          projectLabel: "fake-project-from-path",
          resourceCount: 99,
          directories: [{
            scanSourceId: "source:fake",
            displayName: "fake",
            rootDisplayPath: "/fake/path",
            profileId: "fake",
            sourceKind: "manual",
            enabled: true,
            resourceCount: 99,
            skippedEntries: 0,
            errorCount: 0,
            lastScanStatus: null,
            lastScanFinishedAtMs: null
          }],
          countsByKind: [],
          lastScanStatus: null,
          lastScanFinishedAtMs: null,
          skippedEntries: 0,
          errorCount: 0,
          metadataOnly: true
        }
      ],
      onSetFirstRunOnboardingDismissed: () => undefined,
      onScopeChange: () => undefined,
      refresh: () => undefined,
      scanSourceMap: [],
      scopes: [globalCorpusScope],
      summary: fallbackResourceCorpusSummary
    },
    mcpLibrary: {
      summary: emptyMcpSummary,
      items: [],
      loading: false,
      error: null,
      available: true
    },
    skillLibrary: {
      summary: emptySkillSummary,
      items: [],
      loading: false,
      error: null,
      available: true
    },
    displayById: new Map(),
    query: "",
    resources: [],
    selectedId: null,
    skillCapabilityById: new Map(),
    viewCounts: emptyViewCounts,
    onBack: () => undefined,
    onClearSelection: () => undefined,
    onSelect: () => undefined,
    onViewChange: () => undefined,
    onQueryChange: () => undefined,
    ...overrides
  };
}

function renderDashboard(props: AiosModuleProps): string {
  const originalStderr = process.stderr.write.bind(process.stderr);
  process.stderr.write = () => true;
  try {
    return renderToStaticMarkup(createElement(DashboardModule, props));
  } finally {
    process.stderr.write = originalStderr;
  }
}

function assertContains(html: string, expected: string, message: string) {
  assert(html.includes(expected), `${message}: expected to find "${expected}"`);
}

function assertNotContains(html: string, unexpected: string, message: string) {
  assert(!html.includes(unexpected), `${message}: expected not to find "${unexpected}"`);
}

{
  const html = renderDashboard(buildProps());

  assertContains(html, "开始查找", "Hero must render the primary action");
  assertContains(html, "手动选择文件夹", "Hero must render the secondary action");
  assertContains(html, "本地整理的内容", "Home must render the local overview section");
  assertContains(html, "已整理", "Local overview must describe skill totals as organized");
  assertContains(html, "已记录", "Local overview must describe MCP totals as recorded");
  assertContains(html, "这些数字来自 AIOS Desktop 已保存的本地记录", "Local overview must explain data comes from local records");
  assertContains(html, "不代表整台电脑的完整发现", "Local overview must not claim full-computer discovery");
  assertContains(html, "项目能力", "Home must render the project capability section");
  assertContains(html, "暂未整理项目级 AI 能力", "Project section must show the honest unavailable state");
  assertContains(html, "AIOS 当前还不能可靠地区分项目专属的技能和 MCP 服务", "Project section must explain why project capability is unavailable");
  assertContains(html, "查看全部技能", "Home must render the Skills entry");
  assertContains(html, "查看全部 MCP 服务", "Home must render the MCP entry");
  assertContains(html, "来自本地配置记录", "MCP entry must describe MCP records as local configuration records");
  assertContains(html, "工具名称线索未经实时连接验证", "MCP entry must state tool hints are unverified");
  assertContains(html, "结果只保存在这台电脑上", "Privacy section must preserve the local-only promise");
  assertContains(html, "不会读取密钥、令牌、密码、浏览器 Cookie 或登录会话", "Privacy section must preserve the sensitive-data promise");
  assertContains(html, "不会运行本机命令", "Privacy section must preserve the no-execution promise");
  assertContains(html, "也不会启动 MCP 服务或调用 MCP 工具", "Privacy section must preserve the no-mcp-runtime promise");

  assertNotContains(html, "需要处理", "P6C Home must not render an Attention section");
  assertNotContains(html, "needsAttentionCount", "P6C Home must not expose needsAttentionCount in markup");
  assertNotContains(html, "fake-project-from-path", "Home must ignore injected projectMap entries");
  assertNotContains(html, "/fake/path", "Home must not render project paths");
  assertNotContains(html, "本机 AI 能力概览", "Home must not use the old analytics heading");
  assertNotContains(html, "电脑-wide", "Home must not describe aggregates as computer-global");
  assertNotContains(html, "全电脑", "Home must not describe aggregates as full-computer");
}

{
  const viewed: string[] = [];
  const props = buildProps({
    skillLibrary: { summary: populatedSkillSummary, items: [], loading: false, error: null, available: true },
    mcpLibrary: { summary: populatedMcpSummary, items: [], loading: false, error: null, available: true },
    onViewChange: (view) => viewed.push(view)
  });
  const html = renderDashboard(props);

  assertContains(html, "7", "Local overview must show the product-level skill total");
  assertContains(html, "4", "Local overview must show the product-level MCP service total");
  assertContains(html, "6", "Local overview must show the product-level tool hint total");
  assertContains(html, "7 个已整理的技能", "Skills entry must show the product-level skill total");
  assertContains(html, "4 个已记录的服务", "MCP entry must show the product-level service total");
  assertContains(html, "6 个工具名称线索", "MCP entry must show the product-level tool hint total");
  assertNotContains(html, "2 个需要处理", "Skills entry must not expose needsAttentionCount");
  assertNotContains(html, "1 个需要处理", "MCP entry must not expose needsAttentionCount");
}

console.log("DashboardModule P6C tests passed");
