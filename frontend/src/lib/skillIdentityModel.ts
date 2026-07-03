import { getResourceDisplay, type ResourceDisplay } from "../i18n/resourceText";
import type { AiosResource, CapabilityType } from "../types/inventory";
import {
  getMetadataBoolean,
  getMetadataString,
  getMetadataStringArray,
  getSkillFamilyInheritedAliases,
  getSkillMetadataSearchText,
  type SkillSourceBadge
} from "./skillDiscoveryMetadata";
import { buildSkillDisplayEnrichment, getSkillQualitySearchText } from "./skillDisplayEnrichment";

export type SkillIdentityMode = "merged" | "source";

export interface SkillIdentityRow {
  id: string;
  identityKey: string;
  primaryResource: AiosResource;
  sources: AiosResource[];
  sourceBadges: SkillSourceBadge[];
  inheritedAliases: string[];
  mode: SkillIdentityMode;
}

export interface SkillIdentitySearchOptions {
  displayById?: ReadonlyMap<string, ResourceDisplay>;
  capabilitySearchTextById?: ReadonlyMap<string, string>;
}

const SKILL_VIEW_CAPABILITIES = new Set<CapabilityType>(["skill", "runtime-view", "registry", "project-pack"]);

const SOURCE_BADGE_LABELS: Record<string, string> = {
  "skills-index": "索引",
  "custom-registry": "Registry",
  filesystem: "文件系统",
  codex: "Codex",
  agents: "Agents",
  claude: "Claude",
  "project-pack": "项目包"
};

const SOURCE_BADGE_ORDER = ["skills-index", "custom-registry", "filesystem", "codex", "agents", "claude", "project-pack"] as const;

interface MutableSkillIdentity {
  identityKey: string;
  sources: AiosResource[];
}

export function isSkillIdentityResource(resource: AiosResource): boolean {
  return SKILL_VIEW_CAPABILITIES.has(resource.capabilityType);
}

export function buildSkillIdentityRows(resources: readonly AiosResource[]): SkillIdentityRow[] {
  const identitiesByKey = new Map<string, MutableSkillIdentity>();
  const identitiesByName = new Map<string, MutableSkillIdentity>();
  const runtimeSources: AiosResource[] = [];

  for (const resource of resources.filter(isSkillIdentityResource)) {
    if (resource.capabilityType === "runtime-view") {
      runtimeSources.push(resource);
      continue;
    }
    const identity = getOrCreateIdentity(identitiesByKey, getSkillIdentityKey(resource));
    identity.sources.push(resource);
    const nameKey = normalizeSkillName(resource.name);
    if (nameKey && !identitiesByName.has(nameKey)) identitiesByName.set(nameKey, identity);
  }

  for (const resource of runtimeSources) {
    const nameKey = normalizeSkillName(resource.name);
    const identity = identitiesByName.get(nameKey) ?? getOrCreateIdentity(identitiesByKey, getSkillIdentityKey(resource));
    identity.sources.push(resource);
    if (nameKey && !identitiesByName.has(nameKey)) identitiesByName.set(nameKey, identity);
  }

  return [...identitiesByKey.values()].map((identity) => finalizeSkillIdentity(identity, "merged"));
}

export function buildSkillSourceRows(resources: readonly AiosResource[]): SkillIdentityRow[] {
  return resources.filter(isSkillIdentityResource).map((resource) =>
    finalizeSkillIdentity(
      {
        identityKey: getSkillIdentityKey(resource),
        sources: [resource]
      },
      "source"
    )
  );
}

export function getSkillIdentityKey(resource: AiosResource): string {
  const manifestPath = getMetadataString(resource, "manifestPath");
  if (manifestPath) return `manifest:${normalizeIdentityPath(manifestPath)}`;

  const canonicalPath = getMetadataString(resource, "canonicalPath");
  if (canonicalPath) return `canonical:${normalizeIdentityPath(canonicalPath)}`;

  const skillManifestPath = [resource.path, ...resource.paths].find(isUsableSkillManifestPath);
  if (skillManifestPath) return `manifest:${normalizeIdentityPath(skillManifestPath)}`;

  const normalizedName = normalizeSkillName(resource.name);
  if (normalizedName) return `name:${normalizedName}`;

  return `active-name:${normalizeSkillName(resource.name) || resource.id.toLowerCase()}`;
}

export function getSkillIdentitySourceBadges(sources: readonly AiosResource[]): SkillSourceBadge[] {
  const keys = new Set<string>();

  for (const source of sources) {
    const sourceKinds = getSourceKinds(source);
    const sourceTypes = getMetadataStringArray(source, "sourceTypes");
    const activePathKinds = getMetadataStringArray(source, "activePathKinds");

    if (sourceKinds.includes("skills-index") || getMetadataBoolean(source, "indexed")) keys.add("skills-index");
    if (sourceKinds.includes("custom-registry") || getMetadataBoolean(source, "registryListed") || source.capabilityType === "registry") keys.add("custom-registry");
    if (sourceKinds.includes("filesystem") || getMetadataBoolean(source, "discoveredOnly")) keys.add("filesystem");
    if (source.toolType === "project-local" || source.capabilityType === "project-pack") keys.add("project-pack");

    addActiveEntrypointBadges(keys, source.toolType, sourceKinds, sourceTypes, activePathKinds);
  }

  return SOURCE_BADGE_ORDER.filter((key) => keys.has(key)).map((key) => ({ key, label: SOURCE_BADGE_LABELS[key] }));
}

