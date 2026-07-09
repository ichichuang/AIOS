import { getResourceDisplay, type ResourceDisplay } from "../i18n/resourceText";
import type { AiosResource } from "../types/inventory";
import type { SkillListItem } from "./skillLibrary";
import { buildSkillDisplayEnrichment, getSkillQualitySearchText } from "./skillDisplayEnrichment";
import { getSkillMetadataSearchText } from "./skillDiscoveryMetadata";

export type SkillCapabilityCategoryKey =
  | "frontend-ui"
  | "coding"
  | "code-review"
  | "docs-writing"
  | "automation-scripts"
  | "data-spreadsheets"
  | "browser-debug"
  | "mcp-integrations"
  | "project-governance"
  | "design-visual"
  | "research-analysis"
  | "local-system"
  | "other";

export type SkillCapabilityConfidence = "high" | "medium" | "low";

export interface SkillCapabilityCategory {
  key: SkillCapabilityCategoryKey;
  title: string;
  summary: string;
  priority: number;
  keywordRules: readonly string[];
  patternRules: readonly RegExp[];
}

export interface SkillCapabilityClassification {
  primaryCategory: SkillCapabilityCategory;
  secondaryCategories: SkillCapabilityCategory[];
  confidence: SkillCapabilityConfidence;
  evidenceKeywords: string[];
}

interface ScoredCategory {
  category: SkillCapabilityCategory;
  score: number;
  evidenceKeywords: string[];
}

interface CandidateText {
  identity: string;
  description: string;
  type: string;
}

