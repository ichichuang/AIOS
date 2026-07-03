import { Box, Divider, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { useRef } from "react";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import { buildSkillDisplayEnrichment } from "../../lib/skillDisplayEnrichment";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import { useInspectorMotion } from "../../lib/useAiosMotion";
import type { AiosResource } from "../../types/inventory";
import { ResourceInspector } from "../inspector/ResourceInspector";

interface AiosInspectorSheetProps {
  resource: AiosResource | null;
  skillIdentity: SkillIdentityRow | null;
  skillCapability: SkillCapabilityClassification | null;
  onMobileClose: () => void;
}

export function AiosInspectorSheet({ resource, skillIdentity, skillCapability, onMobileClose }: AiosInspectorSheetProps) {
  const theme = useTheme();
  const isPersistent = useMediaQuery("(min-width: 1024px)");
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const body = <InspectorBody resource={resource} skillIdentity={skillIdentity} skillCapability={skillCapability} />;

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
      <InspectorBody resource={resource} skillIdentity={skillIdentity} skillCapability={skillCapability} onClose={onMobileClose} showClose />
    </Drawer>
  );
}

interface InspectorBodyProps {
  resource: AiosResource | null;
  skillIdentity: SkillIdentityRow | null;
  skillCapability: SkillCapabilityClassification | null;
  showClose?: boolean;
  onClose?: () => void;
}

function InspectorBody({ resource, skillIdentity, skillCapability, showClose = false, onClose }: InspectorBodyProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  useInspectorMotion(bodyRef, resource?.id ?? "empty");

  return (
    <Box className="inspector-body" ref={bodyRef}>
      <Stack className="inspector-header" direction="row" sx={{ alignItems: "center", gap: 1.5, justifyContent: "space-between" }}>
        <Typography className="eyebrow" component="p" sx={{ m: 0, fontWeight: 700 }}>
          {zhCN.app.detailPanel}
        </Typography>
        {showClose && onClose && (
          <IconButton aria-label="关闭检查器" onClick={onClose}>
            <CloseRounded fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Divider />
      <Box className="inspector-scroll">
        <ResourceInspector resource={resource} skillIdentity={skillIdentity} skillCapability={skillCapability} />
      </Box>
    </Box>
  );
}
