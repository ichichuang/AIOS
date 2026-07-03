import { existsSync } from "node:fs";
import { open, readdir, readFile, stat, lstat, writeFile } from "node:fs/promises";
import path from "node:path";

const HOME = "/Users/cc";
const AIOS_ROOT = "/Users/cc/.ai";
const APP_ROOT = "/Users/cc/.ai/AIOS";
const REPORT_PATH = path.join(APP_ROOT, ".ai/skill-inventory-full-audit.md");
const SKILLS_INDEX_PATH = path.join(AIOS_ROOT, "SKILLS_INDEX.json");
const REGISTRY_PATH = path.join(AIOS_ROOT, "state/custom-skill-registry.json");
const INVENTORY_PATH = path.join(APP_ROOT, "frontend/public/aios-inventory.snapshot.json");

const CODEX_SKILLS_DIR = path.join(HOME, ".codex/skills");
const AGENTS_SKILLS_DIR = path.join(HOME, ".agents/skills");
const CLAUDE_SKILLS_DIR = path.join(HOME, ".claude/skills");

const EXPLICIT_ROOTS = [
  path.join(AIOS_ROOT, "skills"),
  path.join(AIOS_ROOT, "skill-modules"),
  path.join(AIOS_ROOT, "distilled-skills"),
  path.join(AIOS_ROOT, "generated-skills"),
  path.join(AIOS_ROOT, "skill-packs"),
  path.join(AIOS_ROOT, "archive"),
  path.join(AIOS_ROOT, "archives"),
  path.join(AIOS_ROOT, "90-archive"),
  path.join(APP_ROOT, ".agents/skills")
];

const INSPECTED_CODE_PATHS = [
  "server/src/scanners/skill-discovery-scanner.ts",
  "server/src/scanners/skill-scanner.ts",
  "server/src/scanners/project-pack-scanner.ts",
  "server/src/scanners/aios-root-scanner.ts",
  "server/src/domain/path-policy.ts",
  "server/src/domain/types.ts",
  "server/src/domain/prompt-templates.ts",
  "server/src/utils/fs-safe.ts",
  "frontend/src/lib/filtering.ts",
  "frontend/src/lib/skillDiscoveryMetadata.ts",
  "frontend/src/lib/skillCapabilityClassifier.ts",
  "frontend/src/components/modules/SkillsModule.tsx",
  "frontend/src/components/resources/CompactSkillRow.tsx",
  "frontend/src/components/inspector/ResourceInspector.tsx",
  "frontend/public/aios-inventory.snapshot.json",
  ".ai/skill-coverage-audit.md"
];

const SKIP_DIRECTORY_NAMES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".Trash",
  ".cache",
  ".turbo",
  ".next",
  ".nuxt",
  ".output",
  ".vite",
  "Library",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "tmp",
  "temp",
  "logs",
  "log",
  "Cache",
  "Caches",
  "cache",
  "sessions",
  "session",
  "browser",
  "browsers"
]);

const SAFE_MANIFEST_KEYS = new Set(["name", "description", "tags", "category", "aliases", "capabilities"]);
const ARRAY_MANIFEST_KEYS = new Set(["tags", "aliases", "capabilities"]);
const MANIFEST_MAX_BYTES = 64 * 1024;
const SCAN_LIMITS = {
  root: AIOS_ROOT,
  maxDirs: 20000,
  maxDepth: 18,
  maxManifestBytes: MANIFEST_MAX_BYTES,
  followSymlinks: false
};

const SKILL_VIEW_CAPABILITIES = new Set(["skill", "runtime-view", "registry", "project-pack"]);
const FAMILY_REGEX = /huashu|huashu-nuwa|huashu-nvwa|nuwa|nvwa|女娲|蒸馏|distill|distilled|distillation|perspective|persona|人物|角色/i;
const DISTILLED_REGEX = /distill|distilled|distillation|perspective|persona|character|蒸馏|人物|角色/i;
const SECRET_REGEXES = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\b(password|api[_-]?key|secret|token)\s*[:=]\s*\S+/i
];

let redactionCount = 0;

async function main() {
  assertAppRoot();

  const [scan, index, registry, inventory, active] = await Promise.all([
    scanFilesystem(AIOS_ROOT, SCAN_LIMITS),
    readJson(SKILLS_INDEX_PATH, []),
    readJson(REGISTRY_PATH, {}),
    readJson(INVENTORY_PATH, { resources: [] }),
    readActiveEntrypoints()
  ]);

  const canonicalManifests = await collectManifestMetadata(scan.files.filter((file) => file.kind === "SKILL.md").map((file) => file.path));
  const indexEntries = Array.isArray(index) ? index : [];
  const registrySkills = Array.isArray(registry.skills) ? registry.skills.filter(isRecord) : [];
  const resources = Array.isArray(inventory.resources) ? inventory.resources.filter(isRecord) : [];
  const skillViewResources = resources.filter((resource) => SKILL_VIEW_CAPABILITIES.has(String(resource.capabilityType)));

  const report = buildReport({
    scan,
    canonicalManifests,
    indexEntries,
    registry,
    registrySkills,
    resources,
    skillViewResources,
    active
  });

  await writeFile(REPORT_PATH, report, "utf8");
  const summary = summarizeForStdout({ scan, canonicalManifests, resources, skillViewResources, active, registrySkills });
  process.stdout.write(`${summary}\nReport written: ${REPORT_PATH}\n`);
}

function assertAppRoot() {
  if (APP_ROOT !== "/Users/cc/.ai/AIOS") {
    throw new Error(`Unexpected app root: ${APP_ROOT}`);
  }
}

async function scanFilesystem(root, limits) {
  const files = [];
  const nestedAgentsRoots = new Set();
  const counters = {
    visitedDirs: 0,
    skippedSymlinkCount: 0,
    skippedDirectoryCount: 0,
    readmeSkillLikeCount: 0,
    skillMetadataFileCount: 0,
    limitsHit: false
  };

  const queue = [{ directory: root, depth: 0 }];
  while (queue.length > 0) {
    if (counters.visitedDirs >= limits.maxDirs) {
      counters.limitsHit = true;
      break;
    }
    const current = queue.shift();
    if (!current) break;
    counters.visitedDirs += 1;

    if (path.basename(current.directory) === "skills" && path.basename(path.dirname(current.directory)) === ".agents") {
      nestedAgentsRoots.add(current.directory);
    }

    let entries = [];
    try {
      entries = await readdir(current.directory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current.directory, entry.name);
      if (entry.isSymbolicLink()) {
        counters.skippedSymlinkCount += 1;
        continue;
      }

      if (entry.isDirectory()) {
        if (shouldSkipDirectory(entry.name) || entry.name.endsWith(".xcarchive")) {
          counters.skippedDirectoryCount += 1;
          continue;
        }
        if (current.depth + 1 > limits.maxDepth) {
          counters.limitsHit = true;
          continue;
        }
        queue.push({ directory: fullPath, depth: current.depth + 1 });
        continue;
      }

      if (!entry.isFile()) continue;
      const kind = classifySkillLikeFile(fullPath);
      if (kind) {
        files.push({ path: fullPath, kind });
      }
      if (isSkillLikeReadme(fullPath)) counters.readmeSkillLikeCount += 1;
      if (isSkillMetadataFile(fullPath)) counters.skillMetadataFileCount += 1;
    }
  }

  return {
    limits,
    files,
    nestedAgentsRoots: [...nestedAgentsRoots].sort(),
    counters
  };
}

function shouldSkipDirectory(name) {
  return SKIP_DIRECTORY_NAMES.has(name) || /^(chrome|chromium|firefox|safari)[-_]?(profile|profiles|cache)?$/i.test(name);
}

