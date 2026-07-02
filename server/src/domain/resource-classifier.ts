import type { CapabilityType, ResourceStatus, RiskLevel } from "./types.js";

export type ScriptKind = "validator" | "builder" | "router" | "sync" | "report" | "unknown";

export function classifyScript(filename: string): ScriptKind {
  const lower = filename.toLowerCase();
  if (lower.includes("validate") || lower.includes("doctor") || lower.includes("check")) return "validator";
  if (lower.includes("build") || lower.includes("index") || lower.includes("registry")) return "builder";
  if (lower.includes("router") || lower.includes("resolve") || lower.includes("search")) return "router";
  if (lower.includes("sync") || lower.includes("link")) return "sync";
  if (lower.includes("report") || lower.includes("inventory") || lower.includes("audit")) return "report";
  return "unknown";
}

export function scriptCapability(kind: ScriptKind): CapabilityType {
  return kind === "validator" ? "validator" : "script";
}

export function scriptRisk(kind: ScriptKind): RiskLevel {
  if (kind === "sync") return "medium";
  if (kind === "validator" || kind === "report") return "low";
  return "medium";
}

export function inferReportStatus(name: string, snippet: string): ResourceStatus {
  const text = `${name}\n${snippet}`.toLowerCase();
  if (text.includes("overall status: `fail`") || text.includes("overall status：`fail`")) return "warn";
  if (text.includes("overall status: `warn`") || text.includes("overall status：`warn`")) return "warn";
  if (text.includes("review_required")) return "warn";
  if (text.includes("overall status: `pass`") || text.includes("overall status：`pass`")) return "ok";
  return "available";
}

export function inferReportRisk(status: ResourceStatus): RiskLevel {
  return status === "warn" ? "medium" : "low";
}

export function riskFromMcpFlags(usesAtLatest: boolean, usesNpx: boolean, credentialRequired: boolean): RiskLevel {
  if (usesAtLatest) return "medium";
  if (usesNpx || credentialRequired) return "medium";
  return "low";
}
