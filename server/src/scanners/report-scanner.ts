import path from "node:path";
import { AIOS_REPORTS_DIR } from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { inferReportRisk, inferReportStatus } from "../domain/resource-classifier.js";
import { readOnlySafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosResource } from "../domain/types.js";
import { fileMtimeIso, fileSize, listDirectorySafe, readTextIfExists } from "../utils/fs-safe.js";

export async function scanReports(limit = 30): Promise<AiosResource[]> {
  const entries = await listDirectorySafe(AIOS_REPORTS_DIR);
  const reportEntries = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(AIOS_REPORTS_DIR, entry.name);
    reportEntries.push({
      name: entry.name,
      fullPath,
      mtime: (await fileMtimeIso(fullPath)) ?? ""
    });
  }

  reportEntries.sort((a, b) => b.mtime.localeCompare(a.mtime));
  const resources: AiosResource[] = [];

  for (const entry of reportEntries.slice(0, limit)) {
    const snippet = (await readTextIfExists(entry.fullPath, 4096)) ?? "";
    const status = inferReportStatus(entry.name, snippet);
    const description = snippet
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(" ");
    const base: AiosResource = {
      id: `report:${entry.name}`,
      name: entry.name,
      toolType: "report",
      capabilityType: "report",
      status,
      risk: inferReportRisk(status),
      path: entry.fullPath,
      paths: [entry.fullPath],
      description: description || "Recent AIOS report.",
      safetyProfile: readOnlySafety(["Report snippet is read for status inference only."]),
      tokenPressure: tokenPressureForText(description, "Report heading/snippet only."),
      prompts: [],
      metadata: {
        size: await fileSize(entry.fullPath)
      },
      updatedAt: entry.mtime
    };
    resources.push({ ...base, prompts: buildUsagePrompts(base) });
  }

  return resources;
}
