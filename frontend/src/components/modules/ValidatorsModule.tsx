import { Box, Chip } from "@mui/material";
import { useMemo } from "react";
import { translateKnownWarning, translateValidatorSummary } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosModuleFrame, AiosSection, AiosSectionHeader, AiosUsageRow } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { renderBackButton } from "./moduleBackButton";
import { moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

export function ValidatorsModule({ baseline, resourceCorpus, resources, selectedId, onBack, onSelect }: AiosModuleProps) {
  const groups = useMemo(() => [{ title: "观察型验证器", summary: "验证器能力仅展示状态和用途；运行需要用户显式命令。", resources }], [resources]);

  return (
    <AiosModuleFrame
      view="validators"
      summary={zhCN.moduleSummaries.validators}
      count={resources.length}
      ariaLabel={moduleAriaLabel("validators")}
      backButton={renderBackButton("validators", onBack)}
      actions={
        <>
          <ResourceCorpusIndicator state={resourceCorpus} />
          <Chip label="检查项与基线验证" variant="outlined" />
        </>
      }
    >
        <AiosSection className="validator-section">
          <AiosSectionHeader title="系统一致性检查项" />
          <Box className="validator-notice-grid">
            {baseline.validators.map((validator) => (
              <AiosUsageRow
                chips={[{ label: zhCN.statuses[validator.status], className: `status-chip status-${validator.status}`, variant: "filled" }, { label: "观察" }]}
                key={validator.name}
                purpose={translateValidatorSummary(validator)}
                technicalName={validator.name}
                title={validator.name}
              />
            ))}

            {baseline.knownWarnings.map((warning) => (
              <AiosUsageRow
                chips={[{ label: "已知 WARN", className: "status-chip status-warn", variant: "filled" }]}
                className="validator-notice known"
                key={warning}
                purpose={translateKnownWarning(warning)}
                title={zhCN.safetyBoundaries.knownWarnings}
              />
            ))}
          </Box>
        </AiosSection>

        {resources.length === 0 ? <ModuleEmptyState {...moduleEmptyStateCopy("validators")} /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="validator" onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}
