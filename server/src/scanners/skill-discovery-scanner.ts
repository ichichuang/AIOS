import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { AIOS_ROOT, APP_REPO_ROOT, shouldSkipDirectory } from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { readOnlySafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosResource, ResourceStatus, RiskLevel, ToolType } from "../domain/types.js";
import { readTextIfExists } from "../utils/fs-safe.js";

export const MAX_DISCOVERY_DIRS = 3000;
export const MAX_DISCOVERY_DEPTH = 10;
export const MAX_DISCOVERED_SKILLS = 2000;
export const MAX_SKILL_MANIFEST_BYTES = 64 * 1024;

const SAFE_MANIFEST_KEYS = new Set(["name", "description", "tags", "category", "aliases", "capabilities"]);
const ARRAY_MANIFEST_KEYS = new Set(["tags", "aliases", "capabilities"]);

export interface ParsedSkillManifestMetadata {
  name?: string;
  description?: string;
  tags: string[];
  category?: string;
  aliases: string[];
  capabilities: string[];
}

export interface SkillDiscoveryOptions {
  aiosRoot?: string;
  appRepoRoot?: string;
  roots?: string[];
  maxDirs?: number;
  maxDepth?: number;
  maxSkills?: number;
  maxManifestBytes?: number;
}

interface QueueItem {
  directory: string;
  depth: number;
  discoveryRoot: string;
}

interface RegistryLike {
  skills?: unknown[];
}

type MetadataRecord = Record<string, unknown>;

export function getDefaultSkillDiscoveryRoots(aiosRoot = AIOS_ROOT, appRepoRoot = APP_REPO_ROOT): string[] {
  return [
    path.join(aiosRoot, "skills"),
    path.join(aiosRoot, "skill-modules"),
    path.join(aiosRoot, "distilled-skills"),
    path.join(aiosRoot, "generated-skills"),
    path.join(aiosRoot, "skill-packs"),
    path.join(aiosRoot, "archive"),
    path.join(aiosRoot, "archives"),
    path.join(aiosRoot, "90-archive"),
    path.join(appRepoRoot, ".agents/skills")
  ];
}

export function parseSkillManifestMetadata(text: string): ParsedSkillManifestMetadata {
  const frontmatter = extractFrontmatter(text);
  const parsed = frontmatter ? parseYamlLite(frontmatter) : {};
  const heading = firstMarkdownHeading(text);
  const name = safeString(parsed.name) ?? heading;

  return {
    name,
    description: safeString(parsed.description),
    category: safeString(parsed.category),
    tags: safeStringArray(parsed.tags),
    aliases: safeStringArray(parsed.aliases),
    capabilities: safeStringArray(parsed.capabilities)
  };
}

export async function discoverFilesystemSkillResources(options: SkillDiscoveryOptions = {}): Promise<AiosResource[]> {
  const aiosRoot = options.aiosRoot ?? AIOS_ROOT;
  const appRepoRoot = options.appRepoRoot ?? APP_REPO_ROOT;
  const maxDirs = options.maxDirs ?? MAX_DISCOVERY_DIRS;
  const maxDepth = options.maxDepth ?? MAX_DISCOVERY_DEPTH;
  const maxSkills = options.maxSkills ?? MAX_DISCOVERED_SKILLS;
  const maxManifestBytes = options.maxManifestBytes ?? MAX_SKILL_MANIFEST_BYTES;
  const roots =
    options.roots ??
    uniqueStrings([
      ...getDefaultSkillDiscoveryRoots(aiosRoot, appRepoRoot),
      ...(await discoverNestedAgentsSkillRoots(aiosRoot, { maxDirs, maxDepth }))
    ]);

  const resources: AiosResource[] = [];
  let visitedDirs = 0;
  const queue: QueueItem[] = [];

  for (const root of roots) {
    if (await directoryExistsNoSymlink(root)) {
      queue.push({ directory: root, depth: 0, discoveryRoot: root });
    }
  }

  while (queue.length > 0 && visitedDirs < maxDirs && resources.length < maxSkills) {
    const current = queue.shift();
    if (!current) break;
    visitedDirs += 1;

    const manifestPath = path.join(current.directory, "SKILL.md");
    if ((await fileExistsNoSymlink(manifestPath)) && resources.length < maxSkills) {
      const text = await readTextIfExists(manifestPath, maxManifestBytes);
      if (text) {
        resources.push(createFilesystemSkillResource(parseSkillManifestMetadata(text), manifestPath, current.discoveryRoot, aiosRoot, appRepoRoot));
      }
    }

    if (current.depth >= maxDepth) continue;

    for (const entry of await listDirectoryNoSymlink(current.directory)) {
      if (!entry.isDirectory()) continue;
      if (entry.isSymbolicLink()) continue;
      if (shouldSkipDirectory(entry.name)) continue;
      queue.push({
        directory: path.join(current.directory, entry.name),
        depth: current.depth + 1,
        discoveryRoot: current.discoveryRoot
      });
    }
  }

  return resources;
}

