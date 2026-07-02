import { PromptCopyButton } from "./PromptCopyButton";
import type { AiosResource } from "../types/inventory";

interface ResourceDetailProps {
  resource: AiosResource | null;
}

export function ResourceDetail({ resource }: ResourceDetailProps) {
  if (!resource) {
    return (
      <section className="detail-panel">
        <h2>Resource detail</h2>
        <p className="muted">No resource selected.</p>
      </section>
    );
  }

  return (
    <section className="detail-panel">
      <div className="detail-title">
        <div>
          <p className="caption">{resource.toolType} / {resource.capabilityType}</p>
          <h2>{resource.name}</h2>
        </div>
        <span className={`risk-chip risk-${resource.risk}`}>{resource.risk}</span>
      </div>

      <p className="detail-description">{resource.description}</p>

      <div className="detail-block">
        <h3>Paths</h3>
        {resource.paths.length > 0 ? (
          resource.paths.map((item) => <code key={item}>{item}</code>)
        ) : (
          <span className="muted">No path</span>
        )}
      </div>

      <div className="detail-block">
        <h3>Safety profile</h3>
        <dl className="detail-grid">
          <dt>Read only</dt>
          <dd>{resource.safetyProfile.readOnly ? "yes" : "no"}</dd>
          <dt>Global writes</dt>
          <dd>{resource.safetyProfile.writesGlobalState ? "yes" : "no"}</dd>
          <dt>Secret risk</dt>
          <dd>{resource.safetyProfile.secretExposureRisk}</dd>
          <dt>Execution risk</dt>
          <dd>{resource.safetyProfile.executionRisk}</dd>
        </dl>
        <ul className="note-list">
          {resource.safetyProfile.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <div className="detail-block">
        <h3>Token pressure</h3>
        <p>
          <strong>{resource.tokenPressure.level}</strong> / approx. {resource.tokenPressure.estimatedTokens} tokens
        </p>
        <span className="muted">{resource.tokenPressure.reason}</span>
      </div>

      <div className="detail-block">
        <h3>Usage prompts</h3>
        <div className="prompt-list">
          {resource.prompts.map((prompt) => (
            <PromptCopyButton key={`${resource.id}-${prompt.target}-${prompt.title}`} prompt={prompt} />
          ))}
        </div>
      </div>
    </section>
  );
}
