import path from "node:path";
import { AIOS_SCRIPTS_DIR } from "../domain/path-policy.js";
import { buildUsagePrompts } from "../domain/prompt-templates.js";
import { classifyScript, scriptCapability, scriptRisk } from "../domain/resource-classifier.js";
import { readOnlySafety } from "../domain/safety-policy.js";
import { tokenPressureForText } from "../domain/token-estimator.js";
import type { AiosResource } from "../domain/types.js";
import { fileMtimeIso, fileSize, listDirectorySafe } from "../utils/fs-safe.js";

export async function scanScripts(): Promise<AiosResource[]> {
  const entries = await listDirectorySafe(AIOS_SCRIPTS_DIR);
  const resources: AiosResource[] = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(AIOS_SCRIPTS_DIR, entry.name);
    const kind = classifyScript(entry.name);
    const capabilityType = scriptCapability(kind);
    const description = `AIOS ${kind} script. Listed as local metadata only; the inventory scanner does not execute it.`;
    const base: AiosResource = {
      id: `script:${entry.name}`,
      name: entry.name,
      toolType: capabilityType === "validator" ? "validator" : "script",
      capabilityType,
      status: "available",
      risk: scriptRisk(kind),
      path: fullPath,
      paths: [fullPath],
      description,
      safetyProfile: readOnlySafety(["Script is inventoried only. Execution requires a separate explicit validation step."]),
      tokenPressure: tokenPressureForText(description, "Script metadata summary."),
      prompts: [],
      metadata: {
        kind,
        size: await fileSize(fullPath)
      },
      updatedAt: await fileMtimeIso(fullPath)
    };
    resources.push({ ...base, prompts: buildUsagePrompts(base) });
  }

  return resources;
}
