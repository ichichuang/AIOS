import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  advancedSupportCards,
  advancedSupportSectionLabels,
  advancedSupportViews,
  advancedSubviewBackLabels,
  buildProductShellTopBarSummary,
  getAdvancedSubviewParent,
  getPrimaryNavigationView,
  homeCopy,
  homeFirstRunGuideCopy,
  primaryNavigationViews,
  resolvePrimaryNavigationSearch,
  topSearchCopy
} from "./productShell";
import { canStartScanMode, scanModeChangeStartsScan } from "./customDirectoryScan";
import { buildHomeMcpLibraryStats, type McpLibrarySummary } from "./mcpLibrary";
import { LOCAL_DATA_RESET_WARNING_COPY, WHAT_AIOS_NEVER_STORES_COPY } from "./resourceStore";
import { buildHomeSkillLibraryStats, type SkillLibrarySummary } from "./skillLibrary";
import { zhCN } from "../i18n/zh-CN";
import { navigationGroups } from "../components/shell/moduleConfig";
import { layoutCssVariableNames } from "./layoutMetrics";
import { fallbackResourceCorpusSummary } from "./resourceCorpus";

const oldFirstLevelViews = ["custom-scan", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];
const oldFirstClassLabels = ["Scripts", "Reports", "Project Packs", "Policies", "Validators", "Legacy", "脚本", "报告", "项目包", "策略", "验证器", "旧入口"];
const forbiddenOrdinaryTerms = [
  "resource corpus",
  "SQLite state",
  "raw scan diagnostics",
  "governance",
  "validators",
  "policies",
  "scripts",
  "reports",
  "project packs",
  "legacy",
  "runtime view",
  "registry",
  "scan scope",
  "full-disk discovery"
];
const forbiddenOrdinaryChineseTerms = ["注册表", "运行时视图", "项目包", "旧入口示例", "SQLite 元数据", "策略治理"];

assert.deepEqual(primaryNavigationViews, ["dashboard", "skills", "mcp", "advanced"]);
assert.deepEqual(navigationGroups.flatMap((group) => group.views), primaryNavigationViews);
assert.equal(zhCN.views.dashboard, "首页");
assert.equal(zhCN.views.skills, "技能");
assert.equal(zhCN.views.mcp, "MCP");
assert.equal(zhCN.views.advanced, "高级");

for (const view of oldFirstLevelViews) {
  assert(!primaryNavigationViews.includes(view as never), `${view} must not be a first-level navigation item`);
  assert.equal(getPrimaryNavigationView(view as never), "advanced", `${view} must highlight Advanced`);
  assert.equal(getAdvancedSubviewParent(view as never), "advanced", `${view} must belong to Advanced`);
  assert.equal(advancedSubviewBackLabels[view as never], "返回高级", `${view} must have a back label`);
}

assert.deepEqual(advancedSupportViews, oldFirstLevelViews);
assert.deepEqual(
  advancedSupportCards.map((card) => card.view),
  oldFirstLevelViews
);
assert(advancedSupportCards.every((card) => card.description.includes("高级支持")), "advanced cards must frame old modules as support views");
assert(advancedSupportCards.every((card) => card.section in advancedSupportSectionLabels), "every advanced card must be grouped into a known section");
assert.deepEqual(Object.values(advancedSupportSectionLabels), ["查找位置", "本地记录与隐私", "开发者诊断", "旧入口与兼容信息"]);
assert.deepEqual(
  new Set(advancedSupportCards.map((card) => card.section)),
  new Set(["search", "records", "diagnostics", "compatibility"])
);

