import { Box, Divider, IconButton, Typography, useMediaQuery, useTheme } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { lazy, Suspense, useRef } from "react";
import { zhCN } from "../../i18n/zh-CN";
import type { ResourceView } from "../../lib/filtering";
import type { McpServiceDetailRuntimeState } from "../../lib/mcpLibrary";
import type { SkillDetailRuntimeState } from "../../lib/skillLibrary";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { useInspectorMotion, useSmoothHoverSurfaceMotion } from "../../lib/useAiosMotion";
import type { AiosResource } from "../../types/inventory";

const ResourceInspector = lazy(() => import("../inspector/ResourceInspector").then((module) => ({ default: module.ResourceInspector })));

interface AiosInspectorSheetProps {
  activeView: ResourceView;
  resource: AiosResource | null;
  skillIdentity: SkillIdentityRow | null;
  skillCapability: SkillCapabilityClassification | null;
  mcpDetailState: McpServiceDetailRuntimeState | null;
  skillDetailState: SkillDetailRuntimeState | null;
  visibleCount: number;
  onMobileClose: () => void;
}

export function AiosInspectorSheet({ activeView, resource, skillIdentity, skillCapability, mcpDetailState, skillDetailState, visibleCount, onMobileClose }: AiosInspectorSheetProps) {
  const theme = useTheme();
  const isPersistent = useMediaQuery("(min-width: 1024px)");
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const body = <InspectorBody activeView={activeView} resource={resource} skillIdentity={skillIdentity} skillCapability={skillCapability} mcpDetailState={mcpDetailState} skillDetailState={skillDetailState} visibleCount={visibleCount} />;

  if (isPersistent) {
    return (
      <Box className="aios-inspector-sheet" component="aside" aria-label={zhCN.app.detailPanel}>
        {body}
      </Box>
    );
  }

  return (
    <Drawer
      anchor={isMobile ? "bottom" : "right"}
      className="aios-inspector-drawer"
      open={Boolean(resource)}
      slotProps={{ paper: { className: isMobile ? "inspector-drawer-paper bottom" : "inspector-drawer-paper" } }}
      onClose={onMobileClose}
    >
      <InspectorBody activeView={activeView} resource={resource} skillIdentity={skillIdentity} skillCapability={skillCapability} mcpDetailState={mcpDetailState} skillDetailState={skillDetailState} visibleCount={visibleCount} onClose={onMobileClose} showClose />
    </Drawer>
  );
}

interface InspectorBodyProps {
  activeView: ResourceView;
  resource: AiosResource | null;
  skillIdentity: SkillIdentityRow | null;
  skillCapability: SkillCapabilityClassification | null;
  mcpDetailState: McpServiceDetailRuntimeState | null;
  skillDetailState: SkillDetailRuntimeState | null;
  visibleCount: number;
  showClose?: boolean;
  onClose?: () => void;
}

function InspectorBody({ activeView, resource, skillIdentity, skillCapability, mcpDetailState, skillDetailState, visibleCount, showClose = false, onClose }: InspectorBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useInspectorMotion(bodyRef, resource?.id ?? "empty");
  useSmoothHoverSurfaceMotion(bodyRef, resource?.id ?? "empty", { selector: ".inspector-panel, .aios-inspector-section, .copy-button", scale: 1.006, y: -1 });

  return (
    <Box className="inspector-body" ref={bodyRef} data-aios-motion-surface>
      <Box className="inspector-header">
        <Typography className="eyebrow" component="p">
          {zhCN.app.detailPanel}
        </Typography>
        {showClose && onClose && (
          <IconButton aria-label="关闭检查器" onClick={onClose}>
            <CloseRounded fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Divider />
      <Box className="inspector-scroll">
        <Suspense fallback={<InspectorLoadingFallback />}>
          <ResourceInspector activeView={activeView} resource={resource} skillIdentity={skillIdentity} skillCapability={skillCapability} mcpDetailState={mcpDetailState} skillDetailState={skillDetailState} visibleCount={visibleCount} />
        </Suspense>
      </Box>
    </Box>
  );
}

function InspectorLoadingFallback() {
  return (
    <Box className="inspector-loading-panel" role="status" aria-busy="true" aria-live="polite">
      <Typography component="strong">正在加载详情</Typography>
      <Typography color="text.secondary" variant="body2">
        正在准备当前资源的详细信息...
      </Typography>
    </Box>
  );
}