export const SKILL_CAPABILITY_CATEGORIES: readonly SkillCapabilityCategory[] = [
  {
    key: "frontend-ui",
    title: "前端与界面",
    summary: "前端框架、组件、布局、样式、Web 界面以及小程序/移动端 UI 实现。",
    priority: 10,
    keywordRules: [
      "frontend",
      "front-end",
      "ui",
      "vue",
      "react",
      "component",
      "css",
      "unocss",
      "layout",
      "web",
      "browser-ui",
      "interface",
      "miniprogram",
      "mini-program",
      "wechat",
      "wx",
      "mobile",
      "taro",
      "uniapp",
      "前端",
      "界面",
      "组件",
      "布局",
      "小程序",
      "移动端"
    ],
    patternRules: [/front[\s_-]?end/i, /browser[\s_-]?ui/i, /mini[\s_-]?program/i, /wechat[\s_-]?mini/i, /\bwx\b/i]
  },
  {
    key: "coding",
    title: "通用代码开发",
    summary: "通用编程、代码实现、语言工具与日常开发辅助。",
    priority: 20,
    keywordRules: [
      "coding",
      "development",
      "developer",
      "dev",
      "programming",
      "typescript",
      "javascript",
      "python",
      "go",
      "rust",
      "java",
      "node",
      "代码开发",
      "通用代码",
      "开发",
      "编程"
    ],
    patternRules: []
  },
  {
    key: "code-review",
    title: "代码审查与重构",
    summary: "代码符号、类型检查、结构化改写、lint、审查与重构。",
    priority: 30,
    keywordRules: [
      "review",
      "refactor",
      "code-review",
      "codemod",
      "ast",
      "grep",
      "symbol",
      "lint",
      "typecheck",
      "audit",
      "代码审查",
      "重构",
      "符号",
      "审查"
    ],
    patternRules: [/type[\s_-]?check/i, /code[\s_-]?review/i, /health[\s_-]?scan/i]
  },
  {
    key: "docs-writing",
    title: "文档与写作",
    summary: "文档、Markdown、知识库、Obsidian、RAG、Context7 查询与文字写作。",
    priority: 40,
    keywordRules: [
      "docs",
      "documentation",
      "markdown",
      "md",
      "wiki",
      "obsidian",
      "knowledge",
      "rag",
      "context7",
      "writing",
      "writer",
      "copy",
      "文档",
      "知识库",
      "写作",
      "撰写",
      "润色"
    ],
    patternRules: [/doc(?:s|umentation)?/i]
  },
  {
    key: "automation-scripts",
    title: "自动化与脚本",
    summary: "自动化、脚本、构建、校验、生成器、清单与报告产物。",
    priority: 50,
    keywordRules: [
      "automation",
      "script",
      "schedule",
      "build",
      "validate",
      "generator",
      "inventory",
      "report",
      "ci",
      "cd",
      "自动化",
      "脚本",
      "构建",
      "清单",
      "报告"
    ],
    patternRules: [/validat(?:e|or)/i]
  },
  {
    key: "data-spreadsheets",
    title: "数据与表格",
    summary: "数据、表格、CSV、Excel、数据库、SQL、JSON 与数据分析处理。",
    priority: 55,
    keywordRules: [
      "data",
      "spreadsheet",
      "csv",
      "excel",
      "table",
      "database",
      "sql",
      "pandas",
      "json",
      "analytics",
      "数据",
      "表格",
      "电子表格"
    ],
    patternRules: []
  },
  {
    key: "browser-debug",
    title: "浏览器与调试",
    summary: "Playwright、Chrome、E2E、截图、视觉测试、浏览器验证与调试。",
    priority: 60,
    keywordRules: [
      "playwright",
      "browser",
      "screenshot",
      "e2e",
      "visual-test",
      "qa",
      "smoke",
      "chrome",
      "debug",
      "testing",
      "浏览器",
      "截图",
      "测试",
      "验证",
      "调试"
    ],
    patternRules: [/visual[\s_-]?test/i, /\be2e\b/i]
  },
  {
    key: "mcp-integrations",
    title: "MCP 与工具集成",
    summary: "Agent、MCP、Codex、Claude、Serena、Context7、LLM 与工具路由。",
    priority: 65,
    keywordRules: [
      "agent",
      "agents",
      "mcp",
      "codex",
      "claude",
      "serena",
      "context7",
      "tool-router",
      "llm",
      "ai",
      "MCP",
      "Agent",
      "工具集成",
      "工具路由"
    ],
    patternRules: [/tool[\s_-]?router/i]
  },
  {
    key: "project-governance",
    title: "项目治理与安全",
    summary: "仓库结构、架构边界、依赖、包、安全审计、策略治理与风险。",
    priority: 70,
    keywordRules: [
      "repo",
      "repository",
      "architecture",
      "package",
      "monorepo",
      "workspace",
      "dependency",
      "security",
      "policy",
      "governance",
      "audit",
      "risk",
      "safety",
      "secret",
      "credential",
      "guardrail",
      "仓库",
      "架构",
      "项目",
      "依赖",
      "安全",
      "治理",
      "审计",
      "风险"
    ],
    patternRules: [/large[\s_-]?repo/i, /guard[\s_-]?rail/i]
  },
  {
    key: "design-visual",
    title: "设计与视觉",
    summary: "视觉设计、主题美化、Material 风格、图像生成与界面品味。",
    priority: 80,
    keywordRules: [
      "design",
      "polish",
      "visual",
      "theme",
      "material",
      "figma",
      "imagegen",
      "style",
      "taste",
      "animation",
      "motion",
      "gsap",
      "设计",
      "美化",
      "视觉",
      "主题",
      "动效"
    ],
    patternRules: [/design[\s_-]?system/i]
  },
  {
    key: "research-analysis",
    title: "研究与分析",
    summary: "研究、分析、综合、人物视角、方法论与知识整理。",
    priority: 90,
    keywordRules: [
      "research",
      "analysis",
      "analyze",
      "summarize",
      "summary",
      "investigate",
      "persona",
      "perspective",
      "方法论",
      "研究",
      "分析",
      "综合",
      "调研"
    ],
    patternRules: []
  },
  {
    key: "local-system",
    title: "本地系统与环境",
    summary: "本地路径、Shell、文件系统、Mac、运行时、CLI 与系统工具。",
    priority: 100,
    keywordRules: [
      "local",
      "shell",
      "filesystem",
      "mac",
      "path",
      "runtime",
      "system",
      "cli",
      "本地",
      "系统",
      "工具",
      "路径"
    ],
    patternRules: [/file[\s_-]?system/i]
  },
  {
    key: "other",
    title: "其他",
    summary: "未命中稳定能力规则的本地技能元数据。",
    priority: 999,
    keywordRules: [],
    patternRules: []
  }
] as const;

const OTHER_CATEGORY = SKILL_CAPABILITY_CATEGORIES.find((category) => category.key === "other")!;

const COMPILED_KEYWORD_RULES = new Map<SkillCapabilityCategoryKey, readonly RegExp[]>(
  SKILL_CAPABILITY_CATEGORIES.map((category) => [category.key, category.keywordRules.map((keyword) => compileKeyword(keyword))])
);

export function classifySkillCapability(resource: AiosResource, display: ResourceDisplay = getResourceDisplay(resource)): SkillCapabilityClassification {
  return classifyFromCandidateText(buildCandidateText(resource, display));
}

export function classifySkillListItem(item: SkillListItem): SkillCapabilityClassification {
  const identity = [item.displayName, item.originalName, ...item.aliases, item.sourceLabel, item.sourceKindLabel].join(" ");
  const description = [item.shortPurpose, item.usageText ?? "", ...item.tags, ...item.capabilities].join(" ");
  const type = [item.sourceKindLabel, ...item.availableInTools].join(" ");
  return classifyFromCandidateText({
    identity: normalizeText(identity),
    description: normalizeText(description),
    type: normalizeText(type)
  });
}

