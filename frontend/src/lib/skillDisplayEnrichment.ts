import { zhCN } from "../i18n/zh-CN";
import type { ResourceDisplay } from "../i18n/resourceText";
import type { AiosResource } from "../types/inventory";
import { getMetadataBoolean, getMetadataString, getMetadataStringArray, isHuashuFamilyResource } from "./skillDiscoveryMetadata";
import type { SkillIdentityRow } from "./skillIdentityModel";

export type SkillMetadataQualityLevel = "complete" | "usable" | "weak" | "needs-review";
export type SkillEnrichmentSource = "curated" | "manifest" | "registry" | "filesystem" | "inferred" | "fallback";
export type SkillSuggestedMetadataField = "description" | "aliases" | "tags" | "capabilities" | "useCases" | "whenToUse";

export interface SkillDisplayEnrichment {
  displayNameZh: string;
  displayDescriptionZh: string;
  shortPurposeZh: string;
  inferredTags: string[];
  inferredUseCases: string[];
  qualityLevel: SkillMetadataQualityLevel;
  qualityReasons: string[];
  enrichmentSource: SkillEnrichmentSource;
  suggestedFields: SkillSuggestedMetadataField[];
}

type EnrichmentTarget = AiosResource | SkillIdentityRow;

interface SkillContext {
  primary: AiosResource;
  sources: AiosResource[];
}

interface ValueWithSource {
  value: string;
  source: SkillEnrichmentSource;
  explicit: boolean;
}

interface DomainRule {
  tokens: readonly string[];
  name: string;
  description: string;
  tags: readonly string[];
  useCases: readonly string[];
}

const GENERIC_NAME_VALUES = new Set<string>([
  "技能",
  "运行时视图",
  "注册表",
  "项目包",
  "项目资源包",
  "本地技能",
  "本地资源",
  "使用提示"
]);

const GENERIC_DESCRIPTION_PATTERNS = [
  "registry skill metadata",
  "filesystem-discovered skill metadata",
  "canonical skill metadata",
  "active skill entrypoint metadata",
  "contents are not read by the entrypoint scanner",
  "执行提示词资源；复制后由用户显式使用",
  "本地只读技能资源",
  "本地只读运行时视图资源",
  "来自 custom-skill-registry.json",
  "来自 skills_index.json",
  "通过有界 skill.md 文件系统发现得到的技能元数据",
  "规范技能元数据",
  "入口扫描器不读取技能正文"
] as const;

const KNOWN_SUBJECTS: Record<string, string> = {
  "andrej-karpathy": "Andrej Karpathy",
  "anthony-fu": "Anthony Fu",
  "elon-musk": "Elon Musk",
  "evan-you": "Evan You",
  feynman: "费曼",
  "ilya-sutskever": "Ilya Sutskever",
  mrbeast: "MrBeast",
  munger: "芒格",
  naval: "Naval",
  "paul-graham": "Paul Graham",
  "rich-harris": "Rich Harris",
  "simon-willison": "Simon Willison",
  "steve-jobs": "Steve Jobs",
  "sun-yuchen": "孙宇晨",
  taleb: "塔勒布",
  teknium: "Teknium",
  trump: "Trump",
  "zhang-yiming": "张一鸣",
  zhangxuefeng: "张雪峰",
  "x-mastery": "X 成长"
};

const TOKEN_LABELS: Record<string, string> = {
  aios: "AIOS",
  ai: "AI",
  agent: "Agent",
  agents: "Agents",
  api: "API",
  ast: "AST",
  browser: "浏览器",
  chatgpt: "ChatGPT",
  chrome: "Chrome",
  ci: "CI",
  claude: "Claude",
  cli: "CLI",
  cloudflare: "Cloudflare",
  codemod: "代码改写",
  codex: "Codex",
  component: "组件",
  components: "组件",
  context7: "Context7",
  css: "CSS",
  debug: "调试",
  deploy: "部署",
  design: "设计",
  docs: "文档",
  doc: "文档",
  figma: "Figma",
  framework: "框架",
  frontend: "前端",
  gh: "GitHub",
  github: "GitHub",
  gsap: "GSAP",
  grep: "grep",
  health: "健康检查",
  html: "HTML",
  imagegen: "图像生成",
  interface: "界面",
  jupyter: "Jupyter",
  knowledge: "知识库",
  large: "大型",
  local: "本地",
  material: "Material",
  mcp: "MCP",
  markdown: "Markdown",
  netlify: "Netlify",
  node: "Node",
  notion: "Notion",
  obsidian: "Obsidian",
  openai: "OpenAI",
  pdf: "PDF",
  playwright: "Playwright",
  policy: "策略",
  rag: "RAG",
  react: "React",
  repo: "仓库",
  repository: "仓库",
  screenshot: "截图",
  security: "安全",
  serena: "Serena",
  skill: "技能",
  symbolic: "符号",
  top: "顶级",
  ui: "UI",
  unocss: "UnoCSS",
  vercel: "Vercel",
  vite: "Vite",
  vue: "Vue",
  wiki: "Wiki"
};

