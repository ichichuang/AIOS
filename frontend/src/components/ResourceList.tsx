import { Box, Button, Card, CardActionArea, CardActions, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import { useMemo, useRef } from "react";
import { getResourceDisplay } from "../i18n/resourceText";
import { zhCN } from "../i18n/zh-CN";
import type { ResourceView } from "../lib/filtering";
import { VIEW_LABELS } from "../lib/filtering";
import { useCardEntrance } from "../lib/useAiosMotion";
import { PromptCopyButton } from "./PromptCopyButton";
import type { AiosResource, McpServerRecord } from "../types/inventory";

interface ResourceListProps {
  resources: AiosResource[];
  selectedId: string | null;
  activeView: ResourceView;
  onSelect: (resource: AiosResource) => void;
}

export function ResourceList({ resources, selectedId, activeView, onSelect }: ResourceListProps) {
  const listRef = useRef<HTMLElement>(null);
  const motionKey = useMemo(() => resources.map((resource) => resource.id).join("|"), [resources]);
  const groups = useMemo(() => groupResources(resources, activeView), [activeView, resources]);
  useCardEntrance(listRef, motionKey, "[data-motion='resource-card']");

  return (
    <Box className="resource-list-panel" component="section" ref={listRef}>
      <Stack className="table-heading" direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" variant="h3">
            {zhCN.app.resourceList}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {zhCN.moduleSummaries[activeView]}
          </Typography>
        </Box>
        <Chip label={`${resources.length} ${zhCN.app.shown}`} variant="outlined" />
      </Stack>

      <Box className="resource-scroll">
        {resources.length === 0 ? (
          <Box className="empty-state">
            <Typography component="h3" variant="h3">
              {zhCN.app.emptyTitle}
            </Typography>
            <Typography color="text.secondary">{zhCN.app.emptyBody}</Typography>
          </Box>
        ) : (
          groups.map((group) => (
            <Box className="resource-group" component="section" key={group.label}>
              <Stack className="resource-group-heading" direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography component="h3" variant="h3">
                    {group.label}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    {group.summary}
                  </Typography>
                </Box>
                <Chip label={`${group.resources.length} ${zhCN.app.countUnit}`} />
              </Stack>
              <Box className={activeView === "reports" ? "resource-card-grid timeline-grid" : "resource-card-grid"}>
                {group.resources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} selected={resource.id === selectedId} onSelect={onSelect} />
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

interface ResourceCardProps {
  resource: AiosResource;
  selected: boolean;
  onSelect: (resource: AiosResource) => void;
}

function ResourceCard({ resource, selected, onSelect }: ResourceCardProps) {
  const display = getResourceDisplay(resource);
  const codexPrompt = resource.prompts.find((prompt) => prompt.target === "codex");
  const claudePrompt = resource.prompts.find((prompt) => prompt.target === "claude");

  return (
    <Card className={selected ? "resource-card selected" : "resource-card"} data-group={display.uiGroup} data-motion="resource-card">
      <CardActionArea aria-pressed={selected} onClick={() => onSelect(resource)}>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box className="resource-card-title">
              <Typography className="resource-title" component="h4">
                {display.zhName}
              </Typography>
              <Box className="code-pill" component="code">
                {display.technicalName}
              </Box>
            </Box>
            <Stack className="resource-card-badges" direction="row" sx={{ alignItems: "flex-end", flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
              <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
              <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
            </Stack>
          </Stack>

          <Typography className="resource-description" color="text.secondary" variant="body2">
            {display.zhDescription}
          </Typography>

          <Stack className="resource-card-footer" direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Chip label={display.zhCapability} variant="outlined" />
            <Box className="code-pill path-cell" component="code">
              {display.pathPreview}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
      <Divider />
      <CardActions className="resource-actions">
        <Button size="small" startIcon={<VisibilityRounded fontSize="small" />} type="button" variant="contained" onClick={() => onSelect(resource)}>
          {zhCN.app.viewAction}
        </Button>
        <PromptCopyButton compact prompt={codexPrompt} target="codex" />
        <PromptCopyButton compact prompt={claudePrompt} target="claude" />
      </CardActions>
    </Card>
  );
}

interface ResourceGroup {
  label: string;
  summary: string;
  resources: AiosResource[];
}

function groupResources(resources: AiosResource[], activeView: ResourceView): ResourceGroup[] {
  const grouped = new Map<string, AiosResource[]>();
  for (const resource of resources) {
    const label = getGroupLabel(resource, activeView);
    const existing = grouped.get(label) ?? [];
    existing.push(resource);
    grouped.set(label, existing);
  }

  return Array.from(grouped.entries()).map(([label, group]) => ({
    label,
    summary: getGroupSummary(label, activeView),
    resources: group
  }));
}

function getGroupLabel(resource: AiosResource, activeView: ResourceView): string {
  const display = getResourceDisplay(resource);

  if (activeView === "dashboard") return VIEW_LABELS[display.uiGroup];
  if (activeView === "skills") {
    if (resource.capabilityType === "registry") return "注册表与路由";
    if (resource.capabilityType === "skill") return "规范技能";
    return `${display.zhToolType}入口`;
  }
  if (activeView === "mcp") {
    const server = getMcpServer(resource);
    if (server?.credentialRequired) return zhCN.mcp.groups.credential;
    if (server?.usesNpx || server?.usesAtLatest || server?.localRemoteRisk === "possible-npx-fetch") return zhCN.mcp.groups.npx;
    if (server?.localRemoteRisk === "remote" || server?.transport === "http" || server?.transport === "sse") return zhCN.mcp.groups.remote;
    if (server?.localRemoteRisk === "local") return zhCN.mcp.groups.local;
    return zhCN.mcp.groups.unknown;
  }
  if (activeView === "scripts") return getScriptGroup(resource);
  if (activeView === "reports") return "报告时间线";
  if (activeView === "project-packs") return "项目本地资源包";
  if (activeView === "policies") return "策略守卫";
  if (activeView === "validators") return "观察型验证器";
  if (activeView === "legacy") return "旧入口提示";
  return display.zhCategory;
}

function getGroupSummary(label: string, activeView: ResourceView): string {
  if (activeView === "mcp") {
    const entry = Object.entries(zhCN.mcp.groups).find(([, value]) => value === label);
    if (entry) return zhCN.mcp.groupSummaries[entry[0] as keyof typeof zhCN.mcp.groupSummaries];
  }
  if (activeView === "reports") return "按报告资源展示时间线卡片，仅用于只读状态推断。";
  if (activeView === "skills") return "中文能力标题与原始技术名并列展示，提示词复制保持显式操作。";
  if (activeView === "scripts") return "脚本仅被清单化，执行需要单独显式命令。";
  return zhCN.moduleSummaries[activeView];
}

function getScriptGroup(resource: AiosResource): string {
  const haystack = `${resource.name} ${resource.path ?? ""}`.toLowerCase();
  if (haystack.includes("validate") || haystack.includes("doctor") || haystack.includes("check")) return "验证脚本";
  if (haystack.includes("inventory") || haystack.includes("generate") || haystack.includes("build")) return "构建与生成";
  if (haystack.includes("router") || haystack.includes("route")) return "路由脚本";
  if (haystack.includes("sync")) return "同步脚本";
  if (haystack.includes("report")) return "报告脚本";
  return "本地脚本";
}

function getMcpServer(resource: AiosResource): McpServerRecord | null {
  const server = resource.metadata?.server;
  if (!server || typeof server !== "object") return null;
  const candidate = server as Partial<McpServerRecord>;
  if (typeof candidate.name !== "string" || typeof candidate.command !== "string") return null;
  return candidate as McpServerRecord;
}