export function expandRegistrySkillResources(registry: RegistryLike): AiosResource[] {
  if (!Array.isArray(registry.skills)) return [];

  const resources: AiosResource[] = [];
  for (const rawSkill of registry.skills) {
    if (!isRecord(rawSkill)) continue;
    const name = safeString(rawSkill.name);
    if (!name) continue;

    const manifestPath = safeString(rawSkill.skillMdPath) ?? manifestPathFromDirectory(safeString(rawSkill.canonicalPath));
    const canonicalPath = safeString(rawSkill.canonicalPath);
    const description = safeString(rawSkill.description) ?? `${name} registry skill metadata.`;
    const tags = safeStringArray(rawSkill.tags);
    const aliases = expandSkillAliases(name, safeStringArray(rawSkill.aliases));
    const capabilities = safeStringArray(rawSkill.capabilities);
    const category = safeString(rawSkill.category);
    const sourceTypes = safeStringArray(rawSkill.sourceTypes);
    const activePaths = safePathRecord(rawSkill.activePaths);
    const archivePaths = safePathRecord(rawSkill.archivePaths);
    const activeEntrypoint = Boolean(activePaths.codex || activePaths.agents || activePaths.claude);
    const primarySourcePath = manifestPath ?? canonicalPath ?? Object.values(activePaths)[0] ?? Object.values(archivePaths)[0] ?? "";
    const archived = isArchivedPath(primarySourcePath);
    const distillationRelated = isDistillationRelated({ name, description, category, tags, aliases, capabilities, manifestPath, sourceTypes });
    const paths = uniqueStrings([manifestPath, canonicalPath, ...Object.values(activePaths), ...Object.values(archivePaths)]);
    const risk = inferSkillRisk([name, description, category, ...tags, ...aliases, ...capabilities]);
    const base: AiosResource = {
      id: resourceId("aios-root", "skill-registry", name),
      name,
      toolType: "aios-root",
      capabilityType: "skill",
      status: archived ? "disabled" : "available",
      risk,
      path: paths[0],
      paths,
      description,
      safetyProfile: readOnlySafety([
        "Custom skill registry entry expanded as metadata only.",
        "The scanner does not execute, copy, or promote registry skills."
      ]),
      tokenPressure: tokenPressureForText(`${name} ${description} ${paths.join(" ")} ${tags.join(" ")} ${aliases.join(" ")}`, "Registry skill metadata."),
      prompts: [],
      metadata: {
        sourceKind: "custom-registry",
        sourceKinds: ["custom-registry"],
        manifestPath,
        canonicalPath,
        indexed: false,
        registryListed: true,
        activeEntrypoint,
        discoveredOnly: false,
        archived,
        distillationRelated,
        scanReason: "custom-skill-registry.json skills[] entry",
        category,
        tags,
        aliases,
        capabilities,
        sourceTypes,
        activePathKinds: Object.keys(activePaths),
        archivePathKinds: Object.keys(archivePaths)
      }
    };
    resources.push({ ...base, prompts: buildUsagePrompts(base) });
  }

  return resources;
}

export function dedupeSkillResources(resources: AiosResource[]): AiosResource[] {
  const byKey = new Map<string, AiosResource>();
  const passthrough: AiosResource[] = [];

  for (const resource of resources) {
    if (resource.capabilityType !== "skill" && resource.capabilityType !== "project-pack") {
      passthrough.push(resource);
      continue;
    }

    const key = dedupeKey(resource);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeSkillResource(existing, resource) : resource);
  }

  return [...byKey.values(), ...passthrough];
}

export function toManifestPath(sourcePath: string | undefined): string | undefined {
  if (!sourcePath) return undefined;
  return sourcePath.endsWith("SKILL.md") ? sourcePath : path.join(sourcePath, "SKILL.md");
}

export function expandSkillAliases(name: string, aliases: string[]): string[] {
  const variants: string[] = [];
  for (const value of [name, ...aliases]) {
    variants.push(value);
    if (value.includes("huashu-nuwa")) variants.push(value.replace(/huashu-nuwa/g, "huashu-nvwa"));
    if (value.includes("huashu-nvwa")) variants.push(value.replace(/huashu-nvwa/g, "huashu-nuwa"));
  }
  return uniqueStrings(variants.filter((value) => value !== name));
}

