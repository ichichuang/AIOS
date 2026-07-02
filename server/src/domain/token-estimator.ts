import type { TokenPressure } from "./types.js";

export function estimateTokensFromText(text: string): number {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return 0;
  return Math.ceil(compact.length / 4);
}

export function tokenPressureForText(text: string, reason: string): TokenPressure {
  const estimatedTokens = estimateTokensFromText(text);
  if (estimatedTokens >= 4000) {
    return { estimatedTokens, level: "high", reason };
  }
  if (estimatedTokens >= 1200) {
    return { estimatedTokens, level: "medium", reason };
  }
  return { estimatedTokens, level: "low", reason };
}
