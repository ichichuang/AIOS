import { Box, Card, CardActionArea, CardContent, Chip, Stack, Typography } from "@mui/material";
import ArticleRounded from "@mui/icons-material/ArticleRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import ExtensionRounded from "@mui/icons-material/ExtensionRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import PolicyRounded from "@mui/icons-material/PolicyRounded";
import TerminalRounded from "@mui/icons-material/TerminalRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import { useMemo, useRef } from "react";
import { countByView, type ResourceView, VIEW_LABELS } from "../lib/filtering";
import { useCardRevealMotion } from "../lib/useAiosMotion";
import { zhCN } from "../i18n/zh-CN";
import type { AiosResource } from "../types/inventory";

const moduleViews: ResourceView[] = ["dashboard", "skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators"];

export const moduleIcons: Record<ResourceView, SvgIconComponent> = {
  dashboard: DashboardRounded,
  skills: ExtensionRounded,
  mcp: HubRounded,
  scripts: TerminalRounded,
  reports: ArticleRounded,
  "project-packs": Inventory2Rounded,
  policies: PolicyRounded,
  validators: FactCheckRounded,
  legacy: HistoryRounded
};

interface ModuleOverviewProps {
  resources: AiosResource[];
  activeView: ResourceView;
  onChange: (view: ResourceView) => void;
}

export function ModuleOverview({ resources, activeView, onChange }: ModuleOverviewProps) {
  const overviewRef = useRef<HTMLElement>(null);
  const motionKey = useMemo(() => moduleViews.map((view) => `${view}:${countByView(resources, view)}`).join("|"), [resources]);
  useCardRevealMotion(overviewRef, motionKey, "[data-motion='module-card']");

  return (
    <Box className="module-overview" component="section" ref={overviewRef} aria-label={zhCN.app.moduleOverview}>
      <Stack className="section-heading" direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h3">
            {zhCN.app.moduleOverview}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {zhCN.moduleSummaries.dashboard}
          </Typography>
        </Box>
        <Chip label={`${resources.length} ${zhCN.app.total}`} variant="outlined" />
      </Stack>
      <Box className="module-grid">
        {moduleViews.map((view) => {
          const count = countByView(resources, view);
          const active = view === activeView;
          const Icon = moduleIcons[view];
          return (
            <Card className={active ? "module-card active" : "module-card"} data-motion="module-card" key={view}>
              <CardActionArea aria-pressed={active} onClick={() => onChange(view)}>
                <CardContent>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Box className="module-icon">
                      <Icon fontSize="small" />
                    </Box>
                    <Typography component="strong">{count}</Typography>
                  </Stack>
                  <Typography className="module-label" component="h3">
                    {VIEW_LABELS[view]}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {zhCN.moduleSummaries[view]}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