export function filterSkillIdentityRows(rows: readonly SkillIdentityRow[], query: string, options: SkillIdentitySearchOptions = {}): SkillIdentityRow[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...rows];
  return rows.filter((row) => getSkillIdentitySearchText(row, options).includes(normalized));
}

export function getSkillIdentitySearchText(row: SkillIdentityRow, options: SkillIdentitySearchOptions = {}): string {
  const rowDisplay = options.displayById?.get(row.primaryResource.id) ?? getResourceDisplay(row.primaryResource);
  const rowEnrichment = buildSkillDisplayEnrichment(row, rowDisplay);
  const terms = [
    row.identityKey,
    row.mode === "source" ? "入口视图 来源视图 source runtime entrypoint" : "合并来源 技能身份 merged identity",
    ...row.sourceBadges.flatMap((badge) => [badge.key, badge.label]),
    ...row.inheritedAliases,
    getSkillQualitySearchText(rowEnrichment)
  ];

  for (const source of row.sources) {
    const display = options.displayById?.get(source.id) ?? getResourceDisplay(source);
    terms.push(
      source.id,
      source.name,
      source.toolType,
      source.capabilityType,
      source.status,
      source.risk,
      source.path ?? "",
      ...source.paths,
      source.description,
      display.zhName,
      display.technicalName,
      display.zhDescription,
      display.zhCategory,
      display.zhStatus,
      display.zhRisk,
      display.zhCapability,
      display.zhToolType,
      display.pathPreview,
      getSkillMetadataSearchText(source),
      options.capabilitySearchTextById?.get(source.id) ?? ""
    );
  }

  return terms.filter(Boolean).join(" ").toLowerCase();
}

function getOrCreateIdentity(identitiesByKey: Map<string, MutableSkillIdentity>, identityKey: string): MutableSkillIdentity {
  const existing = identitiesByKey.get(identityKey);
  if (existing) return existing;
  const identity: MutableSkillIdentity = { identityKey, sources: [] };
  identitiesByKey.set(identityKey, identity);
  return identity;
}

function finalizeSkillIdentity(identity: MutableSkillIdentity, mode: SkillIdentityMode): SkillIdentityRow {
  const sources = [...identity.sources];
  const primaryResource = selectPrimaryResource(sources);
  const sourceBadges = getSkillIdentitySourceBadges(sources);
  const inheritedAliases = uniqueStrings(sources.flatMap(getSkillFamilyInheritedAliases));
  const sourceIds = sources.map((source) => source.id).join("|");

  return {
    id: `${mode}:${identity.identityKey}:${sourceIds}`,
    identityKey: identity.identityKey,
    primaryResource,
    sources,
    sourceBadges,
    inheritedAliases,
    mode
  };
}

function selectPrimaryResource(sources: readonly AiosResource[]): AiosResource {
  const primary = [...sources].sort(comparePrimaryResource)[0];
  if (!primary) throw new Error("Skill identity row requires at least one source resource.");
  return primary;
}

function comparePrimaryResource(left: AiosResource, right: AiosResource): number {
  const rankDiff = getPrimaryResourceRank(left) - getPrimaryResourceRank(right);
  if (rankDiff !== 0) return rankDiff;
  return right.paths.length - left.paths.length;
}

function getPrimaryResourceRank(resource: AiosResource): number {
  const sourceKinds = getSourceKinds(resource);
  if (resource.capabilityType === "skill" && getMetadataBoolean(resource, "indexed")) return 0;
  if (resource.capabilityType === "skill" && getMetadataBoolean(resource, "registryListed")) return 1;
  if (resource.capabilityType === "skill" && sourceKinds.includes("filesystem")) return 2;
  if (resource.capabilityType === "project-pack") return 3;
  if (resource.capabilityType === "runtime-view") return 4;
  if (resource.capabilityType === "registry") return 5;
  return 9;
}

function addActiveEntrypointBadges(keys: Set<string>, toolType: AiosResource["toolType"], sourceKinds: string[], sourceTypes: string[], activePathKinds: string[]): void {
  const active = sourceKinds.includes("active-entrypoint") || sourceTypes.some((value) => value.startsWith("active-")) || activePathKinds.length > 0;
  if (!active) return;

  if (toolType === "codex" || sourceTypes.includes("active-codex") || activePathKinds.includes("codex")) keys.add("codex");
  if (toolType === "agents" || sourceTypes.includes("active-agents") || activePathKinds.includes("agents")) keys.add("agents");
  if (toolType === "claude" || sourceTypes.includes("active-claude") || activePathKinds.includes("claude")) keys.add("claude");
}

function getSourceKinds(resource: AiosResource): string[] {
  return uniqueStrings([getMetadataString(resource, "sourceKind"), ...getMetadataStringArray(resource, "sourceKinds")]);
}

function isUsableSkillManifestPath(value: string | undefined): value is string {
  if (!value) return false;
  const normalized = value.replace(/\\/g, "/").toLowerCase();
  return normalized.endsWith("/skill.md") || /^[a-z]:\/.+\/skill\.md$/i.test(normalized);
}

function normalizeIdentityPath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .replace(/^~(?=\/)/, "/users/cc")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .toLowerCase();
}

function normalizeSkillName(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}
