import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { translateKnownWarning, translateValidatorSummary } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function ValidatorsModule({ baseline, resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = [{ title: "观察型验证器", summary: "验证器能力仅展示状态和用途；运行需要用户显式命令。", resources }];

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("validators")}>
      <ModuleHeader view="validators" summary={zhCN.moduleSummaries.validators} count={resources.length}>
        <Chip label="已知 WARN 使用中性说明" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        <Box className="validator-notice-grid">
          {baseline.validators.map((validator) => (
            <Card className="validator-notice material-card" key={validator.name}>
              <CardContent>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1, justifyContent: "space-between" }}>
                  <Typography component="strong">{validator.name}</Typography>
                  <Chip className={`status-chip status-${validator.status}`} label={zhCN.statuses[validator.status]} />
                </Stack>
                <Typography color="text.secondary" variant="body2">
                  {translateValidatorSummary(validator)}
                </Typography>
              </CardContent>
            </Card>
          ))}
          {baseline.knownWarnings.map((warning) => (
            <Card className="validator-notice known material-card" key={warning}>
              <CardContent>
                <Typography className="caption" component="p">
                  {zhCN.safetyBoundaries.knownWarnings}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {translateKnownWarning(warning)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
        {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="validator" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