const ordinaryHomePrimaryText = [homeCopy.title, homeCopy.summary, ...homeCopy.primaryActions.map((action) => action.label)].join(" ");
const ordinaryHomeText = [ordinaryHomePrimaryText, ...homeCopy.safetyReminders].join(" ");
assert.match(ordinaryHomeText, /查看这台电脑上的 AI 技能和 MCP 工具/);
assert.match(ordinaryHomeText, /开始查找/);
assert.match(ordinaryHomeText, /手动选择文件夹/);
assert.match(ordinaryHomeText, /结果只保存在这台电脑上/);
assert.equal(homeCopy.primaryActions.length, 2);
assert.equal(homeCopy.primaryActions[0].action, "open-first-run-guide", "Home primary action must open the first-run guide instead of raw Advanced navigation");
assert.equal(homeCopy.primaryActions[1].action, "open-folder-selection-guide", "Home folder action must open the guided folder-selection step");
assert(!("targetView" in homeCopy.primaryActions[0]), "Home primary action must not encode raw Advanced routing");
assert(!("targetView" in homeCopy.primaryActions[1]), "Home folder action must not encode raw Advanced routing");
for (const label of oldFirstClassLabels) {
  assert(!ordinaryHomeText.includes(label), `Home copy must not expose ${label} as ordinary UI`);
}

const ordinarySkillsText = `${zhCN.moduleSummaries.skills} ${zhCN.views.skills}`;
const ordinaryMcpText = `${zhCN.moduleSummaries.mcp} ${zhCN.views.mcp}`;
const ordinaryCustomScanText = `${zhCN.moduleSummaries["custom-scan"]} ${zhCN.views["custom-scan"]}`;
for (const term of forbiddenOrdinaryTerms) {
  assert(!ordinaryHomePrimaryText.toLowerCase().includes(term), `Home primary copy must not include "${term}"`);
  assert(!ordinarySkillsText.toLowerCase().includes(term), `Skills primary copy must not include "${term}"`);
  assert(!ordinaryMcpText.toLowerCase().includes(term), `MCP primary copy must not include "${term}"`);
}
for (const term of forbiddenOrdinaryChineseTerms) {
  assert(!ordinaryHomePrimaryText.includes(term), `Home primary copy must not include "${term}"`);
  assert(!ordinarySkillsText.includes(term), `Skills primary copy must not include "${term}"`);
  assert(!ordinaryMcpText.includes(term), `MCP primary copy must not include "${term}"`);
}

assert(!/resource corpus|SQLite state|raw scan diagnostics|模块切换|风险/.test(`${topSearchCopy.placeholder} ${topSearchCopy.ariaLabel}`));
assert.equal(topSearchCopy.placeholder, "搜索技能、MCP 和来源");
assert.equal(topSearchCopy.ariaLabel, "搜索技能、MCP 和来源");
assert.equal(resolvePrimaryNavigationSearch("首页"), "dashboard");
assert.equal(resolvePrimaryNavigationSearch("skills"), "skills");
assert.equal(resolvePrimaryNavigationSearch("MCP"), "mcp");
assert.equal(resolvePrimaryNavigationSearch("高级 advanced"), "advanced");
assert.equal(resolvePrimaryNavigationSearch("scripts"), null);
assert.equal(resolvePrimaryNavigationSearch("validators"), null);

assert.equal(scanModeChangeStartsScan(), false);
assert.equal(canStartScanMode("advanced-full-disk", { hasSelectedSources: false, advancedConfirmed: false, tauriAvailable: true, scanLocked: false }), false);
assert.match(WHAT_AIOS_NEVER_STORES_COPY, /密钥/);
assert.match(LOCAL_DATA_RESET_WARNING_COPY, /不会删除用户文件/);