function classifySkillLikeFile(filePath) {
  const base = path.basename(filePath);
  if (base === "SKILL.md") return "SKILL.md";
  if (base === "skill.md") return "skill.md";
  if (base.endsWith(".skill.md") && base !== "skill.md") return "*.skill.md";
  return null;
}

function isSkillLikeReadme(filePath) {
  if (path.basename(filePath) !== "README.md") return false;
  const parent = path.dirname(filePath);
  const parts = parent.split(path.sep);
  return parts.includes("skills") || parts.includes("skill-modules") || parts.includes("skill-packs") || parts.includes("distilled-skills") || parts.includes("generated-skills");
}

function isSkillMetadataFile(filePath) {
  const base = path.basename(filePath);
  const ext = path.extname(base).toLowerCase();
  if (![".json", ".toml", ".yaml", ".yml"].includes(ext)) return false;
  return /skill/i.test(base);
}

async function collectManifestMetadata(paths) {
  const records = [];
  for (const manifestPath of paths.sort()) {
    const text = await readTextPrefix(manifestPath, MANIFEST_MAX_BYTES);
    const metadata = parseSkillManifestMetadata(text ?? "");
    const name = metadata.name ?? path.basename(path.dirname(manifestPath));
    records.push({
      name,
      basename: path.basename(path.dirname(manifestPath)),
      manifestPath,
      relativePath: relativeAios(manifestPath),
      sourceKind: sourceKindForPath(manifestPath),
      category: metadata.category,
      tags: metadata.tags,
      aliases: metadata.aliases,
      capabilities: metadata.capabilities,
      description: metadata.description,
      dedupeKey: `manifest:${normalizePath(manifestPath)}`,
      topCategory: topCategoryForManifest(manifestPath),
      distillationRelated: familyText({
        name,
        path: manifestPath,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags,
        aliases: metadata.aliases,
        capabilities: metadata.capabilities
      }).match(FAMILY_REGEX)
        ? true
        : false,
      distilledPersonaPerspective: familyText({
        name,
        path: manifestPath,
        description: metadata.description,
        category: metadata.category,
        tags: metadata.tags,
        aliases: metadata.aliases,
        capabilities: metadata.capabilities
      }).match(DISTILLED_REGEX)
        ? true
        : false
    });
  }
  return records;
}

function parseSkillManifestMetadata(text) {
  const frontmatter = extractFrontmatter(text);
  const parsed = frontmatter ? parseYamlLite(frontmatter) : {};
  const heading = firstMarkdownHeading(text);
  return {
    name: safeString(parsed.name) ?? heading,
    description: safeString(parsed.description),
    category: safeString(parsed.category),
    tags: safeStringArray(parsed.tags),
    aliases: safeStringArray(parsed.aliases),
    capabilities: safeStringArray(parsed.capabilities)
  };
}

function extractFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") return lines.slice(1, index).join("\n");
  }
  return null;
}

function parseYamlLite(frontmatter) {
  const output = {};
  const lines = frontmatter.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/.exec(lines[index] ?? "");
    if (!match) continue;
    const key = match[1];
    if (!SAFE_MANIFEST_KEYS.has(key)) continue;

    const inlineValue = match[2].trim();
    if (inlineValue) {
      output[key] = ARRAY_MANIFEST_KEYS.has(key) ? parseInlineArrayOrScalar(inlineValue) : safeString(stripQuotes(inlineValue));
      continue;
    }

    const values = [];
    while (index + 1 < lines.length) {
      const itemMatch = /^\s*-\s+(.+)$/.exec(lines[index + 1] ?? "");
      if (!itemMatch) break;
      values.push(safeString(stripQuotes(itemMatch[1].trim())));
      index += 1;
    }
    if (values.length > 0) output[key] = values.filter(Boolean);
  }
  return output;
}

function parseInlineArrayOrScalar(value) {
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => safeString(stripQuotes(item.trim())))
      .filter(Boolean);
  }
  const sanitized = safeString(stripQuotes(value));
  return sanitized ? [sanitized] : [];
}

function firstMarkdownHeading(text) {
  for (const line of text.split(/\r?\n/)) {
    const match = /^#\s+(.+)$/.exec(line.trim());
    const heading = match ? safeString(match[1].trim()) : undefined;
    if (heading) return heading;
  }
  return undefined;
}

function safeString(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = stripQuotes(value).trim();
  if (!trimmed) return undefined;
  if (SECRET_REGEXES.some((regex) => regex.test(trimmed))) {
    redactionCount += 1;
    return "[redacted]";
  }
  return trimmed.replace(/\s+/g, " ").slice(0, 240);
}

function safeStringArray(value) {
  if (Array.isArray(value)) return unique(value.map((item) => safeString(item)).filter(Boolean));
  const scalar = safeString(value);
  return scalar ? [scalar] : [];
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, "");
}

async function readTextPrefix(filePath, maxBytes) {
  try {
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      const result = await handle.read(buffer, 0, maxBytes, 0);
      return buffer.subarray(0, result.bytesRead).toString("utf8");
    } finally {
      await handle.close();
    }
  } catch {
    return null;
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function readActiveEntrypoints() {
  const [codex, agents, claude] = await Promise.all([
    listRuntimeSkillNames(CODEX_SKILLS_DIR, new Set([".system"])),
    listRuntimeSkillNames(AGENTS_SKILLS_DIR, new Set()),
    listRuntimeSkillNames(CLAUDE_SKILLS_DIR, new Set())
  ]);
  return {
    codex,
    agents,
    claude,
    union: new Set([...codex, ...agents, ...claude])
  };
}

async function listRuntimeSkillNames(directory, exclude) {
  const names = [];
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return names;
  }
  for (const entry of entries) {
    if (exclude.has(entry.name) || entry.name.startsWith(".") && directory === CLAUDE_SKILLS_DIR) continue;
    const fullPath = path.join(directory, entry.name);
    try {
      if ((await stat(fullPath)).isDirectory()) names.push(entry.name);
    } catch {
      continue;
    }
  }
  return names.sort((a, b) => a.localeCompare(b));
}

function buildReport(context) {
  const fsSummary = buildFilesystemSummary(context.scan, context.canonicalManifests);
  const family = buildHuashuFamilyAudit(context);
  const indexRegistry = buildIndexRegistryAudit(context);
  const inventory = buildInventoryAudit(context);
  const frontend = buildFrontendAudit(context, family, inventory);
  const rootCause = buildRootCauseAndFixPlan(family, inventory);

  return [
    "# AIOS Skill Inventory Full Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Scope: read-only metadata audit for ${APP_ROOT}.`,
    "",
    "No full `SKILL.md` bodies, raw prompt bodies, secrets, credential material, env values, auth/session values, or provider configs are included. Safe metadata only. Global files were read-only.",
    redactionCount > 0 ? `Secret-like text redactions in safe metadata fields: ${redactionCount}.` : "Secret-like text redactions in safe metadata fields: 0.",
    "",
    "## Executive Summary",
    "",
    summaryBullets(context, family, inventory).join("\n"),
    "",
    "## Files Inspected Before Scanning",
    "",
    table(["Path", "Purpose"], INSPECTED_CODE_PATHS.map((file) => [`\`${file}\``, inspectedPurpose(file)])),
    "",
    fsSummary,
    "",
    family.markdown,
    "",
    indexRegistry,
    "",
    inventory.markdown,
    "",
    frontend,
    "",
    rootCause,
    ""
  ].join("\n");
}

