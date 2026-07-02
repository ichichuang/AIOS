import type { Dirent } from "node:fs";
import { open, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    return (await stat(targetPath)).isDirectory();
  } catch {
    return false;
  }
}

export async function readTextIfExists(targetPath: string, maxBytes = 256 * 1024): Promise<string | null> {
  try {
    const handle = await open(targetPath, "r");
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

export async function readJsonIfExists<T>(targetPath: string, maxBytes = 2 * 1024 * 1024): Promise<T | null> {
  const text = await readTextIfExists(targetPath, maxBytes);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function listDirectorySafe(targetPath: string): Promise<Dirent[]> {
  try {
    return await readdir(targetPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function countTopLevelDirectories(targetPath: string, excludeNames = new Set<string>()): Promise<number> {
  const entries = await listDirectorySafe(targetPath);
  let count = 0;
  for (const entry of entries) {
    if (excludeNames.has(entry.name)) continue;
    const fullPath = path.join(targetPath, entry.name);
    try {
      if ((await stat(fullPath)).isDirectory()) count += 1;
    } catch {
      continue;
    }
  }
  return count;
}

export async function listTopLevelDirectories(targetPath: string, excludeNames = new Set<string>()): Promise<string[]> {
  const entries = await listDirectorySafe(targetPath);
  const dirs: string[] = [];
  for (const entry of entries) {
    if (excludeNames.has(entry.name)) continue;
    const fullPath = path.join(targetPath, entry.name);
    try {
      if ((await stat(fullPath)).isDirectory()) dirs.push(entry.name);
    } catch {
      continue;
    }
  }
  return dirs.sort((a, b) => a.localeCompare(b));
}

export async function fileSize(targetPath: string): Promise<number | null> {
  try {
    return (await stat(targetPath)).size;
  } catch {
    return null;
  }
}

export async function fileMtimeIso(targetPath: string): Promise<string | undefined> {
  try {
    return (await stat(targetPath)).mtime.toISOString();
  } catch {
    return undefined;
  }
}

export async function readSmallFile(targetPath: string): Promise<string | null> {
  try {
    return await readFile(targetPath, "utf8");
  } catch {
    return null;
  }
}
