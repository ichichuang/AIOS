import type { ResourceDisplay } from "../i18n/resourceText";
import type { AiosResource } from "../types/inventory";
import type { SkillListItem } from "./skillLibrary";

export type SkillCapabilityCategoryKey =
  | "frontend-ui"
  | "coding"
  | "code-review"
  | "testing-qa"
  | "docs-writing"
  | "data-automation"
  | "research-analysis"
  | "security-governance"
  | "design-visual"
  | "unknown";

export type SkillCapabilityConfidence = "high" | "medium" | "low" | "unknown";

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

interface CapabilityCandidate {
  identity: string;
  description: string;
  explicit: string;
}

const UNKNOWN_CATEGORY: SkillCapabilityCategory = {
  key: "unknown",
  title: "尚未分类",
  summary: "没有足够可靠的能力证据，暂时无法归入稳定分类。",
  priority: 1000,
  keywordRules: [],
  patternRules: []
};

export const SKILL_CAPABILITY_CATEGORIES: readonly SkillCapabilityCategory[] = [
  {
    key: "frontend-ui",
    title: "前端与界面",
    summary: "Web、小程序/移动端 UI、前端框架、组件、布局与样式实现。",
    priority: 10,
    keywordRules: [
      "frontend",
      "front-end",
      "ui",
      "vue",
      "react",
      "component",
      "components",
      "css",
      "unocss",
      "tailwind",
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
      "html",
      "dom",
      "前端",
      "界面",
      "组件",
      "布局",
      "小程序",
      "移动端",
      "样式"
    ],
    patternRules: [/front[\s_-]?end/i, /browser[\s_-]?ui/i, /mini[\s_-]?program/i, /wechat[\s_-]?mini/i, /\bwx\b/i]
  },
  {
    key: "coding",
    title: "通用代码开发",
    summary: "通用编程、算法、语言级开发与日常实现辅助。",
    priority: 20,
    keywordRules: [
      "coding",
      "development",
      "developer",
      "dev",
      "programming",
      "programmer",
      "implementation",
      "algorithm",
      "typescript",
      "javascript",
      "python",
      "go",
      "rust",
      "java",
      "node",
      "sdk",
      "api",
      "shell",
      "cli",
      "代码开发",
      "通用代码",
      "开发",
      "编程",
      "实现",
      "算法",
      "语言"
    ],
    patternRules: []
  },
  {
    key: "code-review",
    title: "代码审查与重构",
    summary: "代码审查、重构、lint、类型检查、AST 操作与代码改写。",
    priority: 30,
    keywordRules: [
      "review",
      "refactor",
      "refactoring",
      "code-review",
      "codemod",
      "ast",
      "grep",
      "symbol",
      "lint",
      "linter",
      "typecheck",
      "type-check",
      "audit",
      "code-quality",
      "代码审查",
      "重构",
      "符号",
      "审查",
      "改写",
      "质量"
    ],
    patternRules: [/type[\s_-]?check/i, /code[\s_-]?review/i, /health[\s_-]?scan/i, /ast[\s_-]?operation/i]
  },
  {
    key: "testing-qa",
    title: "测试与质量",
    summary: "单元测试、集成测试、浏览器测试、E2E、截图、回归验证与质量检查。",
    priority: 40,
    keywordRules: [
      "playwright",
      "browser",
      "screenshot",
      "e2e",
      "end-to-end",
      "visual-test",
      "visual-testing",
      "qa",
      "quality",
      "smoke",
      "smoke-test",
      "chrome",
      "debug",
      "testing",
      "test",
      "tests",
      "unit-test",
      "integration-test",
      "regression",
      "verification",
      "浏览器",
      "截图",
      "测试",
      "验证",
      "调试",
      "回归",
      "质量"
    ],
    patternRules: [/visual[\s_-]?test/i, /\be2e\b/i, /unit[\s_-]?test/i, /integration[\s_-]?test/i, /smoke[\s_-]?test/i]
  },
  {
    key: "docs-writing",
    title: "文档与写作",
    summary: "文档、Markdown、知识库、RAG、文字写作、编辑与润色。",
    priority: 50,
    keywordRules: [
      "docs",
      "documentation",
      "markdown",
      "md",
      "wiki",
      "obsidian",
      "knowledge",
      "knowledge-base",
      "rag",
      "context7",
      "writing",
      "writer",
      "copy",
      "copywriting",
      "editing",
      "polish",
      "文档",
      "知识库",
      "写作",
      "撰写",
      "润色",
      "编辑"
    ],
    patternRules: [/doc(?:s|umentation)?/i, /knowledge[\s_-]?base/i, /rag[\s_-]?content/i]
  },
  {
    key: "data-automation",
    title: "数据与自动化",
    summary: "数据处理、表格、CSV、SQL、JSON、自动化、脚本、构建、流水线与 CI/CD。",
    priority: 60,
    keywordRules: [
      "automation",
      "automate",
      "script",
      "scripts",
      "schedule",
      "build",
      "pipeline",
      "ci",
      "cd",
      "cicd",
      "ci/cd",
      "generator",
      "inventory",
      "report",
      "data",
      "spreadsheet",
      "csv",
      "excel",
      "table",
      "tables",
      "database",
      "sql",
      "pandas",
      "json",
      "analytics",
      "processing",
      "etl",
      "自动化",
      "脚本",
      "构建",
      "清单",
      "报告",
      "数据",
      "表格",
      "电子表格",
      "流水线"
    ],
    patternRules: [/ci[\s/_-]?cd/i, /data[\s_-]?processing/i, /etl[\s_-]?pipeline/i]
  },
  {
    key: "research-analysis",
    title: "研究与分析",
    summary: "研究、调查、综合、总结、对比、方法论与分析工作。",
    priority: 70,
    keywordRules: [
      "research",
      "analysis",
      "analyze",
      "analyse",
      "summarize",
      "summary",
      "synthesis",
      "synthesize",
      "investigate",
      "investigation",
      "persona",
      "perspective",
      "methodology",
      "compare",
      "comparison",
      "benchmark",
      "研究",
      "分析",
      "综合",
      "调研",
      "总结",
      "对比",
      "方法论",
      "视角"
    ],
    patternRules: []
  },
  {
    key: "security-governance",
    title: "安全与治理",
    summary: "安全审查、隐私、风险、策略、治理、依赖安全与防护边界。",
    priority: 80,
    keywordRules: [
      "security",
      "secure",
      "privacy",
      "risk",
      "policy",
      "policies",
      "governance",
      "audit",
      "guardrail",
      "guardrails",
      "secret",
      "secrets",
      "credential",
      "credentials",
      "dependency",
      "dependencies",
      "package",
      "packages",
      "repo",
      "repository",
      "architecture",
      "monorepo",
      "workspace",
      "safety",
      "安全",
      "治理",
      "审计",
      "风险",
      "策略",
      "依赖",
      "仓库",
      "架构",
      "隐私"
    ],
    patternRules: [/guard[\s_-]?rail/i, /large[\s_-]?repo/i, /dependency[\s_-]?audit/i, /security[\s_-]?review/i]
  },
  {
    key: "design-visual",
    title: "设计与视觉",
    summary: "视觉设计、主题、设计系统、图像生成、动画、动效与界面品味。",
    priority: 90,
    keywordRules: [
      "design",
      "design-system",
      "polish",
      "visual",
      "theme",
      "themes",
      "material",
      "figma",
      "imagegen",
      "image-generation",
      "style",
      "taste",
      "animation",
      "motion",
      "gsap",
      "icon",
      "icons",
      "illustration",
      "设计",
      "美化",
      "视觉",
      "主题",
      "动效",
      "动画",
      "图像"
    ],
    patternRules: [/design[\s_-]?system/i, /image[\s_-]?gen/i, /visual[\s_-]?design/i]
  },
  UNKNOWN_CATEGORY
] as const;

