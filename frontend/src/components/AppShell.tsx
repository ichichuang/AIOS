import type { ReactNode } from "react";
import { AppBar, Box, Chip, Paper, Stack, Toolbar, Typography } from "@mui/material";
import { formatSnapshotDate, zhCN } from "../i18n/zh-CN";
import type { AiosInventory } from "../types/inventory";

interface AppShellProps {
  inventory: AiosInventory;
  sidebar: ReactNode;
  main: ReactNode;
  detail: ReactNode;
  commandBar: ReactNode;
}

export function AppShell({ inventory, sidebar, main, detail, commandBar }: AppShellProps) {
  return (
    <Box className="app-shell">
      <Paper component="aside" className="sidebar" elevation={0}>
        <Stack className="brand" spacing={1.5}>
          <Box>
            <Typography className="eyebrow" component="p">
              {zhCN.app.localOnly}
            </Typography>
            <Typography component="h1" variant="h1">
              {zhCN.app.title}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {zhCN.app.subtitle}
            </Typography>
          </Box>
          <Chip className="status-chip status-ok" label={zhCN.app.readOnly} />
        </Stack>
        {sidebar}
      </Paper>

      <Box component="main" className="workspace">
        <AppBar className="topbar" color="transparent" elevation={0} position="static">
          <Toolbar className="topbar-toolbar" disableGutters>
            <Stack className="topbar-title" spacing={0.75}>
              <Typography className="eyebrow" component="p">
                {zhCN.app.sourceSnapshot}
              </Typography>
              <Typography component="h2" variant="h2">
                {zhCN.app.title}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {zhCN.moduleSummaries.dashboard}
              </Typography>
            </Stack>

            <Box className="topbar-command">{commandBar}</Box>

            <Stack className="topbar-metrics" direction="row" spacing={1}>
              <Metric label={zhCN.app.generatedAt} value={formatSnapshotDate(inventory.generatedAt)} />
              <Metric label={zhCN.app.aiosRoot} value={inventory.roots.aiosRoot} code />
              <Metric label={zhCN.app.appSource} value={inventory.roots.appSourcePath} code />
            </Stack>
          </Toolbar>
        </AppBar>
        <Box className="workspace-body">{main}</Box>
      </Box>

      <Paper component="aside" className="inspector" elevation={0}>
        {detail}
      </Paper>
    </Box>
  );
}

interface MetricProps {
  label: string;
  value: string;
  code?: boolean;
}

function Metric({ label, value, code }: MetricProps) {
  return (
    <Box className="topbar-card">
      <Typography className="caption" component="p">
        {label}
      </Typography>
      {code ? (
        <Box className="code-pill topbar-code" component="code">
          {value}
        </Box>
      ) : (
        <Typography component="strong">{value}</Typography>
      )}
    </Box>
  );
}