const shellViewCounts = {
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
const shellSkillSummary: SkillLibrarySummary = {
  generatedAtMs: 1_725_100_001_000,
  latestScanAtMs: 1_725_100_001_000,
  latestSuccessfulScanAtMs: 1_725_100_001_000,
  counts: {
    totalSkillCandidates: 9,
    dedupedSkillCount: 7,
    availableSkillCount: 5,
    needsAttentionCount: 2,
    duplicateCount: 1,
    brokenCount: 1,
    sourceUnknownCount: 0,
    uncheckedCount: 0
  },
  metadataOnly: true,
  contentStorageEnabled: false
};
const shellMcpSummary: McpLibrarySummary = {
  generatedAtMs: 1_725_300_001_000,
  latestSearchOrScanTime: 1_725_300_001_000,
  counts: {
    mcpConfigCount: 3,
    serviceCount: 4,
    verifiedServiceCount: 0,
    unverifiedServiceCount: 4,
    toolHintCount: 6,
    needsAttentionCount: 1,
    sourceUnknownCount: 0,
    configUnreadableCount: 0
  },
  metadataOnly: true,
  contentStorageEnabled: false
};
const homeSkillStats = buildHomeSkillLibraryStats(shellSkillSummary, fallbackResourceCorpusSummary, shellViewCounts);
const homeMcpStats = buildHomeMcpLibraryStats(shellMcpSummary, shellViewCounts);
const dashboardTopBarSummary = buildProductShellTopBarSummary({
  activeView: "dashboard",
  corpusSourceLabel: "还没有查找",
  mcpSummary: shellMcpSummary,
  shownCount: 0,
  skillSummary: shellSkillSummary
});
assert.equal(homeSkillStats.skillCount, 7);
assert.equal(homeMcpStats.serviceCount, 4);
assert.equal(dashboardTopBarSummary.sourceLabel, "本机结果");
assert.match(dashboardTopBarSummary.detailLabel, /7 个技能/);
assert.match(dashboardTopBarSummary.detailLabel, /4 个 MCP 服务/);
assert.match(dashboardTopBarSummary.detailLabel, /6 个工具线索/);
assert(!dashboardTopBarSummary.detailLabel.includes("0 项"), "Home top command bar must not show legacy 0-count state when product data exists");
assert.equal(
  buildProductShellTopBarSummary({ activeView: "skills", corpusSourceLabel: "还没有查找", mcpSummary: shellMcpSummary, shownCount: 0, skillSummary: shellSkillSummary }).detailLabel,
  "7 个技能 · 2 个需要处理"
);
assert.equal(
  buildProductShellTopBarSummary({ activeView: "mcp", corpusSourceLabel: "还没有查找", mcpSummary: shellMcpSummary, shownCount: 0, skillSummary: shellSkillSummary }).detailLabel,
  "4 个 MCP 服务 · 6 个工具线索 · 1 个需要处理"
);
assert.equal(
  buildProductShellTopBarSummary({ activeView: "dashboard", corpusSourceLabel: "还没有查找", mcpSummary: null, shownCount: 0, skillSummary: null }).detailLabel,
  "暂无技能或 MCP 结果"
);

const homeGuideSafetyText = [homeFirstRunGuideCopy.safetyLine, ...homeFirstRunGuideCopy.safetyCommitments].join(" ");
assert(homeGuideSafetyText.includes("AIOS 只在本机整理元数据"), "Home guide must explain local metadata-only organization");
assert(homeGuideSafetyText.includes("不上传数据"), "Home guide must state data is not uploaded");
assert(homeGuideSafetyText.includes("不读取密钥、token、密码或会话"), "Home guide must use ordinary sensitive-data wording");
assert(homeGuideSafetyText.includes("不启动 MCP 服务"), "Home guide must state MCP services are not started");
assert(homeGuideSafetyText.includes("不调用 MCP 工具"), "Home guide must state MCP tools are not called");
assert(homeGuideSafetyText.includes("不扫描全盘或系统目录"), "Home guide must state broad/system scans are not performed");

assert(ordinaryCustomScanText.includes("高级支持"), "custom-scan summary must be framed as advanced support");
assert(!ordinaryCustomScanText.toLowerCase().includes("SQLite"), "custom-scan summary must not expose SQLite on ordinary pages");

assert.deepEqual(layoutCssVariableNames, [
  "--aios-viewport-height",
  "--aios-module-height",
  "--aios-module-content-height",
  "--aios-module-scroll-body-height",
  "--aios-module-fixed-content-height",
  "--aios-topbar-height",
  "--aios-scopebar-height",
  "--aios-module-header-height",
  "--aios-module-content-padding-block"
]);

const customScanModuleSource = readFile("components/modules/CustomScanModule.tsx");
const dashboardModuleSource = readFile("components/modules/DashboardModule.tsx");
const skillsModuleSource = readFile("components/modules/SkillsModule.tsx");
const mcpModuleSource = readFile("components/modules/McpModule.tsx");
const advancedModuleSource = readFile("components/modules/AdvancedModule.tsx");
const advancedOnlyModuleFilenames: Record<string, string> = {
  "custom-scan": "CustomScanModule.tsx",
  scripts: "ScriptsModule.tsx",
  reports: "ReportsModule.tsx",
  "project-packs": "ProjectPacksModule.tsx",
  policies: "PoliciesModule.tsx",
  validators: "ValidatorsModule.tsx",
  legacy: "LegacyModule.tsx"
};
const advancedOnlyModuleSources = new Map(
  oldFirstLevelViews.map((view) => [view, readFile(`components/modules/${advancedOnlyModuleFilenames[view]}`)])
);
const primitivesSource = readFile("components/ui/AiosUiPrimitives.tsx");
const productShellSource = readFile("lib/productShell.ts");
const topCommandBarSource = readFile("components/shell/AiosTopCommandBar.tsx");
const motionSource = readFile("lib/useAiosMotion.ts");
const stylesSource = readFile("styles.css");
const themeSource = readFile("theme/materialTheme.ts");
const skillIdentitySource = readFile("lib/skillIdentityModel.ts");
const skillRequirementsSource = readProjectFile("docs/product/06-skill-library-requirements.zh-CN.md");
const mcpRequirementsSource = readProjectFile("docs/product/07-mcp-library-requirements.zh-CN.md");
const acceptanceSource = readProjectFile("docs/product/09-product-acceptance-criteria.zh-CN.md");

assert(customScanModuleSource.includes("renderBackButton(\"custom-scan\""), "custom-scan must render the Advanced back arrow");
assert(!customScanModuleSource.includes("AiosTabBar"), "custom-scan must not use the rejected AiosTabBar");
assert(!customScanModuleSource.includes("AiosTabPanel"), "custom-scan must not use the rejected AiosTabPanel");
assert(customScanModuleSource.includes("custom-scan-workspace"), "custom-scan must use a two-pane workspace");
assert(customScanModuleSource.includes("AiosAccordionPanel"), "custom-scan must keep accordion sections");
assert(customScanModuleSource.includes("data-aios-internal-scroll=\"true\""), "custom-scan must expose an internal scroll container");
assert(!customScanModuleSource.includes("contentHeight - 140"), "custom-scan must not use magic height subtraction");

assert(productShellSource.includes("homeFirstRunGuideCopy"), "productShell must expose testable Home first-run guide copy");
assert(productShellSource.includes("开始查找本机 AI 技能"), "Home guide title must be ordinary-user oriented");
assert(productShellSource.includes("AIOS 会查找这台电脑上的 AI 技能和 MCP 工具的基本信息"), "Home guide must say what AIOS will find");
assert(productShellSource.includes("查找结果只保存在这台电脑上"), "Home guide must state local-only results");
assert(productShellSource.includes("不读取密钥、令牌、密码、Cookie、登录会话或环境变量的值"), "Home guide must state sensitive values are not read");
assert(productShellSource.includes("不执行脚本，也不启动或调用 MCP 工具"), "Home guide must state scripts and MCP tools are not run");
assert(productShellSource.includes("添加文件夹不会自动扫描"), "Home guide must state folder adding does not auto-scan");
assert(productShellSource.includes("继续到查找位置") && !productShellSource.includes("继续到查找位置并开始扫描"), "Home guide next step must not imply that navigation starts scanning");
assert(!/resource corpus|SQLite state|raw scan diagnostics|governance|validators|policies|scripts|reports|project packs|legacy|runtime view|registry|scan scope|full-disk discovery/i.test(productShellSource.match(/homeFirstRunGuideCopy[\s\S]*?};/)?.[0] ?? ""), "Home guide copy must not expose banned first-class technical terms");