const CATEGORY_BY_KEY = new Map<SkillCapabilityCategoryKey, SkillCapabilityCategory>(
  SKILL_CAPABILITY_CATEGORIES.map((category) => [category.key, category])
);

const COMPILED_KEYWORD_RULES = new Map<SkillCapabilityCategoryKey, readonly RegExp[]>(
  SKILL_CAPABILITY_CATEGORIES.filter((category) => category.key !== "unknown").map((category) => [
    category.key,
    category.keywordRules.map((keyword) => compileKeyword(keyword))
  ])
);

const WEAK_SIGNALS = new Set<string>([
  "tool",
  "tools",
  "helper",
  "helpers",
  "utility",
  "utilities",
  "ai",
  "artificial intelligence",
  "service",
  "services",
  "skill",
  "skills",
  "plugin",
  "plugins",
  "extension",
  "app",
  "application",
  "local",
  "global",
  "project",
  "projects",
  "path",
  "paths",
  "runtime",
  "registry",
  "manual",
  "generic",
  "general",
  "common",
  "misc",
  "other",
  "unknown"
]);

const IDENTITY_WEIGHT = 1;
const DESCRIPTION_WEIGHT = 2;
const EXPLICIT_WEIGHT = 4;
const MIN_CLASSIFICATION_SCORE = 2;
const MIN_SECONDARY_SCORE = 3;
const MAX_SECONDARY_CATEGORIES = 2;

export function classifySkillCapability(resource: AiosResource, _display?: ResourceDisplay): SkillCapabilityClassification {
  const metadata = resource.metadata;
  const aliases = metadata && Array.isArray(metadata.aliases) ? (metadata.aliases as string[]).filter((item): item is string => typeof item === "string") : [];
  const tags = metadata && Array.isArray(metadata.tags) ? (metadata.tags as string[]).filter((item): item is string => typeof item === "string") : [];
  const capabilities = metadata && Array.isArray(metadata.capabilities) ? (metadata.capabilities as string[]).filter((item): item is string => typeof item === "string") : [];
  const whenToUse = metadata && typeof metadata.whenToUse === "string" ? (metadata.whenToUse as string) : "";

  return classifyFromCandidate({
    identity: normalizeText(stripPathLikeSegments([resource.name, ...aliases].join(" "))),
    description: normalizeText(stripPathLikeSegments([resource.description, whenToUse, ...tags, ...capabilities].join(" "))),
    explicit: normalizeText([...tags, ...capabilities].join(" "))
  });
}