export function markSkillActiveEntrypoint(resource: AiosResource, activeNames: ReadonlySet<string>): AiosResource {
  if (resource.capabilityType !== "skill" && resource.capabilityType !== "project-pack") return resource;
  if (!activeNames.has(resource.name)) return resource;
  const metadata = mergeMetadata(resource.metadata, {
    activeEntrypoint: true,
    sourceKinds: ["active-entrypoint"],
    discoveredOnly: false
  });
  const updated = { ...resource, metadata };
  return { ...updated, prompts: buildUsagePrompts(updated) };
}

async function discoverNestedAgentsSkillRoots(aiosRoot: string, limits: { maxDirs: number; maxDepth: number }): Promise<string[]> {
  const roots: string[] = [];
  const queue: Array<{ directory: string; depth: number }> = [{ directory: aiosRoot, depth: 0 }];
  let visited = 0;

  while (queue.length > 0 && visited < limits.maxDirs) {
    const current = queue.shift();
    if (!current) break;
    visited += 1;

    if (path.basename(current.directory) === "skills" && path.basename(path.dirname(current.directory)) === ".agents") {
      roots.push(current.directory);
      continue;
    }

    if (current.depth >= limits.maxDepth) continue;
    for (const entry of await listDirectoryNoSymlink(current.directory)) {
      if (!entry.isDirectory()) continue;
      if (entry.isSymbolicLink()) continue;
      if (shouldSkipDirectory(entry.name)) continue;
      queue.push({ directory: path.join(current.directory, entry.name), depth: current.depth + 1 });
    }
  }

  return uniqueStrings(roots);
}

function createFilesystemSkillResource(
  metadata: ParsedSkillManifestMetadata,
  manifestPath: string,
  discoveryRoot: string,
  aiosRoot: string,
  appRepoRoot: string
): AiosResource {
  const name = metadata.name ?? path.basename(path.dirname(manifestPath));
  const description = metadata.description ?? `${name} filesystem-discovered skill metadata.`;
  const archived = isArchivedPath(manifestPath);
  const distillationRelated = isDistillationRelated({ name, description, category: metadata.category, tags: metadata.tags, aliases: metadata.aliases, capabilities: metadata.capabilities, manifestPath });
  const projectLocal = isInsidePath(manifestPath, appRepoRoot);
  const toolType: ToolType = projectLocal ? "project-local" : "aios-root";
  const capabilityType = projectLocal ? "project-pack" : "skill";
  const risk = inferSkillRisk([name, description, metadata.category, ...metadata.tags, ...metadata.aliases, ...metadata.capabilities]);
  const base: AiosResource = {
    id: resourceId(toolType, "skill-discovered", name, manifestPath),
    name,
    toolType,
    capabilityType,
    status: archived ? "disabled" : "available",
    risk,
    path: manifestPath,
    paths: [manifestPath],
    description,
    safetyProfile: readOnlySafety([
      "Filesystem skill discovery is bounded and read-only.",
      "Only safe SKILL.md metadata is retained; full manifest bodies are not stored."
    ]),
    tokenPressure: tokenPressureForText(`${name} ${description} ${manifestPath} ${metadata.tags.join(" ")} ${metadata.aliases.join(" ")}`, "Filesystem skill metadata."),
    prompts: [],
    metadata: {
      sourceKind: "filesystem",
      sourceKinds: ["filesystem"],
      discoveryRoot,
      manifestPath,
      indexed: false,
      registryListed: false,
      activeEntrypoint: false,
      discoveredOnly: true,
      archived,
      distillationRelated,
      scanReason: "bounded SKILL.md filesystem discovery",
      category: metadata.category,
      tags: metadata.tags,
      aliases: expandSkillAliases(name, metadata.aliases),
      capabilities: metadata.capabilities
    }
  };
  return { ...base, prompts: buildUsagePrompts(base) };
}

function extractFrontmatter(text: string): string | null {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") {
      return lines.slice(1, index).join("\n");
    }
  }
  return null;
}