assert(dashboardModuleSource.includes("Dialog"), "Home start action must render a first-run guide dialog");
assert(!dashboardModuleSource.includes("onClick={() => onViewChange(\"advanced\")}"), "Home CTA buttons must not route directly to raw Advanced");
assert(dashboardModuleSource.includes("addScanSources("), "Home folder-selection step must reuse the existing addScanSources client");
assert(!dashboardModuleSource.includes("startScanSourcesBatch"), "Home guide must not start scanning automatically");
assert(dashboardModuleSource.includes("onViewChange(\"custom-scan\")"), "Home guide must offer a next-step route to 查找位置");
assert(dashboardModuleSource.includes("查看查找位置") && !dashboardModuleSource.includes("并开始扫描"), "Home dialog actions must not imply automatic scanning");
assert(topCommandBarSource.includes("summary.detailLabel"), "top command bar must render product summary details instead of a legacy shownCount-only label");
assert(!topCommandBarSource.includes("{shownCount} 项"), "top command bar must not hard-code a legacy item count suffix");

assert(skillsModuleSource.includes("contentClassName=\"skills-module-scroll\""), "Skills must use a measured module content class");
assert(!skillsModuleSource.includes("AiosTabBar"), "Skills must not use the rejected AiosTabBar");
assert(!skillsModuleSource.includes("AiosTabPanel"), "Skills must not use the rejected AiosTabPanel");
assert(skillsModuleSource.includes("AiosSectionRail"), "Skills library workspace must use a category rail");
assert(skillsModuleSource.includes("AiosSegmentedSwitcher"), "Skills must use a segmented switcher");
assert(skillsModuleSource.includes("data-aios-internal-scroll=\"true\""), "Skills must expose a measured internal list scroll container");
assert(skillsModuleSource.includes("productVirtualListHeight"), "Skills virtual rows must use a deterministic measured height");
assert(skillsModuleSource.includes("shouldShowProductRowsMismatchDiagnostic"), "Skills must diagnose summary-count/list-row mismatches");

