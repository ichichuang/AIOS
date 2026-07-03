import { Box, Typography } from "@mui/material";
import { zhCN } from "../../i18n/zh-CN";

export function ModuleEmptyState() {
  return (
    <Box className="empty-state">
      <Typography component="h3" variant="h3">
        {zhCN.app.emptyTitle}
      </Typography>
      <Typography color="text.secondary">{zhCN.app.emptyBody}</Typography>
      <Box className="empty-state-hints" component="ul">
        <li>当前筛选下没有可显示的本地资源。</li>
        <li>可清空搜索、切换分组或选择其他模块。</li>
        <li>不会触发扫描、脚本执行或配置写入。</li>
      </Box>
    </Box>
  );
}
