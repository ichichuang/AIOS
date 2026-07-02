import { Box, Divider, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import Drawer from "@mui/material/Drawer";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource } from "../../types/inventory";
import { PromptPanel } from "../inspector/PromptPanel";
import { ResourceInspector } from "../inspector/ResourceInspector";
import { SafetyProfilePanel } from "../inspector/SafetyProfilePanel";
import { TokenPressurePanel } from "../inspector/TokenPressurePanel";

interface AiosInspectorSheetProps {
  open: boolean;
  resource: AiosResource | null;
  onClose: () => void;
}

export function AiosInspectorSheet({ open, resource, onClose }: AiosInspectorSheetProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const body = <InspectorBody resource={resource} onClose={onClose} />;

  if (isDesktop) {
    return (
      <Box className={open ? "aios-inspector-sheet open" : "aios-inspector-sheet"} component="aside" aria-label={zhCN.app.detailPanel}>
        {open && body}
      </Box>
    );
  }

  return (
    <Drawer
      anchor={isMobile ? "bottom" : "right"}
      className="aios-inspector-drawer"
      open={open}
      slotProps={{ paper: { className: isMobile ? "inspector-drawer-paper bottom" : "inspector-drawer-paper" } }}
      onClose={onClose}
    >
      {body}
    </Drawer>
  );
}

interface InspectorBodyProps {
  resource: AiosResource | null;
  onClose: () => void;
}

function InspectorBody({ resource, onClose }: InspectorBodyProps) {
  const display = resource ? getResourceDisplay(resource) : null;

  return (
    <Box className="inspector-body">
      <Stack className="inspector-header" direction="row" sx={{ alignItems: "flex-start", gap: 1.5, justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography className="eyebrow" component="p">
            {zhCN.app.detailPanel}
          </Typography>
          <Typography component="h2" variant="h3">
            {display?.zhName ?? "未选择资源"}
          </Typography>
          {display && (
            <Box className="code-pill inspector-code" component="code">
              {display.technicalName}
            </Box>
          )}
        </Box>
        <IconButton aria-label="关闭检查器" onClick={onClose}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </Stack>
      <Divider />
      <Box className="inspector-scroll">
        <ResourceInspector resource={resource} />
        {resource && (
          <>
            <SafetyProfilePanel resource={resource} />
            <TokenPressurePanel resource={resource} />
            <PromptPanel resource={resource} />
          </>
        )}
      </Box>
    </Box>
  );
}