const DOMAIN_RULES: readonly DomainRule[] = [
  {
    tokens: ["frontend", "ui", "vue", "react", "css", "browser", "playwright", "top-ui", "design", "material", "gsap"],
    name: "前端界面技能",
    description: "用于前端界面实现、调试、设计校验和浏览器验证。",
    tags: ["前端", "界面", "浏览器验证"],
    useCases: ["界面实现", "视觉调试", "浏览器验证"]
  },
  {
    tokens: ["codemod", "ast", "grep", "repo", "large-repo", "health-scan", "symbolic-navigation"],
    name: "仓库与代码技能",
    description: "用于仓库理解、结构化代码检索、重构或健康检查。",
    tags: ["仓库", "代码理解", "重构"],
    useCases: ["仓库分析", "结构化检索", "代码健康检查"]
  },
  {
    tokens: ["docs", "context7", "markdown", "obsidian", "wiki", "knowledge", "rag"],
    name: "文档与知识技能",
    description: "用于文档、知识库、Markdown、Context7 或 RAG 资料处理。",
    tags: ["文档", "知识库", "资料检索"],
    useCases: ["文档查询", "知识整理", "资料综合"]
  },
  {
    tokens: ["automation", "script", "validate", "security", "policy", "governance", "cloudflare", "vercel", "netlify", "deploy"],
    name: "自动化与治理技能",
    description: "用于本地自动化、验证、治理、安全或部署流程的只读技能入口。",
    tags: ["自动化", "治理", "安全"],
    useCases: ["本地验证", "安全审计", "部署辅助"]
  }
] as const;

export const QUALITY_LEVEL_LABELS: Record<SkillMetadataQualityLevel, string> = {
  complete: "完整",
  usable: "可用",
  weak: "说明偏弱",
  "needs-review": "需补全"
};

export const ENRICHMENT_SOURCE_LABELS: Record<SkillEnrichmentSource, string> = {
  curated: "curated",
  manifest: "manifest",
  registry: "registry",
  filesystem: "filesystem",
  inferred: "inferred",
  fallback: "fallback"
};

export const SUGGESTED_FIELD_LABELS: Record<SkillSuggestedMetadataField, string> = {
  description: "add description",
  aliases: "add aliases",
  tags: "add tags",
  capabilities: "add capabilities",
  useCases: "add use cases",
  whenToUse: "add whenToUse"
};

export function buildSkillDisplayEnrichment(target: EnrichmentTarget, display: ResourceDisplay): SkillDisplayEnrichment {
  const context = getSkillContext(target);
  const name = getDisplayName(context, display);
  const domain = getDomainRule(context);
  const description = getDisplayDescription(context, display, name.value, domain);
  const inferredTags = getInferredTags(context, domain);
  const inferredUseCases = getInferredUseCases(context, domain);
  const suggestedFields = getSuggestedFields(context, name, description);
  const quality = getQuality(context, name, description, inferredTags, suggestedFields);

  return {
    displayNameZh: name.value,
    displayDescriptionZh: description.value,
    shortPurposeZh: shortenPurpose(description.value),
    inferredTags,
    inferredUseCases,
    qualityLevel: quality.level,
    qualityReasons: quality.reasons,
    enrichmentSource: selectEnrichmentSource(name.source, description.source),
    suggestedFields
  };
}

export function getQualityLevelLabel(level: SkillMetadataQualityLevel): string {
  return QUALITY_LEVEL_LABELS[level];
}

export function shouldShowSkillQualityChip(enrichment: SkillDisplayEnrichment): boolean {
  return enrichment.qualityLevel === "weak" || enrichment.qualityLevel === "needs-review" || enrichment.enrichmentSource === "inferred" || enrichment.enrichmentSource === "fallback";
}

export function getSkillQualityChipLabel(enrichment: SkillDisplayEnrichment): string {
  if (enrichment.qualityLevel === "weak" || enrichment.qualityLevel === "needs-review") return QUALITY_LEVEL_LABELS[enrichment.qualityLevel];
  if (enrichment.enrichmentSource === "inferred" || enrichment.enrichmentSource === "fallback") return "自动推断";
  return QUALITY_LEVEL_LABELS[enrichment.qualityLevel];
}

