import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource } from "../../types/inventory";
import { ResourceMetaRow } from "../resources/ResourceMetaRow";

interface ResourceInspectorProps {
  resource: AiosResource | null;
}

export function ResourceInspector({ resource }: ResourceInspectorProps) {
  if (!resource) {
    return (
      <Box className="inspector-panel">
        <Typography component="h3" variant="h3">
          {zhCN.app.detailPanel}
        </Typography>
        <Typography color="text.secondary">{zhCN.app.inspectorEmpty}</Typography>
      </Box>
    );
  }

  const display = getResourceDisplay(resource);

  return (
    <Box className="inspector-panel">
      <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1, justifyContent: "space-between" }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography className="caption" component="p">
            {display.zhCategory}
          </Typography>
          <Typography component="h3" variant="h3">
            {display.zhName}
          </Typography>
        </Box>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, justifyContent: "flex-end" }}>
          <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
        </Stack>
      </Stack>
      <Typography color="text.secondary" variant="body2">
        {display.zhDescription}
      </Typography>
      <Divider />
      <Box className="inspector-meta-grid">
        <ResourceMetaRow label={zhCN.app.preservedName} value={display.technicalName} code />
        <ResourceMetaRow label="工具类型" value={display.zhToolType} />
        <ResourceMetaRow label="能力类型" value={display.zhCapability} />
        <ResourceMetaRow label="风险解释" value={display.zhRiskDescription} />
      </Box>
      <Box className="inspector-path-list">
        <Typography component="h4" variant="h3">
          {zhCN.app.pathPreview}
        </Typography>
        {resource.paths.length > 0 ? (
          resource.paths.map((path) => (
            <Box className="code-pill path-detail" component="code" key={path}>
              {path}
            </Box>
          ))
        ) : (
          <Typography color="text.secondary">{zhCN.app.noPath}</Typography>
        )}
      </Box>
    </Box>
  );
}