assert(mcpModuleSource.includes("contentClassName=\"mcp-module-scroll\""), "MCP must use a measured module content class");
assert(!mcpModuleSource.includes("AiosTabBar"), "MCP must not use the rejected AiosTabBar");
assert(!mcpModuleSource.includes("AiosTabPanel"), "MCP must not use the rejected AiosTabPanel");
assert(!mcpModuleSource.includes("AiosSegmentedSwitcher"), "MCP must not use the rejected horizontal switcher band");
assert(mcpModuleSource.includes("AiosSectionRail"), "MCP service workspace must use the accepted section rail pattern");
assert(mcpModuleSource.includes("mcp-service-workspace"), "MCP must expose a polished service workspace");
assert(mcpModuleSource.includes("mcp-service-overview"), "MCP must expose a compact service overview");
assert(mcpModuleSource.includes("mcp-browser-panel"), "MCP resources and empty state must sit inside a balanced internal panel");
assert(mcpModuleSource.includes("data-aios-internal-scroll=\"true\""), "MCP must expose an internal scroll container");
assert(mcpModuleSource.includes("useContentPanelSwapMotion"), "MCP section changes must use panel motion");
assert(mcpModuleSource.includes("AiosContentPanel"), "MCP must keep section content inside the shared content panel primitive");
assert(mcpModuleSource.includes("McpServiceRow"), "MCP default browsing must render service-first rows");
assert(!mcpModuleSource.includes("McpClientHintRow"), "MCP default list must not render separate selectable tool rows");
assert(mcpModuleSource.includes("mcp-service-list"), "MCP must expose a deterministic service-first list");
assert(!mcpModuleSource.includes("groupMcpItemsByStatus"), "MCP default grouping must not be status-first");
assert(!/resource corpus|SQLite state|raw scan diagnostics|governance|validators|policies|scripts|reports|project packs|legacy|runtime view|registry|scan scope|full-disk discovery/i.test(mcpModuleSource), "MCP ordinary page must not expose banned technical terms as first-class copy");