function buildFilesystemSummary(scan, manifests) {
  const totalByKind = countBy(scan.files, (file) => file.kind);
  const perRootRows = EXPLICIT_ROOTS.map((root) => {
    const within = scan.files.filter((file) => isInside(file.path, root));
    return [
      root,
      rootExistsNoSymlinkLabel(root),
      countKind(within, "SKILL.md"),
      countKind(within, "skill.md"),
      countKind(within, "*.skill.md"),
      scan.nestedAgentsRoots.includes(root) ? "yes" : root.endsWith(".agents/skills") && within.length > 0 ? "yes" : "no"
    ];
  });

  const categoryRows = [...countBy(manifests, (manifest) => manifest.topCategory ?? "(none)").entries()]
    .sort(compareCountRows)
    .map(([name, count]) => [name, count]);

  return [
    "## Part A: Filesystem Manifest Discovery Audit",
    "",
    "### Scan Limits And Counters",
    "",
    table(
      ["Field", "Value"],
      [
        ["root", scan.limits.root],
        ["maxDirs", scan.limits.maxDirs],
        ["maxDepth", scan.limits.maxDepth],
        ["maxManifestBytes", scan.limits.maxManifestBytes],
        ["followSymlinks", "false"],
        ["visitedDirectoryCount", scan.counters.visitedDirs],
        ["skippedSymlinkCount", scan.counters.skippedSymlinkCount],
        ["skippedDirectoryCount", scan.counters.skippedDirectoryCount],
        ["limitsHit", scan.counters.limitsHit ? "yes" : "no"]
      ]
    ),
    "",
    "### Exact Match Counts",
    "",
    table(
      ["File pattern", "Count", "Canonical use"],
      [
        ["`SKILL.md`", totalByKind.get("SKILL.md") ?? 0, "canonical scanner evidence"],
        ["`skill.md`", totalByKind.get("skill.md") ?? 0, "diagnostic only"],
        ["`*.skill.md`", totalByKind.get("*.skill.md") ?? 0, "diagnostic only"],
        ["`README.md` with skill-like parent", scan.counters.readmeSkillLikeCount, "diagnostic only"],
        ["JSON/TOML/YAML skill metadata file", scan.counters.skillMetadataFileCount, "diagnostic only"]
      ]
    ),
    "",
    "### Explicit Root Counts",
    "",
    table(["Root", "Exists as non-symlink dir", "SKILL.md", "skill.md", "*.skill.md", "Nested .agents/skills root"], perRootRows),
    "",
    "### Top-Level Category Counts For Canonical Manifests",
    "",
    table(["Top-level category", "SKILL.md count"], categoryRows),
    "",
    "### Nested `.agents/skills` Roots",
    "",
    scan.nestedAgentsRoots.length > 0 ? scan.nestedAgentsRoots.map((root) => `- \`${root}\``).join("\n") : "- None found within scan bounds."
  ].join("\n");
}

