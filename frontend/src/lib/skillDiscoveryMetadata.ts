import type { AiosResource } from "../types/inventory";

export interface SkillSourceBadge {
  key: string;
  label: string;
}

export const HUASHU_FAMILY_INHERITED_ALIASES = [
  "huashu",
  "huashu-nuwa",
  "huashu-nvwa",
  "nuwa",
  "nvwa",
  "女娲",
  "蒸馏",
  "distill",
  "distilled",
  "distillation",
  "persona",
  "perspective",
  "人物",
  "角色"
] as const;

const SOURCE_LABELS: Record<string, string> = {
  "active-entrypoint": "活跃入口",
  "skills-index": "索引技能",
  "custom-registry": "Registry 技能",
  filesystem: "文件系统发现"
};

export function getSkillSourceBadges(resource: AiosResource): SkillSourceBadge[] {
  const badges: SkillSourceBadge[] = [];
  if (getMetadataBoolean(resource, "activeEntrypoint") || resource.metadata?.entrypoint === true) badges.push({ key: "active-entrypoint", label: "活跃入口" });
  if (getMetadataBoolean(resource, "indexed")) badges.push({ key: "skills-index", label: "索引技能" });
  if (getMetadataBoolean(resource, "registryListed") || resource.capabilityType === "registry") badges.push({ key: "custom-registry", label: "Registry 技能" });
  if (getMetadataBoolean(resource, "discoveredOnly") || getMetadataStringArray(resource, "sourceKinds").includes("filesystem")) badges.push({ key: "filesystem", label: "文件系统发现" });
  if (getMetadataBoolean(resource, "distillationRelated")) badges.push({ key: "distillation", label: "蒸馏技能" });
  if (getMetadataBoolean(resource, "archived")) badges.push({ key: "archived", label: "归档技能" });
  if (getMetadataBoolean(resource, "discoveredOnly") || resource.metadata?.indexed === false) badges.push({ key: "unindexed", label: "未纳入索引" });
  return dedupeBadges(badges);
}

export function getSkillMetadataSearchText(resource: AiosResource): string {
  const metadata = resource.metadata;
  if (!metadata) return "";
  const terms = [
    getMetadataString(resource, "sourceKind"),
    ...getMetadataStringArray(resource, "sourceKinds"),
    getMetadataString(resource, "discoveryRoot"),
    getMetadataString(resource, "manifestPath"),
    getMetadataString(resource, "scanReason"),
    getMetadataString(resource, "category"),
    ...getMetadataStringArray(resource, "tags"),
    ...getMetadataStringArray(resource, "aliases"),
    ...getMetadataStringArray(resource, "capabilities"),
    ...getMetadataStringArray(resource, "sourceTypes"),
    ...getSkillSourceBadges(resource).map((badge) => badge.label),
    ...getSkillFamilyInheritedAliases(resource),
    ...getNuwaSearchVariants([resource.name, ...getMetadataStringArray(resource, "aliases"), ...getHuashuPathSignals(resource)])
  ];
  return terms.filter(Boolean).join(" ");
}

export function getSkillFamilyInheritedAliases(resource: AiosResource): string[] {
  return isHuashuFamilyResource(resource) ? [...HUASHU_FAMILY_INHERITED_ALIASES] : [];
}

export function isHuashuFamilyResource(resource: AiosResource): boolean {
  const searchable = [
    resource.name,
    resource.path,
    ...resource.paths,
    getMetadataString(resource, "manifestPath"),
    getMetadataString(resource, "canonicalPath"),
    getMetadataString(resource, "sourcePath"),
    getMetadataString(resource, "discoveryRoot"),
    getMetadataString(resource, "category"),
    ...getMetadataStringArray(resource, "aliases"),
    ...getMetadataStringArray(resource, "sourceTypes"),
    ...getMetadataStringArray(resource, "capabilities"),
    ...getMetadataStringArray(resource, "tags")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /huashu[-_/]n(?:u|v)wa/.test(searchable) || /huashu-nuwa\/examples/.test(searchable);
}

export function getMetadataString(resource: AiosResource, key: string): string | null {
  const value = resource.metadata?.[key];
  return typeof value === "string" ? value : null;
}

export function getMetadataStringArray(resource: AiosResource, key: string): string[] {
  const value = resource.metadata?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function getMetadataBoolean(resource: AiosResource, key: string): boolean {
  return resource.metadata?.[key] === true;
}

export function getDiscoveryBooleanLabel(resource: AiosResource, key: string): string {
  return getMetadataBoolean(resource, key) ? "是" : "否";
}

function getNuwaSearchVariants(values: string[]): string[] {
  const variants: string[] = [];
  for (const value of values) {
    if (value.includes("huashu-nuwa")) variants.push(value.replace(/huashu-nuwa/g, "huashu-nvwa"));
    if (value.includes("huashu-nvwa")) variants.push(value.replace(/huashu-nvwa/g, "huashu-nuwa"));
  }
  return [...new Set(variants)];
}

function getHuashuPathSignals(resource: AiosResource): string[] {
  return [
    resource.path,
    ...resource.paths,
    getMetadataString(resource, "manifestPath"),
    getMetadataString(resource, "canonicalPath"),
    getMetadataString(resource, "discoveryRoot")
  ].filter((value): value is string => Boolean(value));
}

function dedupeBadges(badges: SkillSourceBadge[]): SkillSourceBadge[] {
  const seen = new Set<string>();
  return badges.filter((badge) => {
    if (seen.has(badge.key)) return false;
    seen.add(badge.key);
    return true;
  });
}