assert(skillRequirementsSource.includes("默认浏览按任务和功能分类"), "Skills source of truth must preserve category-first browsing");
assert(skillRequirementsSource.includes("来源只作为筛选、详情来源说明和高级来源视图"), "Skills source of truth must keep source as a secondary facet");
assert(!skillRequirementsSource.includes("默认分组按用户能理解的来源展示"), "Skills source of truth must not restore stale source-first defaults");
assert(mcpRequirementsSource.includes("默认浏览按 MCP 服务展示"), "MCP source of truth must preserve service-first browsing");
assert(mcpRequirementsSource.includes("状态和来源只作为筛选、详情状态和高级来源视图"), "MCP source of truth must keep status/source as secondary facets");
assert(!mcpRequirementsSource.includes("默认分组:\n\n- 可见"), "MCP source of truth must not restore stale status-first defaults");
assert(acceptanceSource.includes("技能默认浏览按任务和功能分类"), "acceptance must guard Skills category-first IA");
assert(acceptanceSource.includes("MCP 默认浏览按服务展示"), "acceptance must guard MCP service-first IA");

assert(!advancedModuleSource.includes("AiosTabBar"), "Advanced must not use the rejected AiosTabBar");
assert(!advancedModuleSource.includes("AiosTabPanel"), "Advanced must not use the rejected AiosTabPanel");
assert(advancedModuleSource.includes("AiosSectionRail"), "Advanced support hub must use a section rail");
assert(advancedModuleSource.includes("aios-two-pane"), "Advanced support hub must use a two-pane workspace");
for (const [view, source] of advancedOnlyModuleSources) {
  assert(source.includes(`renderBackButton(\"${view}\"`), `${view} must render the keyboard-accessible Advanced back arrow`);
  assert(!source.includes("AiosTabBar"), `${view} must not use the rejected AiosTabBar`);
  assert(!source.includes("AiosTabPanel"), `${view} must not use the rejected AiosTabPanel`);
}

assert(primitivesSource.includes("data-aios-motion-surface"), "shared primitives must expose stable motion surface markers");
assert(primitivesSource.includes("data-aios-hover-card"), "shared cards must expose stable hover-card markers");
assert(primitivesSource.includes("data-aios-selected-surface"), "shared selected states must expose stable selected-surface markers");
assert(primitivesSource.includes("data-aios-layout-fixed"), "shared fixed chrome must expose layout measurement markers");
assert(!primitivesSource.includes("AiosTabBar"), "shared primitives must not include the rejected AiosTabBar");
assert(!primitivesSource.includes("AiosTabPanel"), "shared primitives must not include the rejected AiosTabPanel");
assert(motionSource.includes("useHoverCardLiftMotion"), "motion hooks must include hover-card lift");
assert(motionSource.includes("useSelectedSurfaceEmphasisMotion"), "motion hooks must include selected-surface emphasis");
assert(motionSource.includes("useSmoothHoverSurfaceMotion"), "motion hooks must include smooth hover-surface motion");
assert(motionSource.includes("useSoftSelectedSurfaceMotion"), "motion hooks must include soft selected-surface motion");
assert(motionSource.includes("useSectionSwitcherIndicatorMotion"), "motion hooks must include section switcher indicator motion");
assert(motionSource.includes("useCardRevealMotion"), "motion hooks must include card reveal motion");
assert(motionSource.includes("usePanelEnterMotion"), "motion hooks must include panel enter motion");
assert(motionSource.includes("useEmptyStateRevealMotion"), "motion hooks must include empty-state reveal");
assert(motionSource.includes("useListRowStaggerMotion"), "motion hooks must include capped list-row stagger");
assert(motionSource.includes("useAccordionRevealMotion"), "motion hooks must include accordion reveal");
assert(motionSource.includes("useContextualPanelOpenMotion"), "motion hooks must include contextual panel open");
assert(motionSource.includes("prefers-reduced-motion: reduce"), "motion hooks must remain reduced-motion aware");

