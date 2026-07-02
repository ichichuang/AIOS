import path from "node:path";

export const AIOS_ROOT = "/Users/cc/.ai";
export const APP_REPO_ROOT = "/Users/cc/.ai/AIOS";
export const CODEX_ROOT = "/Users/cc/.codex";
export const AGENTS_ROOT = "/Users/cc/.agents";
export const CLAUDE_ROOT = "/Users/cc/.claude";

export const SKILLS_INDEX_PATH = path.join(AIOS_ROOT, "SKILLS_INDEX.json");
export const CUSTOM_SKILL_REGISTRY_PATH = path.join(AIOS_ROOT, "state/custom-skill-registry.json");
export const ACTIVE_GLOBAL_POLICY_PATH = path.join(AIOS_ROOT, "config/active-global-skills-policy.json");
export const AIOS_SCRIPTS_DIR = path.join(AIOS_ROOT, "scripts");
export const AIOS_REPORTS_DIR = path.join(AIOS_ROOT, "reports/automation-runs");
export const CODEX_SKILLS_DIR = path.join(CODEX_ROOT, "skills");
export const AGENTS_SKILLS_DIR = path.join(AGENTS_ROOT, "skills");
export const CLAUDE_SKILLS_DIR = path.join(CLAUDE_ROOT, "skills");
export const CODEX_CONFIG_PATH = path.join(CODEX_ROOT, "config.toml");
export const CODEX_AUTOMATIONS_DIR = path.join(CODEX_ROOT, "automations");

export const PROJECT_PACK_ROOTS = [
  "/Users/cc/Work",
  "/Users/cc/MyPorject",
  "/Users/cc/MyProject",
  APP_REPO_ROOT
];

export const SKIP_DIRECTORY_NAMES = new Set([
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
  "logs"
]);

export function isInsideAppRepo(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  const root = path.resolve(APP_REPO_ROOT);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`);
}

export function assertWritableAppPath(targetPath: string): void {
  if (!isInsideAppRepo(targetPath)) {
    throw new Error(`Refusing to write outside app repository: ${targetPath}`);
  }
}

export function shouldSkipDirectory(name: string): boolean {
  return SKIP_DIRECTORY_NAMES.has(name) || name.endsWith(".xcarchive");
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}
