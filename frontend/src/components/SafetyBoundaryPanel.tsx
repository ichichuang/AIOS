import type { BaselineSummary } from "../types/inventory";

interface SafetyBoundaryPanelProps {
  baseline: BaselineSummary;
}

export function SafetyBoundaryPanel({ baseline }: SafetyBoundaryPanelProps) {
  const boundaries = [
    "/Users/cc/.ai is read-only data except the app repo.",
    "Do not modify active-global-skills-policy.json.",
    "Do not modify global skill entrypoints.",
    "Do not restore old 68/69 global baseline.",
    "Do not enable full-global skills mode.",
    "Do not recreate Codex automations.",
    "wxmp is domain-specific, not AIOS root governance."
  ];

  return (
    <section className="side-panel">
      <h2>Safety boundaries</h2>
      <ul className="note-list">
        {boundaries.map((boundary) => (
          <li key={boundary}>{boundary}</li>
        ))}
      </ul>
      <div className="known-warnings">
        <h3>Known WARNs</h3>
        {baseline.knownWarnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
    </section>
  );
}