assert(themeSource.includes("\"html, body, #root\"") && themeSource.includes("overflow: \"hidden\""), "page-level scroll must be disabled by the shell contract");
assert(stylesSource.includes("--aios-module-scroll-body-height"), "CSS must consume measured internal scroll height");
assert(stylesSource.includes(".custom-scan-workspace") && stylesSource.includes(".mcp-browser-panel") && stylesSource.includes(".compact-skill-list-shell"), "module internals must define scroll bodies");
assert(stylesSource.includes("@media (max-width: 980px) and (min-width: 840px)"), "Skills inspector-open layout must keep a narrow-desktop override for the 900px visual contract");
assert(stylesSource.includes(".aios-console-shell.inspector-open {\n    grid-template-columns: 1fr;\n  }"), "Inspector-open shell must override the compact desktop grid at sub-980px widths");
assert(stylesSource.includes(".aios-console-shell--skills.inspector-open .aios-two-pane"), "Skills inspector-open layout must override the sub-980px stacked two-pane rule");
assert(stylesSource.includes("grid-template-columns: minmax(148px, 180px) minmax(0, 1fr);"), "Skills inspector-open narrow desktop layout must keep category browsing beside the list");
assert(stylesSource.includes(".aios-console-shell--skills.inspector-open .skill-filter-row {\n    flex-direction: row;"), "Skills inspector-open narrow desktop toolbar must override the sub-980px column layout");
assert(stylesSource.includes(".aios-console-shell--skills.inspector-open .skill-filter-row"), "Skills inspector-open narrow desktop toolbar must have a non-collapsing row rule");
assert(stylesSource.includes(".aios-console-shell--skills.inspector-open .skill-filter-primary-controls::-webkit-scrollbar"), "Skills inspector-open narrow desktop toolbar filters must remain accessible without forcing vertical collapse");
assert(!stylesSource.includes(".aios-tabbar-shell"), "CSS must not retain the rejected tab-bar shell");
assert(stylesSource.includes("@media (prefers-reduced-motion: reduce)"), "CSS interactions must respect reduced motion");
assert(stylesSource.includes("--aios-transition-hover"), "CSS must expose a centralized hover transition contract");
assert(stylesSource.includes("--aios-transition-selected"), "CSS must expose a centralized selected transition contract");
assert(stylesSource.includes("--aios-transition-press"), "CSS must expose a centralized press transition contract");
assert(themeSource.includes("--aios-motion-slow") && themeSource.includes("--aios-motion-ease"), "theme must expose centralized motion tokens");
assert(themeSource.includes("--aios-motion-hover") && themeSource.includes("--aios-motion-selected") && themeSource.includes("--aios-motion-press"), "theme must expose soft interaction motion tokens");
assert(!skillIdentitySource.includes("\"custom-registry\": \"Registry\""), "ordinary Skills badges must not expose Registry as first-class copy");

console.log("productShell P0 tests passed");

function readFile(relativePath: string): string {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function readProjectFile(relativePath: string): string {
  return readFileSync(new URL(`../../../${relativePath}`, import.meta.url), "utf8");
}
