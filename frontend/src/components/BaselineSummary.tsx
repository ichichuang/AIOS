import type { BaselineSummary as BaselineSummaryType } from "../types/inventory";

function shortHash(hash: string | null): string {
  return hash ? `${hash.slice(0, 12)}...${hash.slice(-8)}` : "missing";
}

interface BaselineSummaryProps {
  baseline: BaselineSummaryType;
}

export function BaselineSummary({ baseline }: BaselineSummaryProps) {
  const routerStatus = baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "Partial";

  return (
    <section className="summary-grid" aria-label="Baseline summary">
      <article className="metric-panel wide">
        <p className="caption">Policy hash</p>
        <strong>{shortHash(baseline.policyHash)}</strong>
        <span>{baseline.policyHash ? "unchanged guard target" : "policy file missing"}</span>
      </article>
      <article className="metric-panel">
        <p className="caption">Canonical skills</p>
        <strong>{baseline.canonicalSkillCount}</strong>
        <span>/Users/cc/.ai</span>
      </article>
      <article className="metric-panel">
        <p className="caption">Codex active</p>
        <strong>{baseline.codexActiveUserSkillCount}</strong>
        <span>{baseline.codexTopLevelCount} top-level incl. reserved</span>
      </article>
      <article className="metric-panel">
        <p className="caption">Agents active</p>
        <strong>{baseline.agentsActiveUserSkillCount}</strong>
        <span>global entrypoints</span>
      </article>
      <article className="metric-panel">
        <p className="caption">Claude skills</p>
        <strong>{baseline.claudeSkillCount ?? "n/a"}</strong>
        <span>safe entrypoint metadata</span>
      </article>
      <article className="metric-panel">
        <p className="caption">Router</p>
        <strong>{routerStatus}</strong>
        <span>custom-skill-router</span>
      </article>
      <article className="metric-panel">
        <p className="caption">Codex automations</p>
        <strong>{baseline.codexAutomationDirectoryState.summary}</strong>
        <span>must not be recreated by app</span>
      </article>
    </section>
  );
}
