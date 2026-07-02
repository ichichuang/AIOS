import { Box, Typography } from "@mui/material";
import { zhCN } from "../../i18n/zh-CN";

export function ModuleEmptyState() {
  return (
    <Box className="empty-state">
      <Typography component="h3" variant="h3">
        {zhCN.app.emptyTitle}
      </Typography>
      <Typography color="text.secondary">{zhCN.app.emptyBody}</Typography>
    </Box>
  );
}