export function getSkillQualitySearchText(enrichment: SkillDisplayEnrichment): string {
  return [
    enrichment.displayNameZh,
    enrichment.displayDescriptionZh,
    enrichment.shortPurposeZh,
    enrichment.enrichmentSource,
    ENRICHMENT_SOURCE_LABELS[enrichment.enrichmentSource],
    enrichment.qualityLevel,
    QUALITY_LEVEL_LABELS[enrichment.qualityLevel],
    enrichment.enrichmentSource === "inferred" || enrichment.enrichmentSource === "fallback" ? "自动推断" : "",
    ...enrichment.inferredTags,
    ...enrichment.inferredUseCases,
    ...enrichment.qualityReasons,
    ...enrichment.suggestedFields,
    ...enrichment.suggestedFields.map((field) => SUGGESTED_FIELD_LABELS[field])
  ]
    .filter(Boolean)
    .join(" ");
}

function getSkillContext(target: EnrichmentTarget): SkillContext {
  if ("primaryResource" in target && "sources" in target) return { primary: target.primaryResource, sources: target.sources };
  return { primary: target, sources: [target] };
}

function getDisplayName(context: SkillContext, display: ResourceDisplay): ValueWithSource {
  const primary = context.primary;
  const explicitName = getExplicitDisplayName(primary, display);
  if (explicitName) return explicitName;

  const huashuName = getHuashuDisplayName(context);
  if (huashuName) return { value: huashuName, source: "inferred", explicit: false };

  const domain = getDomainRule(context);
  if (domain) return { value: buildDomainDisplayName(primary.name, domain), source: "inferred", explicit: false };

  const fallback = slugToReadableName(primary.name);
  return { value: fallback || `${display.technicalName || primary.name} 技能`, source: "fallback", explicit: false };
}

function getExplicitDisplayName(resource: AiosResource, display: ResourceDisplay): ValueWithSource | null {
  if (isMeaningfulName(resource.zhName)) return { value: resource.zhName, source: "manifest", explicit: true };
  const curated = zhCN.skillNames[resource.name];
  if (isMeaningfulName(curated)) return { value: curated, source: "curated", explicit: true };
  if (isMeaningfulName(display.zhName)) return { value: display.zhName, source: getSourceFromResource(resource), explicit: true };
  return null;
}

function getDisplayDescription(context: SkillContext, display: ResourceDisplay, displayName: string, domain: DomainRule | null): ValueWithSource {
  const primary = context.primary;
  const huashuDescription = getHuashuDescription(context);
  if (huashuDescription) return { value: huashuDescription, source: "inferred", explicit: false };

  const explicitDescription = getExplicitDescription(primary, display);
  if (explicitDescription) return explicitDescription;

  const personaDescription = getGenericPersonaDescription(context);
  if (personaDescription) return { value: personaDescription, source: "inferred", explicit: false };

  if (domain) return { value: domain.description, source: "inferred", explicit: false };

  return {
    value: `用于本地 AIOS 中的${displayName}相关任务，按需打开检查器查看来源。`,
    source: "fallback",
    explicit: false
  };
}

function getExplicitDescription(resource: AiosResource, display: ResourceDisplay): ValueWithSource | null {
  if (isMeaningfulDescription(resource.zhDescription)) return { value: resource.zhDescription, source: "manifest", explicit: true };
  const curated = zhCN.skillDescriptions[resource.name];
  if (isMeaningfulDescription(curated)) return { value: curated, source: "curated", explicit: true };
  if (isMeaningfulDescription(display.zhDescription)) return { value: display.zhDescription, source: getSourceFromResource(resource), explicit: true };
  return null;
}

function getHuashuDisplayName(context: SkillContext): string | null {
  if (!context.sources.some(isHuashuFamilyResource)) return null;
  const name = context.primary.name;
  const perspectiveSubject = getSuffixSubject(name, "-perspective");
  if (perspectiveSubject) return appendChineseAwareSuffix(perspectiveSubject, "视角");

  const mentorSubject = getSuffixSubject(name, "-mentor");
  if (mentorSubject) return appendChineseAwareSuffix(mentorSubject, "导师");

  if (name.includes("huashu-nuwa") || name.includes("huashu-nvwa")) return "华术女娲技能蒸馏";
  return null;
}

