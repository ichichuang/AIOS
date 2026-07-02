import type { McpServerRecord } from "../types/inventory";

interface McpInventoryPanelProps {
  servers: McpServerRecord[];
}

export function McpInventoryPanel({ servers }: McpInventoryPanelProps) {
  return (
    <section className="side-panel">
      <div className="table-heading">
        <h2>MCP inventory</h2>
        <span>{servers.length} configured</span>
      </div>
      <div className="mcp-list">
        {servers.map((server) => (
          <article className="mcp-row" key={server.name}>
            <div>
              <strong>{server.name}</strong>
              <span>{server.command} / {server.transport}</span>
            </div>
            <div className="mcp-flags">
              {server.usesNpx && <span className="risk-chip risk-medium">npx</span>}
              {server.usesAtLatest && <span className="risk-chip risk-medium">@latest</span>}
              {server.credentialRequired && <span className="risk-chip risk-medium">env names</span>}
              <span className={`risk-chip risk-${server.risk}`}>{server.localRemoteRisk}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
