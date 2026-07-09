import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  advancedSupportCards,
  advancedSupportSectionLabels,
  advancedSupportViews,
  advancedSubviewBackLabels,
  getAdvancedSubviewParent,
  getPrimaryNavigationView,
  homeCopy,
  primaryNavigationViews,
  resolvePrimaryNavigationSearch,
  topSearchCopy
} from "./productShell";
import { canStartScanMode, scanModeChangeStartsScan } from "./customDirectoryScan";
import { LOCAL_DATA_RESET_WARNING_COPY, WHAT_AIOS_NEVER_STORES_COPY } from "./resourceStore";
import { zhCN } from "../i18n/zh-CN";
import { navigationGroups } from "../components/shell/moduleConfig";
import { layoutCssVariableNames } from "./layoutMetrics";

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
const motionSource = readFile("lib/useAiosMotion.ts");
const stylesSource = readFile("styles.css");
const themeSource = readFile("theme/materialTheme.ts");
const skillIdentitySource = readFile("lib/skillIdentityModel.ts");

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
