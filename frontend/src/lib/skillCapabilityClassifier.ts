import { getResourceDisplay, type ResourceDisplay } from "../i18n/resourceText";
import type { AiosResource } from "../types/inventory";
import { buildSkillDisplayEnrichment, getSkillQualitySearchText } from "./skillDisplayEnrichment";
import { getSkillMetadataSearchText } from "./skillDiscoveryMetadata";

export type SkillCapabilityCategoryKey =
  | "frontend-ui"
  | "design-motion"
  | "mini-program-mobile"
  | "code-refactor"
  | "repo-architecture"
  | "browser-testing"
  | "docs-knowledge"
  | "security-governance"
  | "automation-scripts"
  | "ai-agent-mcp"
  | "local-system-tools"
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
    summary: "前端框架、组件、布局、样式和 Web 界面实现。",
    priority: 10,
    keywordRules: ["frontend", "front-end", "ui", "vue", "react", "component", "css", "unocss", "layout", "web", "browser-ui", "interface", "前端", "界面", "组件", "布局"],
    patternRules: [/front[\s_-]?end/i, /browser[\s_-]?ui/i]
  },
  {
    key: "design-motion",
    title: "设计美化与动效",
    summary: "视觉设计、主题美化、Material 风格和安全范围内的动效。",
    priority: 20,
    keywordRules: ["design", "polish", "visual", "theme", "material", "gsap", "animation", "motion", "taste", "style", "figma", "设计", "美化", "动效", "视觉", "主题"],
    patternRules: [/design[\s_-]?system/i]
  },
  {
    key: "mini-program-mobile",
    title: "小程序与移动端",
    summary: "微信小程序、移动端框架和跨端 UI 能力。",
    priority: 30,
    keywordRules: ["miniprogram", "mini-program", "wechat", "wx", "小程序", "mobile", "taro", "uniapp", "移动端"],
    patternRules: [/mini[\s_-]?program/i, /wechat[\s_-]?mini/i, /\bwx\b/i]
  },
  {
    key: "code-refactor",
    title: "代码理解与重构",
    summary: "代码符号、类型检查、结构化改写、lint 和重构。",
    priority: 40,
    keywordRules: ["code", "ast", "codemod", "grep", "refactor", "symbol", "lint", "typecheck", "typescript", "代码", "重构", "符号"],
    patternRules: [/type[\s_-]?check/i]
  },
  {
    key: "repo-architecture",
    title: "仓库与项目分析",
    summary: "仓库结构、架构边界、依赖、包和工作区分析。",
    priority: 50,
    keywordRules: ["repo", "repository", "architecture", "package", "monorepo", "workspace", "large-repo", "dependency", "仓库", "架构", "项目分析", "依赖"],
    patternRules: [/large[\s_-]?repo/i]
  },
  {
    key: "browser-testing",
    title: "浏览器测试与截图",
    summary: "Playwright、Chrome、E2E、截图、视觉测试和浏览器验证。",
    priority: 60,
    keywordRules: ["playwright", "browser", "screenshot", "e2e", "visual-test", "qa", "smoke", "chrome", "浏览器", "截图", "测试", "验证"],
    patternRules: [/visual[\s_-]?test/i, /\be2e\b/i]
  },
  {
    key: "docs-knowledge",
    title: "文档与知识库",
    summary: "文档、Markdown、知识库、Obsidian、RAG 和 Context7 查询。",
    priority: 70,
    keywordRules: ["docs", "documentation", "markdown", "md", "wiki", "obsidian", "knowledge", "rag", "context7", "文档", "知识库"],
    patternRules: [/doc(?:s|umentation)?/i]
  },
  {
    key: "security-governance",
    title: "安全与治理",
    summary: "安全审计、策略治理、风险、凭据、秘密和护栏。",
    priority: 80,
    keywordRules: ["security", "policy", "governance", "audit", "risk", "safety", "secret", "credential", "guardrail", "安全", "治理", "审计", "风险", "凭据"],
    patternRules: [/guard[\s_-]?rail/i]
  },
  {
    key: "automation-scripts",
    title: "自动化与脚本",
    summary: "自动化、脚本、构建、校验、生成器、清单和报告产物。",
    priority: 90,
    keywordRules: ["automation", "script", "schedule", "build", "validate", "generator", "inventory", "report", "自动化", "脚本", "构建", "清单", "报告"],
    patternRules: [/validat(?:e|or)/i]
  },
  {
    key: "ai-agent-mcp",
    title: "AI / Agent / MCP 集成",
    summary: "Agent、MCP、Codex、Claude、Serena、Context7、LLM 和工具路由。",
    priority: 100,
    keywordRules: ["agent", "agents", "mcp", "codex", "claude", "serena", "context7", "tool-router", "llm", "ai", "Agent", "MCP", "工具路由"],
    patternRules: [/tool[\s_-]?router/i]
  },
  {
    key: "local-system-tools",
    title: "本地系统与工具",
    summary: "本地路径、Shell、文件系统、Mac、运行时、CLI 和系统工具。",
    priority: 110,
    keywordRules: ["local", "shell", "filesystem", "mac", "path", "runtime", "system", "cli", "本地", "系统", "工具", "路径"],
    patternRules: [/file[\s_-]?system/i]
  },
  {
    key: "other",
    title: "其他能力",
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
  const candidateText = buildCandidateText(resource, display);
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
