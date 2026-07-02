import type { AiosResource } from "../types/inventory";

interface ResourceListProps {
  resources: AiosResource[];
  selectedId: string | null;
  onSelect: (resource: AiosResource) => void;
}

export function ResourceList({ resources, selectedId, onSelect }: ResourceListProps) {
  return (
    <section className="resource-table-panel">
      <div className="table-heading">
        <h2>Resources</h2>
        <span>{resources.length} shown</span>
      </div>
      <div className="table-scroll">
        <table className="resource-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Tool</th>
              <th>Capability</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr className={resource.id === selectedId ? "selected" : ""} key={resource.id} onClick={() => onSelect(resource)}>
                <td>
                  <button className="row-button" type="button" onClick={() => onSelect(resource)}>
                    {resource.name}
                  </button>
                </td>
                <td>{resource.toolType}</td>
                <td>{resource.capabilityType}</td>
                <td>
                  <span className={`status-chip status-${resource.status}`}>{resource.status}</span>
                </td>
                <td>
                  <span className={`risk-chip risk-${resource.risk}`}>{resource.risk}</span>
                </td>
                <td>
                  <code className="path-cell">{resource.path ?? resource.paths[0] ?? "n/a"}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
