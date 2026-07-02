import { Box, Chip, Stack, Typography } from "@mui/material";
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
      <Stack className="module-header-title" spacing={0.4}>
        <Typography className="eyebrow" component="p">
          {VIEW_LABELS[view]}
        </Typography>
        <Typography component="h2" variant="h2">
          {VIEW_LABELS[view]}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {summary}
        </Typography>
      </Stack>
      <Stack direction="row" sx={{ alignItems: "center", flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
        <Chip color="primary" label={`${count} 项可见`} />
        {children}
      </Stack>
    </Box>
  );
}