function getHuashuDescription(context: SkillContext): string | null {
  if (!context.sources.some(isHuashuFamilyResource)) return null;
  const name = context.primary.name;
  const perspectiveSubject = getSuffixSubject(name, "-perspective");
  if (perspectiveSubject) return `以 ${perspectiveSubject} 的视角、判断方式和表达风格辅助分析任务。`;
  if (name === "x-mastery-mentor") return "用于把目标拆成可执行的成长、训练或技能精进建议。";
  if (name.endsWith("-mentor")) return "用于把目标拆成可执行的训练、复盘和技能精进建议。";
  return null;
}

function getGenericPersonaDescription(context: SkillContext): string | null {
  const text = getSearchableText(context);
  if (/\b(persona|perspective)\b/.test(text) || text.includes("人物") || text.includes("角色")) {
    return "用于调用特定人物或方法论视角分析问题，复制提示词后由用户显式使用。";
  }
  return null;
}

function getSuffixSubject(name: string, suffix: "-perspective" | "-mentor"): string | null {
  if (!name.endsWith(suffix)) return null;
  const slug = name.slice(0, -suffix.length);
  return KNOWN_SUBJECTS[slug] ?? slugToReadableName(slug);
}

function appendChineseAwareSuffix(subject: string, suffix: "视角" | "导师"): string {
  return /[\u3400-\u9fff]/.test(subject) ? `${subject}${suffix}` : `${subject} ${suffix}`;
}

function getDomainRule(context: SkillContext): DomainRule | null {
  const text = getSearchableText(context);
  return DOMAIN_RULES.find((rule) => rule.tokens.some((token) => hasToken(text, token))) ?? null;
}

function buildDomainDisplayName(name: string, domain: DomainRule): string {
  const readable = slugToReadableName(name);
  if (!readable) return domain.name;
  if (readable === "技能") return domain.name;
  return readable.endsWith("技能") ? readable : readable;
}

function getInferredTags(context: SkillContext, domain: DomainRule | null): string[] {
  const tags = new Set<string>();
  if (context.sources.some(isHuashuFamilyResource)) {
    tags.add("华术女娲");
    tags.add("persona");
    tags.add("perspective");
    tags.add("知识研究");
  }
  domain?.tags.forEach((tag) => tags.add(tag));
  return [...tags];
}

function getInferredUseCases(context: SkillContext, domain: DomainRule | null): string[] {
  const useCases = new Set<string>();
  if (context.sources.some(isHuashuFamilyResource)) {
    if (context.primary.name === "x-mastery-mentor") {
      useCases.add("成长训练");
      useCases.add("技能精进");
    } else {
      useCases.add("人物视角分析");
      useCases.add("判断框架借鉴");
    }
  }
  domain?.useCases.forEach((useCase) => useCases.add(useCase));
  return [...useCases];
}

function getSuggestedFields(context: SkillContext, name: ValueWithSource, description: ValueWithSource): SkillSuggestedMetadataField[] {
  const fields = new Set<SkillSuggestedMetadataField>();
  if (!description.explicit || !hasAnyMeaningfulOriginalDescription(context)) fields.add("description");
  if (!hasAnyMetadataArray(context, "aliases")) fields.add("aliases");
  if (!hasAnyMetadataArray(context, "tags")) fields.add("tags");
  if (!hasAnyMetadataArray(context, "capabilities")) fields.add("capabilities");
  if (name.source === "fallback" || description.source === "fallback" || fields.size > 0) {
    fields.add("useCases");
    fields.add("whenToUse");
  }
  return [...fields];
}

function getQuality(
  context: SkillContext,
  name: ValueWithSource,
  description: ValueWithSource,
  inferredTags: string[],
  suggestedFields: SkillSuggestedMetadataField[]
): { level: SkillMetadataQualityLevel; reasons: string[] } {
  const hasMeaningfulName = isMeaningfulName(name.value);
  const hasMeaningfulDescription = isMeaningfulDescription(description.value);
  const hasTags = hasAnyMetadataArray(context, "tags");
  const hasCapabilities = hasAnyMetadataArray(context, "capabilities");
  const hasAliases = hasAnyMetadataArray(context, "aliases");
  const hasSourceProvenance = hasAnySourceProvenance(context);
  const reasons: string[] = [];

  if (name.explicit) reasons.push("已有明确显示名称。");
  else if (name.source === "inferred") reasons.push("显示名称来自确定性规则。");
  else reasons.push("显示名称来自 slug 回退规则。");

  if (description.explicit) reasons.push("已有可用说明。");
  else if (description.source === "inferred") reasons.push("原始说明偏通用，已使用本地推断说明。");
  else reasons.push("说明仍依赖回退模板。");

  if (!hasAliases) reasons.push("缺少 aliases。");
  if (!hasTags) reasons.push("缺少 tags。");
  if (!hasCapabilities) reasons.push("缺少 capabilities。");
  if (inferredTags.length > 0) reasons.push("已生成只读 inferredTags，未写回源文件。");

  if ((!hasMeaningfulName && !hasMeaningfulDescription) || (name.source === "fallback" && description.source === "fallback")) {
    return { level: "needs-review", reasons };
  }

  if (name.explicit && description.explicit && hasTags && hasCapabilities && (hasAliases || hasSourceProvenance) && suggestedFields.length === 0) {
    return { level: "complete", reasons };
  }

  if (hasMeaningfulName && hasMeaningfulDescription) {
    if (!description.explicit && description.source === "fallback") return { level: "weak", reasons };
    return { level: "usable", reasons };
  }

  if (hasMeaningfulName) return { level: "weak", reasons };
  return { level: "needs-review", reasons };
}