export function buildSkillCapabilityClassificationMap(resources: readonly AiosResource[], displayById?: ReadonlyMap<string, ResourceDisplay>): Map<string, SkillCapabilityClassification> {
  return new Map(resources.map((resource) => [resource.id, classifySkillCapability(resource, displayById?.get(resource.id))]));
}

export function getSkillCapabilitySearchText(classification: SkillCapabilityClassification | undefined): string {
  if (!classification) return "";
  return [
    classification.primaryCategory.key,
    classification.primaryCategory.title,
    classification.primaryCategory.summary,
    ...classification.secondaryCategories.flatMap((category) => [category.key, category.title, category.summary]),
    ...classification.evidenceKeywords
  ].join(" ");
}

export function buildSkillCapabilitySearchTextMap(classificationById: ReadonlyMap<string, SkillCapabilityClassification>): Map<string, string> {
  return new Map([...classificationById.entries()].map(([id, classification]) => [id, getSkillCapabilitySearchText(classification)]));
}

export function getSkillCapabilityConfidenceLabel(confidence: SkillCapabilityConfidence): string {
  if (confidence === "high") return "高";
  if (confidence === "medium") return "中";
  return "低";
}

function classifyFromCandidateText(candidateText: CandidateText): SkillCapabilityClassification {
  const scoredCategories = SKILL_CAPABILITY_CATEGORIES.filter((category) => category.key !== "other")
    .map((category) => scoreCategory(category, candidateText))
    .filter((score) => score.score > 0)
    .sort(compareScoredCategories);

  const primaryScore = scoredCategories[0] ?? { category: OTHER_CATEGORY, score: 0, evidenceKeywords: [] };
  const secondaryCategories = scoredCategories
    .slice(1)
    .filter((score) => score.score >= 3)
    .slice(0, 3)
    .map((score) => score.category);

  return {
    primaryCategory: primaryScore.category,
    secondaryCategories,
    confidence: getConfidence(primaryScore.score, primaryScore.evidenceKeywords.length),
    evidenceKeywords: primaryScore.evidenceKeywords.slice(0, 6)
  };
}

function scoreCategory(category: SkillCapabilityCategory, candidateText: CandidateText): ScoredCategory {
  const keywordPatterns = COMPILED_KEYWORD_RULES.get(category.key) ?? [];
  const evidence = new Set<string>();
  let score = 0;

  category.keywordRules.forEach((keyword, index) => {
    const pattern = keywordPatterns[index];
    const fieldScore = getFieldScore(pattern, candidateText);
    if (fieldScore > 0) {
      score += fieldScore;
      evidence.add(keyword);
    }
  });

  for (const pattern of category.patternRules) {
    const fieldScore = getFieldScore(pattern, candidateText);
    if (fieldScore > 0) score += fieldScore;
  }

  return { category, score, evidenceKeywords: [...evidence] };
}

function getFieldScore(pattern: RegExp, candidateText: CandidateText): number {
  pattern.lastIndex = 0;
  if (pattern.test(candidateText.identity)) return 3;
  pattern.lastIndex = 0;
  if (pattern.test(candidateText.description)) return 2;
  pattern.lastIndex = 0;
  if (pattern.test(candidateText.type)) return 1;
  return 0;
}

function compareScoredCategories(left: ScoredCategory, right: ScoredCategory): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.category.priority - right.category.priority;
}

function getConfidence(score: number, evidenceCount: number): SkillCapabilityConfidence {
  if (score >= 6 || evidenceCount >= 3) return "high";
  if (score >= 3 || evidenceCount >= 1) return "medium";
  return "low";
}

function buildCandidateText(resource: AiosResource, display: ResourceDisplay): CandidateText {
  const enrichment = buildSkillDisplayEnrichment(resource, display);
  return {
    identity: normalizeText([resource.name, getPathSignal(resource.path), display.zhName, enrichment.displayNameZh, display.zhCategory, display.zhCapability, getSkillMetadataSearchText(resource)].join(" ")),
    description: normalizeText([resource.description, display.zhDescription, enrichment.displayDescriptionZh, getSkillQualitySearchText(enrichment), getSkillMetadataSearchText(resource)].join(" ")),
    type: normalizeText([resource.toolType, resource.capabilityType].join(" "))
  };
}

function getPathSignal(path: string | undefined): string {
  if (!path) return "";
  const segments = path.split(/[\\/]+/).filter(Boolean);
  return segments.slice(-2).join(" ");
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function compileKeyword(keyword: string): RegExp {
  const escaped = escapeRegExp(keyword.toLowerCase());
  if (/^[a-z0-9][a-z0-9_-]*$/i.test(keyword)) {
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i");
  }
  return new RegExp(escaped, "i");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