function buildHuashuFamilyAudit(context) {
  const { canonicalManifests, indexEntries, registrySkills, resources, active } = context;
  const manifestByPath = new Map(canonicalManifests.map((manifest) => [normalizePath(manifest.manifestPath), manifest]));
  const indexByManifest = mapByManifest(indexEntries.map(indexToRecord));
  const registryByManifest = mapByManifest(registrySkills.map(registryToRecord));
  const inventoryByManifest = mapInventoryByManifest(resources);

  const familyManifestsByPath = new Map();
  for (const manifest of canonicalManifests) {
    if (isFamilyRecord(manifest)) familyManifestsByPath.set(normalizePath(manifest.manifestPath), manifest);
  }
  for (const record of [...indexEntries.map(indexToRecord), ...registrySkills.map(registryToRecord), ...resources.map(inventoryToRecord)]) {
    if (!isFamilyRecord(record)) continue;
    const manifestPath = record.manifestPath ? normalizePath(record.manifestPath) : undefined;
    if (manifestPath && manifestByPath.has(manifestPath)) {
      familyManifestsByPath.set(manifestPath, manifestByPath.get(manifestPath));
    }
  }

  const familyManifests = [...familyManifestsByPath.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const directExamples = familyManifests.filter(isDirectHuashuExample);
  const examplePaths = new Set(directExamples.map((manifest) => normalizePath(manifest.manifestPath)));
  const inventoryExampleMatches = directExamples.filter((manifest) => inventoryByManifest.has(normalizePath(manifest.manifestPath)));
  const childAliasCoverage = directExamples.filter((manifest) => hasFamilyAlias(manifest));

  const search = {
    nuwa: searchSkillView(context.skillViewResources, "nuwa"),
    nvwa: searchSkillView(context.skillViewResources, "nvwa"),
    huashu: searchSkillView(context.skillViewResources, "huashu"),
    persona: searchSkillView(context.skillViewResources, "persona"),
    perspective: searchSkillView(context.skillViewResources, "perspective")
  };

  const tableRows = familyManifests.map((manifest) => {
    const key = normalizePath(manifest.manifestPath);
    const indexRecord = indexByManifest.get(key) ?? findByName(indexEntries.map(indexToRecord), manifest.name);
    const registryRecord = registryByManifest.get(key) ?? findByName(registrySkills.map(registryToRecord), manifest.name);
    const inventoryRecords = inventoryByManifest.get(key) ?? resources.map(inventoryToRecord).filter((record) => normalizeName(record.name) === normalizeName(manifest.name));
    const invSearchNvwa = inventoryRecords.some((record) => frontendHaystack(record.raw ?? record).includes("nvwa"));
    const invSearchNuwa = inventoryRecords.some((record) => frontendHaystack(record.raw ?? record).includes("nuwa"));
    return [
      manifest.name,
      manifest.basename,
      manifest.category ?? "",
      listInline(manifest.aliases),
      listInline(manifest.tags),
      listInline(manifest.capabilities),
      manifest.relativePath,
      "yes",
      indexRecord ? "yes" : "no",
      registryRecord ? "yes" : "no",
      active.codex.includes(manifest.name) ? "yes" : "no",
      active.agents.includes(manifest.name) ? "yes" : "no",
      active.claude.includes(manifest.name) ? "yes" : "no",
      inventoryRecords.length > 0 ? "yes" : "no",
      invSearchNuwa ? "yes" : "no",
      invSearchNvwa ? "yes" : "no"
    ];
  });

  const missingExamplePaths = [...examplePaths].filter((manifestPath) => !inventoryByManifest.has(manifestPath));
  const lostDiagnosis =
    missingExamplePaths.length === 0
      ? "The 20 direct example manifests are present in generated inventory as independent resources. They are not lost before inventory; the observed `nvwa` gap is search-alias inheritance, not inventory absence."
      : diagnoseMissingExamples(missingExamplePaths, context);

  const markdown = [
    "## Part B: `huashu-nuwa` / `huashu-nvwa` Family Audit",
    "",
    "### Family Counts",
    "",
    table(
      ["Metric", "Count / Result"],
      [
        ["huashu family canonical manifest count", familyManifests.length],
        ["direct child examples under `huashu-nuwa/examples/*/SKILL.md`", directExamples.length],
        ["direct examples present in generated inventory", `${inventoryExampleMatches.length} / ${directExamples.length}`],
        ["direct examples with own family aliases (`huashu`, `nuwa`, `nvwa`, `女娲`)", `${childAliasCoverage.length} / ${directExamples.length}`],
        ["`nuwa` search matches in Skills view", search.nuwa.length],
        ["`nvwa` search matches in Skills view", search.nvwa.length],
        ["`huashu` search matches in Skills view", search.huashu.length],
        ["`persona` search matches in Skills view", search.persona.length],
        ["`perspective` search matches in Skills view", search.perspective.length]
      ]
    ),
    "",
    "### Search Behavior",
    "",
    `- \`nuwa\` matches ${search.nuwa.length} skill-view resources because manifest paths under \`huashu-nuwa\` are included in the haystack.`,
    `- \`nvwa\` matches ${search.nvwa.length} skill-view resources because variants are generated only from each resource name and own aliases, not from manifest path segments or parent family aliases.`,
    `- Child/example alias inheritance: ${childAliasCoverage.length === directExamples.length ? "present for all direct examples" : "missing or partial for direct examples"}.`,
    `- Missing-example diagnosis: ${lostDiagnosis}`,
    "",
    "### Huashu Family Source Matrix",
    "",
    table(
      [
        "Skill name",
        "Dir basename",
        "Category",
        "Aliases",
        "Tags",
        "Capabilities",
        "Relative path",
        "Filesystem",
        "SKILLS_INDEX",
        "Registry",
        "Codex",
        "Agents",
        "Claude",
        "Inventory",
        "Search `nuwa`",
        "Search `nvwa`"
      ],
      tableRows
    )
  ].join("\n");

  return {
    familyManifests,
    directExamples,
    inventoryExampleMatches,
    search,
    childAliasCoverage,
    markdown
  };
}

function buildIndexRegistryAudit(context) {
  const { canonicalManifests, indexEntries, registry, registrySkills, active } = context;
  const filesystemNames = new Set(canonicalManifests.map((manifest) => manifest.name));
  const activeNames = active.union;
  const indexRecords = indexEntries.map(indexToRecord);
  const registryRecords = registrySkills.map(registryToRecord);
  const indexNames = new Set(indexRecords.map((record) => record.name).filter(Boolean));
  const registryNames = new Set(registryRecords.map((record) => record.name).filter(Boolean));

  const indexAudit = auditRecords(indexRecords, "index");
  const registryAudit = auditRecords(registryRecords, "registry");
  const sourceTypesCount = countRegistrySourceTypes(registrySkills);
  const comparisonRows = [
    ["index only", difference(indexNames, registryNames).length, listInline(difference(indexNames, registryNames).slice(0, 25))],
    ["registry only", difference(registryNames, indexNames).length, listInline(difference(registryNames, indexNames).slice(0, 25))],
    ["in both", intersection(indexNames, registryNames).length, listInline(intersection(indexNames, registryNames).slice(0, 25))],
    ["filesystem only", difference(filesystemNames, unionSets(indexNames, registryNames, activeNames)).length, listInline(difference(filesystemNames, unionSets(indexNames, registryNames, activeNames)).slice(0, 25))],
    ["active entrypoint only", difference(activeNames, unionSets(indexNames, registryNames, filesystemNames)).length, listInline(difference(activeNames, unionSets(indexNames, registryNames, filesystemNames)).slice(0, 25))]
  ];

  const distillationRows = registryRecords
    .filter(isFamilyRecord)
    .map((record) => [record.name, record.manifestPath ? relativeAios(record.manifestPath) : "", record.aliases.length, record.sourceTypes.join(", "), record.exists ? "yes" : "no"]);

  return [
    "## Part C: Index And Registry Audit",
    "",
    "### Registry Summary",
    "",
    table(
      ["Metric", "Value"],
      [
        ["registry generatedAt", safeString(registry.generatedAt) ?? ""],
        ["registryVersion", safeString(registry.registryVersion) ?? ""],
        ["skills[] entries", registrySkills.length],
        ["unique names", new Set(registryRecords.map((record) => record.name)).size],
        ["unique canonicalPath values", new Set(registryRecords.map((record) => normalizeOptionalPath(record.canonicalPath)).filter(Boolean)).size],
        ["unique skillMdPath values", new Set(registryRecords.map((record) => normalizeOptionalPath(record.manifestPath)).filter(Boolean)).size],
        ["alias values total", registryRecords.reduce((sum, record) => sum + record.aliases.length, 0)]
      ]
    ),
    "",
    "### Registry `sourceTypes` Counts",
    "",
    table(["sourceType", "Count"], [...sourceTypesCount.entries()].sort(compareCountRows)),
    "",
    "### Registry Data Quality",
    "",
    issueTable(registryAudit),
    "",
    "### SKILLS_INDEX Summary",
    "",
    table(
      ["Metric", "Value"],
      [
        ["entries", indexEntries.length],
        ["unique names", new Set(indexRecords.map((record) => record.name)).size],
        ["unique physicalPath values", new Set(indexRecords.map((record) => normalizeOptionalPath(record.physicalPath)).filter(Boolean)).size],
        ["unique entry values", new Set(indexRecords.map((record) => normalizeOptionalPath(record.entry)).filter(Boolean)).size],
        ["alias values total", indexRecords.reduce((sum, record) => sum + record.aliases.length, 0)]
      ]
    ),
    "",
    "### SKILLS_INDEX Data Quality",
    "",
    issueTable(indexAudit),
    "",
    "### Cross-Source Name Comparison",
    "",
    table(["Comparison", "Count", "Sample"], comparisonRows),
    "",
    "### Distilled / Persona / Perspective Registry Records",
    "",
    table(["Name", "Manifest path", "Alias count", "sourceTypes", "Path exists"], distillationRows)
  ].join("\n");
}

function buildInventoryAudit(context) {
  const { resources, skillViewResources } = context;
  const capabilityCounts = countBy(resources, (resource) => String(resource.capabilityType ?? ""));
  const toolCounts = countBy(resources, (resource) => String(resource.toolType ?? ""));
  const statusCounts = countBy(resources, (resource) => String(resource.status ?? ""));
  const riskCounts = countBy(resources, (resource) => String(resource.risk ?? ""));
  const sourceKindCounts = countBy(resources, (resource) => String(resource.metadata?.sourceKind ?? "(none)"));
  const sourceKindsCounts = new Map();
  for (const resource of resources) {
    const sourceKinds = Array.isArray(resource.metadata?.sourceKinds) ? resource.metadata.sourceKinds : [];
    if (sourceKinds.length === 0) increment(sourceKindsCounts, "(none)");
    for (const sourceKind of sourceKinds) increment(sourceKindsCounts, String(sourceKind));
  }
  const flagRows = ["indexed", "registryListed", "activeEntrypoint", "discoveredOnly", "archived", "distillationRelated"].map((flag) => [
    flag,
    resources.filter((resource) => resource.metadata?.[flag] === true).length,
    resources.filter((resource) => resource.metadata?.[flag] === false).length,
    resources.filter((resource) => resource.metadata?.[flag] === undefined).length
  ]);
  const duplicateGroups = buildDuplicateGroups(skillViewResources);
  const topUiGroups = duplicateGroups.filter((group) => group.resources.some((resource) => /top-ui-frontend-framework|frontend-skill/i.test(String(resource.name))));
  const familyResources = resources.filter((resource) => isFamilyRecord(inventoryToRecord(resource)));
  const directExampleResources = resources.filter((resource) => {
    const manifestPath = String(resource.metadata?.manifestPath ?? "");
    return isDirectHuashuExamplePath(manifestPath);
  });

  const duplicateRows = duplicateGroups.map((group, index) => [
    index + 1,
    group.sharedKeys.join("; "),
    group.classification,
    group.resources
      .map((resource) =>
        [
          resource.id,
          resource.name,
          resource.capabilityType,
          resource.toolType,
          sourceKindsLabel(resource),
          flagLabel(resource, "activeEntrypoint"),
          flagLabel(resource, "indexed"),
          flagLabel(resource, "registryListed"),
          flagLabel(resource, "discoveredOnly"),
          pathPreview(resource)
        ].join(" | ")
      )
      .join("<br>")
  ]);

  const markdown = [
    "## Part D: Generated Inventory Audit",
    "",
    "### Resource Counts",
    "",
    table(["capabilityType", "Count"], [...capabilityCounts.entries()].sort(compareCountRows)),
    "",
    table(["toolType", "Count"], [...toolCounts.entries()].sort(compareCountRows)),
    "",
    table(["status", "Count"], [...statusCounts.entries()].sort(compareCountRows)),
    "",
    table(["risk", "Count"], [...riskCounts.entries()].sort(compareCountRows)),
    "",
    table(["metadata.sourceKind", "Count"], [...sourceKindCounts.entries()].sort(compareCountRows)),
    "",
    table(["metadata.sourceKinds item", "Count"], [...sourceKindsCounts.entries()].sort(compareCountRows)),
    "",
    "### Metadata Flag Counts",
    "",
    table(["Flag", "true", "false", "undefined"], flagRows),
    "",
    "### Skills View Inclusion",
    "",
    table(
      ["Metric", "Count"],
      [
        ["skill-like resources included by `frontend/src/lib/filtering.ts`", skillViewResources.length],
        ["huashu family resources in generated inventory", familyResources.length],
        ["direct huashu example resources in generated inventory", directExampleResources.length],
        ["duplicate display groups by normalized identity", duplicateGroups.length],
        ["duplicate groups containing `top-ui-frontend-framework` or `frontend-skill`", topUiGroups.length]
      ]
    ),
    "",
    "### Duplicate Display Groups",
    "",
    table(
      [
        "#",
        "Shared normalized keys",
        "Classification",
        "Resources: id | name | capabilityType | toolType | sourceKinds | active | indexed | registry | discoveredOnly | path"
      ],
      duplicateRows
    ),
    "",
    "### `top-ui-frontend-framework` / `frontend-skill` Duplicate Groups",
    "",
    topUiGroups.length > 0
      ? table(
          ["Shared keys", "Resources"],
          topUiGroups.map((group) => [
            group.sharedKeys.join("; "),
            group.resources.map((resource) => `${resource.id} (${resource.capabilityType}, ${resource.toolType}, ${pathPreview(resource)})`).join("<br>")
          ])
        )
      : "No duplicate group containing `top-ui-frontend-framework` or `frontend-skill` was found.",
    "",
    "### Huashu Family Inventory Presence",
    "",
    table(
      ["Metric", "Count"],
      [
        ["family resources in inventory", familyResources.length],
        ["direct example resources in inventory", directExampleResources.length],
        ["direct examples independent resource names", new Set(directExampleResources.map((resource) => resource.name)).size]
      ]
    )
  ].join("\n");

  return {
    duplicateGroups,
    familyResources,
    directExampleResources,
    markdown
  };
}

function buildFrontendAudit(context, family, inventory) {
  const topUiSearch = searchSkillView(context.skillViewResources, "top-ui");
  const frontendSearch = searchSkillView(context.skillViewResources, "frontend");
  const nvwaSearch = family.search.nvwa;
  const nuwaSearch = family.search.nuwa;
  const duplicatesAreRuntimeViews = inventory.duplicateGroups.filter((group) => group.resources.some((resource) => resource.capabilityType === "runtime-view")).length;

  return [
    "## Part E: Frontend Search And Grouping Audit",
    "",
    "### Observations From Source Code",
    "",
    "- `frontend/src/lib/filtering.ts` includes `skill`, `runtime-view`, `registry`, and `project-pack` in the Skills view. That means identity resources and runtime/source views can appear as separate rows.",
    "- `SkillsModule.tsx` defaults to capability grouping. Capability grouping appends resources by current resource id and does not merge canonical skill identity rows with runtime-view/source rows.",
    "- Source grouping assigns each resource to the first matching source bucket, but this only changes grouping; it does not create a canonical identity row with source badges.",
    "- `skillDiscoveryMetadata.ts` builds search text from each resource's own metadata and creates `huashu-nuwa`/`huashu-nvwa` variants only from resource name and own aliases.",
    "- `CompactSkillRow.tsx` already displays source badges on a row, but runtime-view rows remain independent resources.",
    "- `ResourceInspector.tsx` shows core discovery booleans and manifest path, but does not expose full source provenance details such as every merged source row or active client names.",
    "",
    "### Search Counts",
    "",
    table(
      ["Query", "Skill-view matches", "Sample"],
      [
        ["`nuwa`", nuwaSearch.length, listInline(nuwaSearch.slice(0, 20).map((resource) => resource.name))],
        ["`nvwa`", nvwaSearch.length, listInline(nvwaSearch.slice(0, 20).map((resource) => resource.name))],
        ["`top-ui`", topUiSearch.length, listInline(topUiSearch.slice(0, 20).map((resource) => `${resource.name} (${resource.capabilityType})`))],
        ["`frontend`", frontendSearch.length, listInline(frontendSearch.slice(0, 20).map((resource) => `${resource.name} (${resource.capabilityType})`))]
      ]
    ),
    "",
    "### Answers",
    "",
    "- Default capability grouping includes discovered-only, registry-listed, active-entrypoint-marked canonical resources, project-pack resources, registry resources, and runtime-view resources because all are passed through the Skills view capability filter.",
    "- Active entrypoints should usually be source badges or source details on canonical skill identity rows. Separate runtime rows are useful only behind an explicit `show runtime views` toggle.",
    "- Huashu child/example skills do not reliably inherit parent-family aliases. Their paths contain `huashu-nuwa`, so `nuwa` can match via path, but `nvwa` is absent unless the child name or own aliases include it.",
    `- Searching \`nvwa\` currently returns ${nvwaSearch.length} resources, while \`nuwa\` returns ${nuwaSearch.length}; this is the alias/path variant gap.`,
    `- Searching \`frontend\` returns ${frontendSearch.length} resources and \`top-ui\` returns ${topUiSearch.length}. Duplicate-looking rows are mostly source/identity modeling duplicates, not necessarily duplicate physical manifests.`,
    `- Duplicate groups with runtime-view rows: ${duplicatesAreRuntimeViews} / ${inventory.duplicateGroups.length}.`,
    "",
    "### Proposed UI / Source Model Improvements",
    "",
    "- Build an identity row keyed by normalized manifest path first, then canonical path, then normalized skill name.",
    "- Render source badges on that identity row for `skills-index`, `custom-registry`, `filesystem`, `active-entrypoint`, `project-pack`, and `runtime-view` provenance.",
    "- Add inspector source details: merged sourceKinds, active client names, registry/index paths, manifest path, canonical path, and discovered root.",
    "- Add a toggle to show active-entrypoint runtime views as separate rows for debugging.",
    "- Add family/inherited aliases for huashu descendants: `huashu`, `huashu-nuwa`, `huashu-nvwa`, `nuwa`, `nvwa`, `女娲`, `蒸馏`, `persona`, `perspective`, `人物`, `角色`.",
    "- Add a distilled-family grouping that treats `huashu-nuwa/examples/*` as children of the parent family while keeping each example independently inspectable."
  ].join("\n");
}

function buildRootCauseAndFixPlan(family, inventory) {
  const scannerGap =
    family.directExamples.length === family.inventoryExampleMatches.length
      ? "No current uppercase `SKILL.md` scanner coverage gap for the huashu examples; lowercase/non-standard manifests remain diagnostic-only."
      : "Some huashu examples are missing from filesystem or inventory coverage.";

  return [
    "## Part F: Root Cause And Fix Plan",
    "",
    "### Root Causes",
    "",
    table(
      ["Cause", "Assessment"],
      [
        ["scanner coverage gap", scannerGap],
        ["registry expansion gap", "Registry expansion exists now, but entries without `skillMdPath`/`canonicalPath` remain lower-confidence and should be tested."],
        ["dedupe gap", `${inventory.duplicateGroups.length} normalized duplicate display groups remain in the generated inventory/Skills view model.`],
        ["alias/search inheritance gap", "Huashu child/example skills do not inherit parent aliases; `nvwa` variants are generated from name/aliases only, not path/family metadata."],
        ["source-vs-identity UI modeling gap", "Runtime entrypoints, registry resources, project packs, and canonical skills are all first-class rows in Skills view instead of being merged into identity rows with provenance badges."],
        ["actual missing files", family.directExamples.length === 20 ? "The expected 20 direct huashu example `SKILL.md` files exist." : `Expected 20 direct examples, found ${family.directExamples.length}.`]
      ]
    ),
    "",
    "### Prioritized Fix Plan",
    "",
    "- P0: Add exact audit/search regression tests for `nuwa`, `nvwa`, `huashu`, `top-ui`, and `frontend`; assert that the 20 direct examples are present in inventory and searchable by family terms.",
    "- P1: Add an identity model/dedupe layer for Skills view keyed by normalized manifest path, canonical path, and normalized skill name; keep source provenance as metadata.",
    "- P2: Add family alias inheritance for `huashu-nuwa/examples/*` and registry/index descendants: `huashu`, `huashu-nuwa`, `huashu-nvwa`, `nuwa`, `nvwa`, `女娲`, `蒸馏`, `persona`, `perspective`, `人物`, `角色`.",
    "- P3: Render source badges and source details in row/inspector; suppress runtime-view duplicate rows by default behind a debug toggle.",
    "- P4: Add scanner support for non-standard manifest names only if product policy wants diagnostic manifests to become canonical resources; keep uppercase `SKILL.md` as the current canonical contract unless changed deliberately."
  ].join("\n");
}

function summaryBullets(context, family, inventory) {
  return [
    `- Total uppercase filesystem \`SKILL.md\` files found under ${AIOS_ROOT}: ${context.scan.files.filter((file) => file.kind === "SKILL.md").length}.`,
    `- Huashu family manifest count: ${family.familyManifests.length}; direct distilled examples: ${family.directExamples.length}.`,
    `- Distilled/persona/perspective canonical manifest count: ${context.canonicalManifests.filter((manifest) => manifest.distilledPersonaPerspective).length}.`,
    `- The 20 direct examples are ${family.inventoryExampleMatches.length === family.directExamples.length && family.directExamples.length === 20 ? "present" : "not fully present"} in generated inventory as independent resources (${family.inventoryExampleMatches.length}/${family.directExamples.length}).`,
    `- Duplicate display group count in Skills view resources: ${inventory.duplicateGroups.length}.`,
    `- Most likely duplicate cause: runtime/source records are modeled as rows beside canonical identity records; dedupe happens in server skill resources, not in the frontend identity presentation model.`,
    `- Most likely \`nvwa\` gap: alias variants are generated from resource name/aliases only, while child examples rely on \`huashu-nuwa\` path segments and do not inherit parent \`nvwa\` aliases.`
  ];
}

function auditRecords(records, kind) {
  const missing = {
    missingSkillMdPath: [],
    missingCanonicalPath: [],
    missingAliases: [],
    duplicateName: [],
    duplicateCanonicalPath: [],
    duplicateSkillMdPath: [],
    pathDoesNotExist: [],
    directoryWithoutSkill: []
  };
  if (kind === "index") {
    missing.missingPhysicalPath = [];
    missing.missingEntry = [];
    delete missing.missingSkillMdPath;
    delete missing.missingCanonicalPath;
  }

  const nameCounts = countBy(records, (record) => normalizeName(record.name));
  const canonicalCounts = countBy(records.filter((record) => record.canonicalPath), (record) => normalizePath(record.canonicalPath));
  const manifestCounts = countBy(records.filter((record) => record.manifestPath), (record) => normalizePath(record.manifestPath));
  const physicalCounts = countBy(records.filter((record) => record.physicalPath), (record) => normalizePath(record.physicalPath));

  for (const record of records) {
    if (kind === "registry") {
      if (!record.manifestPath) missing.missingSkillMdPath.push(record);
      if (!record.canonicalPath) missing.missingCanonicalPath.push(record);
    } else {
      if (!record.physicalPath) missing.missingPhysicalPath.push(record);
      if (!record.entry) missing.missingEntry.push(record);
    }
    if (record.aliases.length === 0) missing.missingAliases.push(record);
    if ((nameCounts.get(normalizeName(record.name)) ?? 0) > 1) missing.duplicateName.push(record);
    if (record.canonicalPath && (canonicalCounts.get(normalizePath(record.canonicalPath)) ?? 0) > 1) missing.duplicateCanonicalPath.push(record);
    if (record.manifestPath && (manifestCounts.get(normalizePath(record.manifestPath)) ?? 0) > 1) missing.duplicateSkillMdPath.push(record);
    if (record.physicalPath && (physicalCounts.get(normalizePath(record.physicalPath)) ?? 0) > 1) missing.duplicatePhysicalPath = [...(missing.duplicatePhysicalPath ?? []), record];
    if (record.primaryPath && !record.exists) missing.pathDoesNotExist.push(record);
    if (record.directoryPath && record.directoryExists && !record.directorySkillExists) missing.directoryWithoutSkill.push(record);
  }
  return missing;
}

function issueTable(audit) {
  return table(
    ["Issue", "Count", "Sample"],
    Object.entries(audit).map(([issue, records]) => [
      issue,
      records.length,
      listInline(records.slice(0, 20).map((record) => `${record.name}${record.primaryPath ? ` -> ${relativeAios(record.primaryPath)}` : ""}`))
    ])
  );
}

function indexToRecord(entry) {
  const physicalPath = safeString(entry.physicalPath);
  const entryPath = safeString(entry.entry);
  const manifestPath = toManifestPath(physicalPath ?? entryPath);
  const primaryPath = physicalPath ?? entryPath ?? manifestPath;
  const directoryPath = physicalPath && !physicalPath.endsWith("SKILL.md") ? physicalPath : undefined;
  return {
    raw: entry,
    name: safeString(entry.name) ?? "",
    category: safeString(entry.category),
    description: safeString(entry.description),
    tags: safeStringArray(entry.tags),
    aliases: safeStringArray(entry.aliases),
    capabilities: safeStringArray(entry.capabilities),
    sourceTypes: [],
    physicalPath,
    entry: entryPath,
    canonicalPath: physicalPath,
    manifestPath,
    primaryPath,
    directoryPath,
    exists: primaryPath ? pathExistsCached(primaryPath) : false,
    directoryExists: directoryPath ? pathExistsCached(directoryPath) : false,
    directorySkillExists: directoryPath ? pathExistsCached(path.join(directoryPath, "SKILL.md")) : false
  };
}

function registryToRecord(entry) {
  const canonicalPath = safeString(entry.canonicalPath);
  const manifestPath = safeString(entry.skillMdPath) ?? toManifestPath(canonicalPath);
  const primaryPath = manifestPath ?? canonicalPath;
  return {
    raw: entry,
    name: safeString(entry.name) ?? "",
    category: safeString(entry.category),
    description: safeString(entry.description),
    tags: safeStringArray(entry.tags),
    aliases: safeStringArray(entry.aliases),
    capabilities: safeStringArray(entry.capabilities),
    sourceTypes: safeStringArray(entry.sourceTypes),
    canonicalPath,
    manifestPath,
    primaryPath,
    directoryPath: canonicalPath,
    exists: primaryPath ? pathExistsCached(primaryPath) : false,
    directoryExists: canonicalPath ? pathExistsCached(canonicalPath) : false,
    directorySkillExists: canonicalPath ? pathExistsCached(path.join(canonicalPath, "SKILL.md")) : false
  };
}

function inventoryToRecord(resource) {
  return {
    raw: resource,
    name: safeString(resource.name) ?? "",
    category: safeString(resource.metadata?.category),
    description: safeString(resource.description),
    tags: safeStringArray(resource.metadata?.tags),
    aliases: safeStringArray(resource.metadata?.aliases),
    capabilities: safeStringArray(resource.metadata?.capabilities),
    sourceTypes: safeStringArray(resource.metadata?.sourceTypes),
    canonicalPath: safeString(resource.metadata?.canonicalPath),
    manifestPath: safeString(resource.metadata?.manifestPath),
    primaryPath: safeString(resource.path),
    paths: safeStringArray(resource.paths)
  };
}

const pathExistenceCache = new Map();
function pathExistsCached(targetPath) {
  const normalized = normalizePath(targetPath);
  if (!pathExistenceCache.has(normalized)) {
    pathExistenceCache.set(normalized, existsSync(targetPath));
  }
  return pathExistenceCache.get(normalized);
}

function mapByManifest(records) {
  const map = new Map();
  for (const record of records) {
    if (!record.manifestPath) continue;
    map.set(normalizePath(record.manifestPath), record);
  }
  return map;
}

function mapInventoryByManifest(resources) {
  const map = new Map();
  for (const resource of resources) {
    const manifestPath = safeString(resource.metadata?.manifestPath);
    if (!manifestPath) continue;
    const key = normalizePath(manifestPath);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(resource);
  }
  return map;
}

function buildDuplicateGroups(resources) {
  const idToResource = new Map(resources.map((resource) => [resource.id, resource]));
  const dsu = new DisjointSet(resources.map((resource) => resource.id));
  const keyToIds = new Map();

  for (const resource of resources) {
    for (const key of identityKeys(resource)) {
      if (!keyToIds.has(key)) keyToIds.set(key, []);
      keyToIds.get(key).push(resource.id);
    }
  }

  for (const ids of keyToIds.values()) {
    if (ids.length < 2) continue;
    for (let index = 1; index < ids.length; index += 1) dsu.union(ids[0], ids[index]);
  }

  const components = new Map();
  for (const resource of resources) {
    const root = dsu.find(resource.id);
    if (!components.has(root)) components.set(root, []);
    components.get(root).push(resource);
  }

  const groups = [];
  for (const componentResources of components.values()) {
    if (componentResources.length < 2) continue;
    const ids = new Set(componentResources.map((resource) => resource.id));
    const sharedKeys = [...keyToIds.entries()]
      .filter(([, keyIds]) => keyIds.filter((id) => ids.has(id)).length > 1)
      .map(([key]) => key)
      .sort();
    if (sharedKeys.length === 0) continue;
    groups.push({
      sharedKeys,
      resources: componentResources.sort((a, b) => String(a.id).localeCompare(String(b.id))),
      classification: classifyDuplicateGroup(componentResources, sharedKeys)
    });
  }

  return groups.sort((a, b) => a.sharedKeys[0].localeCompare(b.sharedKeys[0]));
}

class DisjointSet {
  constructor(ids) {
    this.parent = new Map(ids.map((id) => [id, id]));
  }

  find(id) {
    const parent = this.parent.get(id);
    if (!parent || parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot) this.parent.set(rightRoot, leftRoot);
  }
}

function identityKeys(resource) {
  const keys = new Set();
  const name = normalizeName(resource.name);
  if (name) keys.add(`name:${name}`);
  const manifestPath = safeString(resource.metadata?.manifestPath) ?? (String(resource.path ?? "").endsWith("SKILL.md") ? String(resource.path) : undefined);
  if (manifestPath) keys.add(`manifest:${normalizePath(manifestPath)}`);
  const canonicalPath = safeString(resource.metadata?.canonicalPath);
  if (canonicalPath) keys.add(`canonical:${normalizePath(canonicalPath)}`);
  if (resource.metadata?.activeEntrypoint === true || resource.metadata?.entrypoint === true) keys.add(`active-name:${name}`);
  for (const alias of safeStringArray(resource.metadata?.aliases)) {
    const normalized = normalizeName(alias);
    if (normalized.length >= 4 && !["frontend", "backend", "design", "security"].includes(normalized)) keys.add(`alias:${normalized}`);
  }
  return keys;
}

function classifyDuplicateGroup(resources, sharedKeys) {
  const hasRuntime = resources.some((resource) => resource.capabilityType === "runtime-view");
  const hasCanonical = resources.some((resource) => resource.capabilityType === "skill");
  const hasProjectPack = resources.some((resource) => resource.capabilityType === "project-pack");
  const hasSameManifest = sharedKeys.some((key) => key.startsWith("manifest:"));
  if (hasSameManifest && resources.length > 1) return "unintended duplicate row risk: same manifest identity appears in multiple resources";
  if (hasRuntime && hasCanonical) return "source duplicate: active runtime-view row should usually be a badge on canonical skill row";
  if (hasRuntime) return "source duplicate: multiple runtime entrypoints should usually collapse into one identity row";
  if (hasProjectPack && hasCanonical) return "source duplicate: project-pack and canonical skill share identity terms";
  return "potential true duplicate or alias collision; inspect source details";
}

function frontendHaystack(resource) {
  const metadata = resource.metadata ?? {};
  const terms = [
    resource.name,
    resource.toolType,
    resource.capabilityType,
    resource.status,
    resource.risk,
    resource.path,
    ...safeStringArray(resource.paths),
    resource.description,
    metadata.sourceKind,
    ...safeStringArray(metadata.sourceKinds),
    metadata.discoveryRoot,
    metadata.manifestPath,
    metadata.scanReason,
    metadata.category,
    ...safeStringArray(metadata.tags),
    ...safeStringArray(metadata.aliases),
    ...safeStringArray(metadata.capabilities),
    ...safeStringArray(metadata.sourceTypes),
    ...skillSourceBadges(resource).map((badge) => badge.label),
    ...nuwaVariants([String(resource.name ?? ""), ...safeStringArray(metadata.aliases)])
  ];
  return terms.filter(Boolean).join(" ").toLowerCase();
}

function searchSkillView(resources, query) {
  const normalized = query.toLowerCase();
  return resources.filter((resource) => frontendHaystack(resource).includes(normalized));
}

function skillSourceBadges(resource) {
  const badges = [];
  if (resource.metadata?.activeEntrypoint === true || resource.metadata?.entrypoint === true) badges.push({ key: "active-entrypoint", label: "活跃入口" });
  if (resource.metadata?.indexed === true) badges.push({ key: "skills-index", label: "索引技能" });
  if (resource.metadata?.registryListed === true || resource.capabilityType === "registry") badges.push({ key: "custom-registry", label: "Registry 技能" });
  if (resource.metadata?.discoveredOnly === true || safeStringArray(resource.metadata?.sourceKinds).includes("filesystem")) badges.push({ key: "filesystem", label: "文件系统发现" });
  if (resource.metadata?.distillationRelated === true) badges.push({ key: "distillation", label: "蒸馏技能" });
  if (resource.metadata?.archived === true) badges.push({ key: "archived", label: "归档技能" });
  if (resource.metadata?.discoveredOnly === true || resource.metadata?.indexed === false) badges.push({ key: "unindexed", label: "未纳入索引" });
  return dedupeBy(badges, (badge) => badge.key);
}

function nuwaVariants(values) {
  const variants = [];
  for (const value of values) {
    if (value.includes("huashu-nuwa")) variants.push(value.replace(/huashu-nuwa/g, "huashu-nvwa"));
    if (value.includes("huashu-nvwa")) variants.push(value.replace(/huashu-nvwa/g, "huashu-nuwa"));
  }
  return unique(variants);
}

function sourceKindForPath(filePath) {
  if (isInside(filePath, APP_ROOT)) return "project-local";
  if (isInside(filePath, path.join(AIOS_ROOT, "skill-modules"))) return "skill-modules";
  if (isInside(filePath, path.join(AIOS_ROOT, "skills"))) return "skills-view";
  return "filesystem";
}

function topCategoryForManifest(filePath) {
  if (isInside(filePath, path.join(AIOS_ROOT, "skill-modules"))) {
    return filePath.slice(path.join(AIOS_ROOT, "skill-modules").length + 1).split(path.sep)[0];
  }
  if (isInside(filePath, APP_ROOT)) return "AIOS";
  const rel = path.relative(AIOS_ROOT, filePath).split(path.sep);
  return rel[0] || "(root)";
}

function isDirectHuashuExample(manifest) {
  return isDirectHuashuExamplePath(manifest.manifestPath);
}

function isDirectHuashuExamplePath(manifestPath) {
  const normalized = normalizePath(manifestPath);
  const prefix = normalizePath(path.join(AIOS_ROOT, "skill-modules/07-knowledge-research/huashu-nuwa/examples"));
  if (!normalized.startsWith(`${prefix}/`)) return false;
  const rel = normalized.slice(prefix.length + 1).split("/");
  return rel.length === 2 && rel[1] === "skill.md";
}

function hasFamilyAlias(record) {
  return record.aliases.some((alias) => /huashu|nuwa|nvwa|女娲/i.test(alias));
}

function isFamilyRecord(record) {
  return FAMILY_REGEX.test(familyText(record));
}

function familyText(record) {
  return [
    record.name,
    record.description,
    record.category,
    record.path,
    record.manifestPath,
    record.canonicalPath,
    ...(record.tags ?? []),
    ...(record.aliases ?? []),
    ...(record.capabilities ?? []),
    ...(record.sourceTypes ?? [])
  ]
    .filter(Boolean)
    .join(" ");
}

function diagnoseMissingExamples(missingExamplePaths, context) {
  const filesystemPaths = new Set(context.canonicalManifests.map((manifest) => normalizePath(manifest.manifestPath)));
  const registryPaths = new Set(context.registrySkills.map((entry) => normalizeOptionalPath(entry.skillMdPath)).filter(Boolean));
  const inventoryPaths = new Set(context.resources.map((resource) => normalizeOptionalPath(resource.metadata?.manifestPath)).filter(Boolean));
  const reasons = missingExamplePaths.map((manifestPath) => {
    if (!filesystemPaths.has(manifestPath)) return `${relativeAios(manifestPath)}: not found by filesystem scan`;
    if (!registryPaths.has(manifestPath)) return `${relativeAios(manifestPath)}: filesystem found, registry missing`;
    if (!inventoryPaths.has(manifestPath)) return `${relativeAios(manifestPath)}: found before inventory, missing from inventory`;
    return `${relativeAios(manifestPath)}: present but hidden by UI/search`;
  });
  return reasons.join("; ");
}

function countRegistrySourceTypes(registrySkills) {
  const counts = new Map();
  for (const skill of registrySkills) {
    const sourceTypes = safeStringArray(skill.sourceTypes);
    if (sourceTypes.length === 0) increment(counts, "(none)");
    for (const sourceType of sourceTypes) increment(counts, sourceType);
  }
  return counts;
}

function countBy(values, getKey) {
  const counts = new Map();
  for (const value of values) increment(counts, getKey(value));
  return counts;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function countKind(files, kind) {
  return files.filter((file) => file.kind === kind).length;
}

function compareCountRows(left, right) {
  if (right[1] !== left[1]) return right[1] - left[1];
  return String(left[0]).localeCompare(String(right[0]));
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function intersection(left, right) {
  return [...left].filter((value) => right.has(value)).sort();
}

function unionSets(...sets) {
  return new Set(sets.flatMap((set) => [...set]));
}

function findByName(records, name) {
  return records.find((record) => normalizeName(record.name) === normalizeName(name));
}

function toManifestPath(sourcePath) {
  if (!sourcePath) return undefined;
  return sourcePath.endsWith("SKILL.md") ? sourcePath : path.join(sourcePath, "SKILL.md");
}

function normalizeOptionalPath(value) {
  const safe = safeString(value);
  return safe ? normalizePath(safe) : "";
}

function normalizePath(value) {
  return path.resolve(String(value)).split(path.sep).join("/").toLowerCase();
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isInside(candidate, root) {
  const resolvedCandidate = path.resolve(candidate);
  const resolvedRoot = path.resolve(root);
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(`${resolvedRoot}${path.sep}`);
}

function relativeAios(filePath) {
  if (!filePath) return "";
  if (!path.isAbsolute(filePath)) return filePath;
  if (isInside(filePath, AIOS_ROOT)) return path.relative(AIOS_ROOT, filePath);
  if (isInside(filePath, HOME)) return path.join("~", path.relative(HOME, filePath));
  return filePath;
}

function rootExistsNoSymlinkLabel(root) {
  return rootExistsCache.get(root) ?? "unknown";
}

const rootExistsCache = new Map(EXPLICIT_ROOTS.map((root) => [root, "unknown"]));

async function populateRootExistsCache() {
  for (const root of EXPLICIT_ROOTS) {
    try {
      const stats = await lstat(root);
      rootExistsCache.set(root, stats.isDirectory() && !stats.isSymbolicLink() ? "yes" : "no");
    } catch {
      rootExistsCache.set(root, "no");
    }
  }
}

function listInline(values) {
  if (!values || values.length === 0) return "";
  return values.map((value) => String(value).replace(/\|/g, "\\|")).join(", ");
}

function table(headers, rows) {
  const normalizedRows = rows.length > 0 ? rows : [headers.map(() => "")];
  return [
    `| ${headers.map(formatCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...normalizedRows.map((row) => `| ${row.map(formatCell).join(" |")} |`)
  ].join("\n");
}

function formatCell(value) {
  return String(value ?? "")
    .replace(/\n/g, "<br>")
    .replace(/\|/g, "\\|");
}

function sourceKindsLabel(resource) {
  return safeStringArray(resource.metadata?.sourceKinds).join(",") || String(resource.metadata?.sourceKind ?? "");
}

function flagLabel(resource, flag) {
  return resource.metadata?.[flag] === true ? "yes" : "no";
}

function pathPreview(resource) {
  return relativeAios(String(resource.path ?? resource.metadata?.manifestPath ?? ""));
}

function dedupeBy(values, getKey) {
  const seen = new Set();
  return values.filter((value) => {
    const key = getKey(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inspectedPurpose(file) {
  if (file.includes("skill-discovery-scanner")) return "filesystem discovery, registry expansion, dedupe, alias variant logic";
  if (file.includes("skill-scanner")) return "index/registry/filesystem merge and active entrypoint resource model";
  if (file.includes("project-pack-scanner")) return "project-local `.agents/skills` detection";
  if (file.includes("aios-root-scanner")) return "generated inventory assembly";
  if (file.includes("path-policy")) return "roots, write boundary, skipped directory policy";
  if (file.includes("types")) return "resource schema and capability/status fields";
  if (file.includes("prompt-templates")) return "prompt metadata generation; raw prompts excluded from report";
  if (file.includes("fs-safe")) return "read helpers and symlink-following behavior for entrypoint listing";
  if (file.includes("filtering")) return "Skills view inclusion and search haystack";
  if (file.includes("skillDiscoveryMetadata")) return "source badges, metadata search terms, nuwa/nvwa variants";
  if (file.includes("skillCapabilityClassifier")) return "capability grouping/search text";
  if (file.includes("SkillsModule")) return "Skills grouping behavior";
  if (file.includes("CompactSkillRow")) return "row display/source badge behavior";
  if (file.includes("ResourceInspector")) return "inspector source metadata display";
  if (file.includes("snapshot")) return "generated inventory data";
  return "prior audit evidence";
}

function summarizeForStdout(context) {
  const huashu = context.canonicalManifests.filter(isFamilyRecord);
  const directExamples = huashu.filter(isDirectHuashuExample);
  const duplicateGroups = buildDuplicateGroups(context.skillViewResources);
  return [
    `filesystem SKILL.md: ${context.scan.files.filter((file) => file.kind === "SKILL.md").length}`,
    `huashu manifests: ${huashu.length}`,
    `direct examples: ${directExamples.length}`,
    `inventory resources: ${context.resources.length}`,
    `skill-view resources: ${context.skillViewResources.length}`,
    `duplicate groups: ${duplicateGroups.length}`,
    `registry skills: ${context.registrySkills.length}`
  ].join("\n");
}

await populateRootExistsCache();
await main();
