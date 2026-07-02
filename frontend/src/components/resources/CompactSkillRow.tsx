import { Box, Button, Chip, Stack, Typography } from "@mui/material";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import { memo, useCallback, type CSSProperties, type ReactElement } from "react";
import type { RowComponentProps } from "react-window";
import { getResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { AiosResource } from "../../types/inventory";

export interface CompactSkillRowProps {
  resources: AiosResource[];
  selectedId: string | null;
  onSelect: (resource: AiosResource) => void;
}

function CompactSkillRowComponent({ ariaAttributes, index, style, resources, selectedId, onSelect }: RowComponentProps<CompactSkillRowProps>): ReactElement | null {
  const resource = resources[index];
  if (!resource) return null;
  const display = getResourceDisplay(resource);
  const selected = resource.id === selectedId;
  const handleSelect = useCallback(() => onSelect(resource), [onSelect, resource]);

  return (
    <Box {...ariaAttributes} className="compact-skill-row" style={style as CSSProperties}>
      <Box className={selected ? "compact-skill-row-inner selected" : "compact-skill-row-inner"} data-motion="compact-skill-row">
        <Box className="compact-skill-main">
          <Typography className="resource-title" component="h3">
            {display.zhName}
          </Typography>
          <Box className="code-pill resource-technical-name" component="code">
            {display.technicalName}
          </Box>
          <Typography className="resource-description" color="text.secondary" variant="body2">
            {display.zhDescription}
          </Typography>
        </Box>

        <Box className="compact-skill-path">
          <Typography className="caption" component="p">
            {zhCN.app.pathPreview}
          </Typography>
          <Box className="code-pill compact-path-code" component="code">
            {display.pathPreview}
          </Box>
        </Box>

        <Stack className="compact-skill-state" direction="row" sx={{ alignItems: "center", gap: 0.75, justifyContent: "flex-end" }}>
          <Chip className={`status-chip status-${resource.status}`} label={display.zhStatus} />
          <Chip className={`risk-chip risk-${resource.risk}`} label={display.zhRisk} />
          <Button size="small" startIcon={<VisibilityRounded fontSize="small" />} type="button" variant={selected ? "contained" : "outlined"} onClick={handleSelect}>
            {zhCN.app.viewAction}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

export const CompactSkillRow = memo(CompactSkillRowComponent) as (props: RowComponentProps<CompactSkillRowProps>) => ReactElement | null;
