import { Box, Chip } from "@mui/material";
import { useMemo } from "react";
import { shortHash, zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosModuleFrame, AiosSection, AiosSectionHeader, AiosUsageRow } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

export function PoliciesModule({ baseline, resourceCorpus, resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => [{ title: "策略守卫", summary: "策略资源仅展示哈希、路径和边界说明，不读取或修改策略内容。", resources }], [resources]);

  const guardrails = useMemo(
    () => [
      { title: "数据源写保护", description: "本地 AIOS 数据源在本阶段只读，应用仅在当前仓库内写入。" },
      { title: "全局策略限制", description: "不得修改全局 active-global-skills-policy.json。" },
      { title: "全局入口限制", description: "不得修改全局技能入口。" },
      { title: "运行基线限制", description: "不得恢复旧的 68/69 全局技能基线。" },
      { title: "沙箱边界防线", description: "不得启用 full-global skills mode。" },
      { title: "自动化变更限制", description: "不得重建 Codex 自动化。" }
    ],
    []
  );

  return (
    <AiosModuleFrame
      view="policies"
      summary={zhCN.moduleSummaries.policies}
      count={resources.length}
      ariaLabel={moduleAriaLabel("policies")}
      actions={
        <>
          <ResourceCorpusIndicator state={resourceCorpus} />
          <Chip label={`哈希 ${shortHash(baseline.policyHash)}`} variant="outlined" />
        </>
      }
    >
        <AiosSection className="policy-section">
          <AiosSectionHeader title="安全防线规则" />
          <Box className="policy-guardrail-grid">
            {guardrails.map((item) => (
              <AiosUsageRow chips={[{ label: "守卫" }]} key={item.title} purpose={item.description} title={item.title} />
            ))}
          </Box>
        </AiosSection>

        {resources.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="policy" onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}