function getSourceFromResource(resource: AiosResource): SkillEnrichmentSource {
  if (getMetadataBoolean(resource, "registryListed") || getMetadataString(resource, "sourceKind") === "custom-registry") return "registry";
  if (getMetadataBoolean(resource, "discoveredOnly") || getMetadataStringArray(resource, "sourceKinds").includes("filesystem")) return "filesystem";
  if (getMetadataString(resource, "manifestPath")) return "manifest";
  return "manifest";
}

function selectEnrichmentSource(nameSource: SkillEnrichmentSource, descriptionSource: SkillEnrichmentSource): SkillEnrichmentSource {
  if (descriptionSource === "fallback" && nameSource === "fallback") return "fallback";
  if (descriptionSource === "inferred" || nameSource === "inferred") return "inferred";
  if (descriptionSource === "fallback" || nameSource === "fallback") return "fallback";
  if (descriptionSource === "curated" || nameSource === "curated") return "curated";
  if (descriptionSource === "manifest" || nameSource === "manifest") return "manifest";
  if (descriptionSource === "registry" || nameSource === "registry") return "registry";
  return "filesystem";
}

function hasAnyMeaningfulOriginalDescription(context: SkillContext): boolean {
  return context.sources.some((source) => isMeaningfulDescription(source.zhDescription) || isMeaningfulDescription(zhCN.skillDescriptions[source.name]));
}

function hasAnyMetadataArray(context: SkillContext, key: "aliases" | "tags" | "capabilities"): boolean {
  return context.sources.some((source) => getMetadataStringArray(source, key).length > 0);
}

function hasAnySourceProvenance(context: SkillContext): boolean {
  return context.sources.some((source) => {
    return Boolean(
      getMetadataString(source, "sourceKind") ||
        getMetadataStringArray(source, "sourceKinds").length > 0 ||
        getMetadataString(source, "manifestPath") ||
        getMetadataString(source, "canonicalPath") ||
        getMetadataBoolean(source, "registryListed") ||
        getMetadataBoolean(source, "indexed") ||
        getMetadataBoolean(source, "activeEntrypoint")
    );
  });
}

function isMeaningfulName(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !GENERIC_NAME_VALUES.has(trimmed);
}

export function isGenericSkillDescription(value: string | null | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return GENERIC_DESCRIPTION_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isMeaningfulDescription(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 8) return false;
  return !isGenericSkillDescription(trimmed);
}

function shortenPurpose(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 72) return trimmed;
  return `${trimmed.slice(0, 70)}...`;
}

function slugToReadableName(value: string): string {
  const normalized = value.trim().replace(/[_\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!normalized) return "";

  const known = KNOWN_SUBJECTS[normalized];
  if (known) return known;

  const tokens = normalized.split("-");
  return tokens.map(formatSlugToken).join("");
}

function formatSlugToken(token: string): string {
  const known = TOKEN_LABELS[token.toLowerCase()];
  if (known) return known;
  if (/^[a-z]$/.test(token)) return token.toUpperCase();
  if (/^\d+$/.test(token)) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function getSearchableText(context: SkillContext): string {
  return context.sources
    .flatMap((source) => [
      source.name,
      source.description,
      source.path,
      ...source.paths,
      getMetadataString(source, "category"),
      getMetadataString(source, "manifestPath"),
      getMetadataString(source, "canonicalPath"),
      getMetadataString(source, "discoveryRoot"),
      ...getMetadataStringArray(source, "tags"),
      ...getMetadataStringArray(source, "aliases"),
      ...getMetadataStringArray(source, "capabilities"),
      ...getMetadataStringArray(source, "sourceTypes")
    ])
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function hasToken(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
}
