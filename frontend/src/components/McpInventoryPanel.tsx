import { Badge, Card, Code, Flex, Text } from "@radix-ui/themes";
import { getMcpGroup, getMcpRiskLabels } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import type { McpServerRecord } from "../types/inventory";

interface McpInventoryPanelProps {
  servers: McpServerRecord[];
}

export function McpInventoryPanel({ servers }: McpInventoryPanelProps) {
  const groups = ["credential", "npx", "remote", "local", "unknown"] as const;

  return (
    <section className="side-panel">
      <div className="table-heading">
        <div>
          <h2>{zhCN.mcp.title}</h2>
          <p>{zhCN.moduleSummaries.mcp}</p>
        </div>
        <Badge variant="soft">
          {servers.length} {zhCN.mcp.configured}
        </Badge>
      </div>
      <div className="mcp-group-list">
        {groups.map((group) => {
          const groupServers = servers.filter((server) => getMcpGroup(server) === group);
          if (groupServers.length === 0) return null;
          return (
            <div className="mcp-group" key={group}>
              <Flex align="center" justify="between" gap="2" className="mcp-group-heading">
                <div>
                  <h3>{zhCN.mcp.groups[group]}</h3>
                  <p>{zhCN.mcp.groupSummaries[group]}</p>
                </div>
                <Badge variant="soft">{groupServers.length}</Badge>
              </Flex>
              <div className="mcp-list">
                {groupServers.map((server) => (
                  <Card className="mcp-row" key={server.name} size="2">
                    <div>
                      <strong>{server.name}</strong>
                      <span>
                        {zhCN.mcp.command}: <Code>{server.command}</Code>
                      </span>
                      <span>
                        {zhCN.mcp.transport}: {server.transport}
                      </span>
                    </div>
                    <div className="mcp-flags">
                      {getMcpRiskLabels(server).map((label) => (
                        <Badge className={`risk-chip risk-${server.risk}`} key={`${server.name}-${label}`} variant="soft">
                          {label}
                        </Badge>
                      ))}
                    </div>
                    <Text as="p" className="muted" size="1">
                      {zhCN.mcp.source}: <Code>{server.sourcePath}</Code>
                    </Text>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
