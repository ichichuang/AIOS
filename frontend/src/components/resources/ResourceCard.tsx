import { Box, Button, Card, CardActionArea, CardActions, CardContent, Stack, Typography } from "@mui/material";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import { getMcpRiskLabels, getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource, McpServerRecord } from "../../types/inventory";
import { PromptCopyButton } from "../PromptCopyButton";
import { ResourceChips } from "./ResourceChips";
import { ResourceMetaRow } from "./ResourceMetaRow";

export type ResourceCardVariant = "default" | "skill" | "mcp" | "script" | "report" | "project-pack" | "policy" | "validator" | "legacy";

interface ResourceCardProps {
  resource: AiosResource;
  selected: boolean;
  variant?: ResourceCardVariant;
  onSelect: (resource: AiosResource) => void;
}

export function ResourceCard({ resource, selected, variant = "default", onSelect }: ResourceCardProps) {
  const display = getResourceDisplay(resource);
  const server = getMcpServer(resource);
  const codexPrompt = resource.prompts.find((prompt) => prompt.target === "codex");
  const claudePrompt = resource.prompts.find((prompt) => prompt.target === "claude");
  const showPromptActions = variant === "skill";

  return (
    <Card className={selected ? `resource-card material-card ${variant} selected` : `resource-card material-card ${variant}`} data-motion="resource-card">
      <CardActionArea aria-pressed={selected} onClick={() => onSelect(resource)}>
        <CardContent>
          <Stack className="resource-card-top" direction="row" sx={{ alignItems: "flex-start", gap: 1.5, justifyContent: "space-between" }}>
            <Box className="resource-card-title">
              <Typography className="resource-title" component="h3">
                {display.zhName}
              </Typography>
              <Box className="code-pill resource-technical-name" component="code">
                {display.technicalName}
              </Box>
            </Box>
            <ResourceChips resource={resource} extra={getExtraChips(resource, server, variant)} />
          </Stack>

          <Typography className="resource-description" color="text.secondary" variant="body2">
            {display.zhDescription}
          </Typography>

          <Box className="resource-meta-grid">
            {variant === "mcp" && server ? (
              <>
                <ResourceMetaRow label={zhCN.mcp.command} value={server.command} code />
                <ResourceMetaRow label={zhCN.mcp.transport} value={server.transport} />
                <ResourceMetaRow label="环境变量名" value={`${server.envVarNames.length} 个`} />
                <ResourceMetaRow label={zhCN.mcp.source} value={server.sourcePath} code />
              </>
            ) : variant === "script" ? (
              <>
                <ResourceMetaRow label="清单类型" value={getScriptKind(resource)} />
                <ResourceMetaRow label="执行策略" value="仅清单，不执行" />
                <ResourceMetaRow label={zhCN.app.pathPreview} value={display.pathPreview} code />
              </>
            ) : variant === "report" ? (
              <>
                <ResourceMetaRow label="原始文件名" value={resource.name} code />
                <ResourceMetaRow label="更新时间" value={formatDate(resource.updatedAt)} />
                <ResourceMetaRow label={zhCN.app.pathPreview} value={display.pathPreview} code />
              </>
            ) : variant === "project-pack" ? (
              <>
                <ResourceMetaRow label="资源根" value={getMetadataString(resource, "root") ?? display.pathPreview} code />
                <ResourceMetaRow label="清单时间" value={formatDate(resource.updatedAt)} />
                <ResourceMetaRow label="边界" value="项目本地只读展示" />
              </>
            ) : (
              <>
                <ResourceMetaRow label="能力" value={display.zhCapability} />
                <ResourceMetaRow label={zhCN.app.pathPreview} value={display.pathPreview} code />
              </>
            )}
          </Box>
        </CardContent>
      </CardActionArea>

      <CardActions className="resource-actions">
        <Button size="small" startIcon={<VisibilityRounded fontSize="small" />} type="button" variant="contained" onClick={() => onSelect(resource)}>
          {zhCN.app.viewAction}
        </Button>
        {showPromptActions && (
          <>
            <PromptCopyButton compact prompt={codexPrompt} target="codex" />
            <PromptCopyButton compact prompt={claudePrompt} target="claude" />
          </>
        )}
      </CardActions>
    </Card>
  );
}

function getExtraChips(resource: AiosResource, server: McpServerRecord | null, variant: ResourceCardVariant): string[] {
  if (variant === "mcp" && server) return getMcpRiskLabels(server);
  if (variant === "skill") return [getSkillRuntimeLabel(resource)];
  if (variant === "script") return [getScriptKind(resource)];
  if (variant === "legacy") return ["兼容入口"];
  return [];
}

function getSkillRuntimeLabel(resource: AiosResource): string {
  if (resource.capabilityType === "registry") return "注册表";
  if (resource.capabilityType === "runtime-view") return `${resource.toolType} 入口`;
  if (resource.toolType === "aios-root") return "规范技能";
  return resource.toolType;
}

function getScriptKind(resource: AiosResource): string {
  const kind = getMetadataString(resource, "kind");
  if (kind === "validator") return "验证";
  if (kind === "builder") return "构建/生成";
  if (kind === "router") return "路由";
  if (kind === "report") return "报告";
  if (kind === "sync") return "同步";
  const haystack = `${resource.name} ${resource.path ?? ""}`.toLowerCase();
  if (haystack.includes("validate") || haystack.includes("doctor") || haystack.includes("check")) return "验证";
  if (haystack.includes("inventory") || haystack.includes("generate") || haystack.includes("build")) return "构建/生成";
  if (haystack.includes("router") || haystack.includes("route")) return "路由";
  if (haystack.includes("report")) return "报告";
  return "本地脚本";
}

function getMcpServer(resource: AiosResource): McpServerRecord | null {
  const server = resource.metadata?.server;
  if (!server || typeof server !== "object") return null;
  const candidate = server as Partial<McpServerRecord>;
  if (typeof candidate.name !== "string" || typeof candidate.command !== "string") return null;
  return candidate as McpServerRecord;
}

function getMetadataString(resource: AiosResource, key: string): string | null {
  const value = resource.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function formatDate(value?: string): string {
  if (!value) return "未记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short", hour12: false }).format(new Date(value));
}
