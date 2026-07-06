import { Box, Typography } from "@mui/material";
import { zhCN } from "../../i18n/zh-CN";

interface ModuleEmptyStateProps {
  title?: string;
  body?: string;
  hints?: string[];
}

const defaultHints = ["当前筛选下没有可显示的本机结果。", "可清空搜索、切换分组或选择其他页面。", "不会触发查找、脚本执行或配置写入。"];

export function ModuleEmptyState({ title = zhCN.app.emptyTitle, body = zhCN.app.emptyBody, hints = defaultHints }: ModuleEmptyStateProps) {
  return (
    <Box className="empty-state" data-aios-empty-state data-aios-hover-card data-aios-motion-surface data-motion="resource-card">
      <Typography component="h3" variant="h3">
        {title}
      </Typography>
      <Typography color="text.secondary">{body}</Typography>
      <Box className="empty-state-hints" component="ul">
        {hints.map((hint) => (
          <li key={hint}>{hint}</li>
        ))}
      </Box>
    </Box>
  );
}
