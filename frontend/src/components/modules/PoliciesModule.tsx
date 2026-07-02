import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { useMemo } from "react";
import { shortHash, zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ModuleHeader } from "./ModuleHeader";

export function PoliciesModule({ baseline, resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => [{ title: "策略守卫", summary: "策略资源仅展示哈希、路径和边界说明，不读取或修改策略内容。", resources }], [resources]);

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("policies")}>
      <ModuleHeader view="policies" summary={zhCN.moduleSummaries.policies} count={resources.length}>
        <Chip label={`哈希 ${shortHash(baseline.policyHash)}`} variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll">
        <Box className="policy-guardrail-grid">
          {zhCN.safetyBoundaries.items.slice(0, 6).map((item) => (
            <Card className="guardrail-card material-card" key={item}>
              <CardContent>
                <Typography component="strong">{item}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
        {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="policy" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
