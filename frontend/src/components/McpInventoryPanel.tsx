import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { getMcpGroup, getMcpRiskLabels } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import type { McpServerRecord } from "../types/inventory";

interface McpInventoryPanelProps {
  servers: McpServerRecord[];
}

export function McpInventoryPanel({ servers }: McpInventoryPanelProps) {
  const groups = ["credential", "npx", "remote", "local", "unknown"] as const;

  return (
    <Box className="side-panel" component="section">
      <Stack className="table-heading compact" direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h3">
            {zhCN.mcp.title}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {zhCN.moduleSummaries.mcp}
          </Typography>
        </Box>
        <Chip label={`${servers.length} ${zhCN.mcp.configured}`} />
      </Stack>
      <Box className="mcp-group-list">
        {groups.map((group) => {
          const groupServers = servers.filter((server) => getMcpGroup(server) === group);
          if (groupServers.length === 0) return null;
          return (
            <Box className="mcp-group" key={group}>
              <Stack className="mcp-group-heading" direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h3" variant="h3">
                    {zhCN.mcp.groups[group]}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {zhCN.mcp.groupSummaries[group]}
                  </Typography>
                </Box>
                <Chip label={groupServers.length} variant="outlined" />
              </Stack>
              <Box className="mcp-list">
                {groupServers.map((server) => (
                  <Card className="mcp-row" key={server.name}>
                    <CardContent>
                      <Typography component="strong">{server.name}</Typography>
                      <Typography color="text.secondary" variant="body2">
                        {zhCN.mcp.command}:{" "}
                        <Box className="code-pill" component="code">
                          {server.command}
                        </Box>
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {zhCN.mcp.transport}: {server.transport}
                      </Typography>
                      <Stack className="mcp-flags" direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                        {getMcpRiskLabels(server).map((label) => (
                          <Chip className={`risk-chip risk-${server.risk}`} key={`${server.name}-${label}`} label={label} />
                        ))}
                      </Stack>
                      <Typography color="text.secondary" variant="body2">
                        {zhCN.mcp.source}:{" "}
                        <Box className="code-pill path-cell" component="code">
                          {server.sourcePath}
                        </Box>
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