function parseYamlLite(frontmatter: string): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const lines = frontmatter.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(lines[index] ?? "");
    if (!match) continue;
    const key = match[1];
    if (!SAFE_MANIFEST_KEYS.has(key)) continue;

    const inlineValue = match[2].trim();
    if (inlineValue) {
      output[key] = ARRAY_MANIFEST_KEYS.has(key) ? parseInlineArrayOrScalar(inlineValue) : sanitizeString(stripQuotes(inlineValue));
      continue;
    }

    const values: string[] = [];
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? "";
      const itemMatch = /^\s*-\s+(.+)$/.exec(nextLine);
      if (!itemMatch) break;
      values.push(sanitizeString(stripQuotes(itemMatch[1].trim())));
      index += 1;
    }
    if (values.length > 0) output[key] = values.filter(Boolean);
  }

  return output;
}

function parseInlineArrayOrScalar(value: string): string[] {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => sanitizeString(stripQuotes(item.trim())))
      .filter(Boolean);
  }
  const sanitized = sanitizeString(stripQuotes(value));
  return sanitized ? [sanitized] : [];
}

function firstMarkdownHeading(text: string): string | undefined {
  for (const line of text.split(/\r?\n/)) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    const heading = match ? sanitizeString(match[1].trim()) : undefined;
    if (heading) return heading;
  }
  return undefined;
}

function safeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? sanitizeString(value.trim()) : undefined;
}

function safeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map((item) => safeString(item)).filter((item): item is string => Boolean(item)));
  }
  const scalar = safeString(value);
  return scalar ? [scalar] : [];
}

function safePathRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value)
    .map(([key, rawPath]) => [key, safeString(rawPath)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  return Object.fromEntries(entries);
}

function sanitizeString(value: string): string {
  const trimmed = stripQuotes(value).trim();
  if (!trimmed) return "";
  if (isSecretLike(trimmed)) return "[redacted]";
  return trimmed;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}

function isSecretLike(value: string): boolean {
  return (
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /\bsk-[A-Za-z0-9_-]{20,}\b/.test(value) ||
    /\bAKIA[0-9A-Z]{16}\b/.test(value) ||
    /\b(password|api[_-]?key|secret|token)\s*[:=]\s*\S+/i.test(value)
  );
}

function manifestPathFromDirectory(directory: string | undefined): string | undefined {
  return directory ? path.join(directory, "SKILL.md") : undefined;
}

async function directoryExistsNoSymlink(targetPath: string): Promise<boolean> {
  try {
    const stats = await lstat(targetPath);
    return stats.isDirectory() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

async function fileExistsNoSymlink(targetPath: string): Promise<boolean> {
  try {
    const stats = await lstat(targetPath);
    return stats.isFile() && !stats.isSymbolicLink();
  } catch {
    return false;
  }
}

async function listDirectoryNoSymlink(targetPath: string): Promise<Awaited<ReturnType<typeof readdir>>> {
  try {
    return await readdir(targetPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

function dedupeKey(resource: AiosResource): string {
  const manifestPath = safeString(resource.metadata?.manifestPath) ?? (resource.path?.endsWith("SKILL.md") ? resource.path : undefined);
  if (manifestPath) return `manifest:${normalizePath(manifestPath)}`;
  return `name:${resource.name.toLowerCase()}`;
}

function mergeSkillResource(left: AiosResource, right: AiosResource): AiosResource {
  const base = preferResource(left, right);
  const other = base === left ? right : left;
  const metadata = mergeMetadata(base.metadata, other.metadata);
  const merged: AiosResource = {
    ...base,
    risk: maxRisk(base.risk, other.risk),
    status: mergeStatus(base.status, other.status),
    paths: uniqueStrings([...base.paths, ...other.paths]),
    path: base.path ?? other.path,
    description: preferDescription(base, other),
    metadata
  };
  return { ...merged, prompts: buildUsagePrompts(merged) };
}

function preferResource(left: AiosResource, right: AiosResource): AiosResource {
  const leftScore = resourceRichnessScore(left);
  const rightScore = resourceRichnessScore(right);
  return rightScore > leftScore ? right : left;
}

function resourceRichnessScore(resource: AiosResource): number {
  const metadata = resource.metadata ?? {};
  let score = 0;
  if (metadata.indexed === true) score += 100;
  if (metadata.registryListed === true) score += 30;
  if (metadata.discoveredOnly !== true) score += 10;
  score += resource.paths.length;
  return score;
}

function mergeMetadata(left: unknown, right: unknown): MetadataRecord {
  const leftRecord = isRecord(left) ? left : {};
  const rightRecord = isRecord(right) ? right : {};
  const indexed = leftRecord.indexed === true || rightRecord.indexed === true;
  const registryListed = leftRecord.registryListed === true || rightRecord.registryListed === true;
  const activeEntrypoint = leftRecord.activeEntrypoint === true || rightRecord.activeEntrypoint === true;
  const archived = leftRecord.archived === true || rightRecord.archived === true;
  const distillationRelated = leftRecord.distillationRelated === true || rightRecord.distillationRelated === true;
  const sourceKinds = uniqueStrings([...safeStringArray(leftRecord.sourceKinds), ...safeStringArray(rightRecord.sourceKinds), safeString(leftRecord.sourceKind), safeString(rightRecord.sourceKind)].filter(Boolean));
  const sourceKind = sourceKinds.includes("skills-index")
    ? "skills-index"
    : sourceKinds.includes("custom-registry")
      ? "custom-registry"
      : sourceKinds.includes("filesystem")
        ? "filesystem"
        : safeString(leftRecord.sourceKind) ?? safeString(rightRecord.sourceKind);

  return {
    ...leftRecord,
    ...rightRecord,
    sourceKind,
    sourceKinds,
    manifestPath: safeString(leftRecord.manifestPath) ?? safeString(rightRecord.manifestPath),
    discoveryRoot: safeString(leftRecord.discoveryRoot) ?? safeString(rightRecord.discoveryRoot),
    indexed,
    registryListed,
    activeEntrypoint,
    discoveredOnly: !indexed && !registryListed && !activeEntrypoint && (leftRecord.discoveredOnly === true || rightRecord.discoveredOnly === true),
    archived,
    distillationRelated,
    scanReason: uniqueStrings([safeString(leftRecord.scanReason), safeString(rightRecord.scanReason)].filter(Boolean)).join("; "),
    category: safeString(leftRecord.category) ?? safeString(rightRecord.category),
    tags: uniqueStrings([...safeStringArray(leftRecord.tags), ...safeStringArray(rightRecord.tags)]),
    aliases: uniqueStrings([...safeStringArray(leftRecord.aliases), ...safeStringArray(rightRecord.aliases)]),
    capabilities: uniqueStrings([...safeStringArray(leftRecord.capabilities), ...safeStringArray(rightRecord.capabilities)]),
    sourceTypes: uniqueStrings([...safeStringArray(leftRecord.sourceTypes), ...safeStringArray(rightRecord.sourceTypes)]),
    activePathKinds: uniqueStrings([...safeStringArray(leftRecord.activePathKinds), ...safeStringArray(rightRecord.activePathKinds)]),
    archivePathKinds: uniqueStrings([...safeStringArray(leftRecord.archivePathKinds), ...safeStringArray(rightRecord.archivePathKinds)])
  };
}

function preferDescription(base: AiosResource, other: AiosResource): string {
  if (!base.description.includes("metadata.") || other.description.includes("metadata.")) return base.description;
  return other.description;
}

function mergeStatus(base: ResourceStatus, other: ResourceStatus): ResourceStatus {
  if (base === "active" || other === "active") return "active";
  if (base === "available" || other === "available") return "available";
  if (base === "ok" || other === "ok") return "ok";
  if (base === "warn" || other === "warn") return "warn";
  if (base === "disabled" || other === "disabled") return "disabled";
  if (base === "missing" || other === "missing") return "missing";
  return "unknown";
}

function maxRisk(left: RiskLevel, right: RiskLevel): RiskLevel {
  const order: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
  return order[right] > order[left] ? right : left;
}

function inferSkillRisk(values: Array<string | undefined>): RiskLevel {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (/\b(rm\s+-rf|force\s+push|credential|secret|auth|token|api[_-]?key)\b/.test(text)) return "high";
  if (/\b(execute|shell|write|global|mcp|provider|automation|deploy)\b/.test(text)) return "medium";
  return "low";
}

function isArchivedPath(value: string): boolean {
  const normalized = normalizePath(value);
  return /(^|\/)(archive|archives|90-archive|backups)(\/|$)/.test(normalized) || /disabled|deprecated/.test(normalized);
}

function isDistillationRelated(input: {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  aliases?: string[];
  capabilities?: string[];
  manifestPath?: string;
  sourceTypes?: string[];
}): boolean {
  const text = [
    input.name,
    input.description,
    input.category,
    input.manifestPath,
    ...(input.tags ?? []),
    ...(input.aliases ?? []),
    ...(input.capabilities ?? []),
    ...(input.sourceTypes ?? [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /huashu|nuwa|nvwa|distill|distillation|distilled|perspective|persona|蒸馏|女娲|人物/.test(text);
}

function isInsidePath(candidate: string, root: string): boolean {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePath(value: string): string {
  return path.resolve(value).split(path.sep).join("/").toLowerCase();
}

function resourceId(...parts: string[]): string {
  return parts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}
