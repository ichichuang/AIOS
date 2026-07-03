import { Box, Chip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { type ResourceView, VIEW_LABELS } from "../../lib/filtering";

interface ModuleHeaderProps {
  view: ResourceView;
  summary: string;
  count: number;
  children?: ReactNode;
}

export function ModuleHeader({ view, summary, count, children }: ModuleHeaderProps) {
  return (
    <Box className="module-header">
      <Box className="module-header-title">
        <Typography component="h2" variant="h2">
          {VIEW_LABELS[view]}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {summary}
        </Typography>
      </Box>
      <Box className="module-header-actions">
        <Chip color="primary" label={`${count} 项可见`} />
        {children}
      </Box>
    </Box>
  );
}
