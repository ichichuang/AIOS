import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { translateKnownWarning, translateValidatorSummary } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function ValidatorsModule({ baseline, resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => [{ title: "观察型验证器", summary: "验证器能力仅展示状态和用途；运行需要用户显式命令。", resources }], [resources]);

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("validators")}>
      <ModuleHeader view="validators" summary={zhCN.moduleSummaries.validators} count={resources.length}>
        <Chip label="检查项与基线验证" variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll" sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 1.5, overflowY: "auto", height: "100%" }}>

        <Box className="validator-section">
          <Typography component="h3" variant="h3" sx={{ fontWeight: 700, mb: 1.5 }}>
            系统一致性检查项
          </Typography>
          <Box className="validator-notice-grid" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1.5, mb: 2.5 }}>
            {baseline.validators.map((validator) => (
              <Card className="validator-notice material-card" key={validator.name} sx={{ border: "1px solid var(--aios-outline)", borderRadius: "14px", backgroundColor: "var(--aios-surface)" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, justifyContent: "space-between", mb: 0.5 }}>
                    <Typography component="strong" sx={{ fontWeight: 700, fontSize: "13px" }}>
                      🔍 {validator.name}
                    </Typography>
                    <Chip className={`status-chip status-${validator.status}`} label={zhCN.statuses[validator.status]} size="small" sx={{ height: 20, fontSize: "10px" }} />
                  </Stack>
                  <Typography color="text.secondary" variant="body2" sx={{ fontSize: "11px", lineHeight: 1.4 }}>
                    {translateValidatorSummary(validator)}
                  </Typography>
                </CardContent>
              </Card>
            ))}

            {baseline.knownWarnings.map((warning) => (
              <Card className="validator-notice known material-card" key={warning} sx={{ border: "1px solid var(--aios-outline)", borderRadius: "14px", backgroundColor: "var(--aios-surface-muted)" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography className="caption" component="p" sx={{ fontSize: "10px", color: "text.secondary", mb: 0.5, fontWeight: 700 }}>
                    ⚠️ {zhCN.safetyBoundaries.knownWarnings}
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ fontSize: "11px", lineHeight: 1.4 }}>
                    {translateKnownWarning(warning)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="validator" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
