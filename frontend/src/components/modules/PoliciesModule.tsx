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

  const guardrails = useMemo(() => [
    { title: "数据源写保护", description: zhCN.safetyBoundaries.items[0] || "/Users/cc/.ai 在 Phase 1 中作为只读数据源，只有本应用仓库可写。" },
    { title: "全局策略限制", description: zhCN.safetyBoundaries.items[1] || "不得修改 active-global-skills-policy.json。" },
    { title: "全局入口限制", description: zhCN.safetyBoundaries.items[2] || "不得修改全局技能入口。" },
    { title: "运行基线限制", description: zhCN.safetyBoundaries.items[3] || "不得恢复旧的 68/69 全局技能基线。" },
    { title: "沙箱边界防线", description: zhCN.safetyBoundaries.items[4] || "不得启用 full-global skills mode。" },
    { title: "自动化变更限制", description: zhCN.safetyBoundaries.items[5] || "不得重建 Codex 自动化。" }
  ], []);

  return (
    <Box className="module-surface" component="section" aria-label={moduleAriaLabel("policies")}>
      <ModuleHeader view="policies" summary={zhCN.moduleSummaries.policies} count={resources.length}>
        <Chip label={`哈希 ${shortHash(baseline.policyHash)}`} variant="outlined" />
      </ModuleHeader>
      <Box className="module-scroll" sx={{ display: "flex", flexDirection: "column", gap: 2.5, p: 1.5, overflowY: "auto", height: "100%" }}>

        <Box className="policy-section">
          <Typography component="h3" variant="h3" sx={{ fontWeight: 700, mb: 1.5 }}>
            安全防线规则
          </Typography>
          <Box className="policy-guardrail-grid" sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 1.5 }}>
            {guardrails.map((item) => (
              <Card className="guardrail-card material-card" key={item.title} sx={{ border: "1px solid var(--aios-outline)", borderRadius: "14px", backgroundColor: "var(--aios-surface)" }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "13px", mb: 0.5, color: "var(--aios-primary)", display: "flex", alignItems: "center", gap: 0.5 }}>
                    🛡️ {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: "11px", lineHeight: 1.4 }}>
                    {item.description}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="policy" onSelect={onSelect} />)}
      </Box>
    </Box>
  );
}