export function classifySkillListItem(item: SkillListItem): SkillCapabilityClassification {
  const aliases = Array.isArray(item.aliases) ? item.aliases : [];
  const tags = Array.isArray(item.tags) ? item.tags : [];
  const capabilities = Array.isArray(item.capabilities) ? item.capabilities : [];
  return classifyFromCandidate({
    identity: normalizeText([item.displayName, item.originalName, ...aliases].join(" ")),
    description: normalizeText([item.shortPurpose, item.usageText ?? "", ...tags, ...capabilities].join(" ")),
    explicit: normalizeText([...tags, ...capabilities].join(" "))
  });
}

export function buildSkillCapabilityClassificationMap(
  resources: readonly AiosResource[],
  displayById?: ReadonlyMap<string, ResourceDisplay>
): Map<string, SkillCapabilityClassification> {
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
  switch (confidence) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    case "unknown":
    default:
      return "未分类";
  }
}

function classifyFromCandidate(candidate: CapabilityCandidate): SkillCapabilityClassification {
  const scoredCategories = SKILL_CAPABILITY_CATEGORIES.filter((category) => category.key !== "unknown")
    .map((category) => scoreCategory(category, candidate))
    .filter((score) => score.score > 0 && hasNonWeakEvidence(score))
    .sort(compareScoredCategories);

  if (scoredCategories.length === 0 || (scoredCategories[0]?.score ?? 0) < MIN_CLASSIFICATION_SCORE) {
    return {
      primaryCategory: UNKNOWN_CATEGORY,
      secondaryCategories: [],
      confidence: "unknown",
      evidenceKeywords: []
    };
  }

  const primary = scoredCategories[0];
  const secondaryCategories = scoredCategories
    .slice(1)
    .filter((score) => score.score >= MIN_SECONDARY_SCORE)
    .slice(0, MAX_SECONDARY_CATEGORIES)
    .map((score) => score.category);

  return {
    primaryCategory: primary.category,
    secondaryCategories,
    confidence: deriveConfidence(primary.score, primary.evidenceKeywords.length),
    evidenceKeywords: primary.evidenceKeywords.slice(0, 6)
  };
}

function scoreCategory(category: SkillCapabilityCategory, candidate: CapabilityCandidate): ScoredCategory {
  const keywordPatterns = COMPILED_KEYWORD_RULES.get(category.key) ?? [];
  const evidence = new Set<string>();
  let score = 0;

  category.keywordRules.forEach((keyword, index) => {
    const pattern = keywordPatterns[index];
    const fieldScore = Math.max(getFieldScore(pattern, candidate.identity, IDENTITY_WEIGHT), getFieldScore(pattern, candidate.description, DESCRIPTION_WEIGHT), getFieldScore(pattern, candidate.explicit, EXPLICIT_WEIGHT));
    if (fieldScore > 0) {
      score += fieldScore;
      evidence.add(keyword);
    }
  });

  for (const pattern of category.patternRules) {
    const fieldScore = Math.max(getFieldScore(pattern, candidate.identity, IDENTITY_WEIGHT), getFieldScore(pattern, candidate.description, DESCRIPTION_WEIGHT), getFieldScore(pattern, candidate.explicit, EXPLICIT_WEIGHT));
    if (fieldScore > 0) score += fieldScore;
  }

  return { category, score, evidenceKeywords: [...evidence] };
}

function getFieldScore(pattern: RegExp, text: string, weight: number): number {
  if (!text) return 0;
  pattern.lastIndex = 0;
  return pattern.test(text) ? weight : 0;
}

function compareScoredCategories(left: ScoredCategory, right: ScoredCategory): number {
  if (right.score !== left.score) return right.score - left.score;
  return left.category.priority - right.category.priority;
}

function hasNonWeakEvidence(score: ScoredCategory): boolean {
  return score.evidenceKeywords.some((keyword) => !WEAK_SIGNALS.has(keyword.toLowerCase()));
}

function deriveConfidence(score: number, evidenceCount: number): SkillCapabilityConfidence {
  if (score >= 7 || evidenceCount >= 3) return "high";
  if (score >= 4 || evidenceCount >= 2) return "medium";
  if (score >= MIN_CLASSIFICATION_SCORE || evidenceCount >= 1) return "low";
  return "unknown";
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function stripPathLikeSegments(value: string): string {
  return value.replace(/(?:[a-z]:[\\/]|(?:\\|\/))(?:[^\s\"']*[\\/])?[^\s\"']*/gi, " ");
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
