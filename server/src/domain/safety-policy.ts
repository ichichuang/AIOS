import type { RiskLevel, SafetyProfile } from "./types.js";

export function readOnlySafety(notes: string[] = [], risk: RiskLevel = "low"): SafetyProfile {
  return {
    readOnly: true,
    writesGlobalState: false,
    secretExposureRisk: risk,
    executionRisk: "low",
    notes
  };
}

export function mcpMetadataSafety(notes: string[] = []): SafetyProfile {
  return {
    readOnly: true,
    writesGlobalState: false,
    secretExposureRisk: "medium",
    executionRisk: "medium",
    notes: [
      "MCP metadata only; the scanner does not start or connect to this server.",
      "Only env var names are retained; env values are not stored.",
      ...notes
    ]
  };
}

export const GLOBAL_BOUNDARY_NOTES = [
  "/Users/cc/.ai is read-only data for Phase 1.",
  "Only /Users/cc/.ai/AIOS is writable app source.",
  "Do not restore the old 68/69 global skill baseline.",
  "Do not recreate Codex automations.",
  "Do not modify Codex, Claude, Agents, MCP, auth, provider, or env configuration."
];
