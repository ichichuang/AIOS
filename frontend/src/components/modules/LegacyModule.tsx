import { Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosModuleFrame } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { renderBackButton } from "./moduleBackButton";
import { makeGroups, moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

export function LegacyModule({ resourceCorpus, resources, selectedId, onBack, onSelect }: AiosModuleProps) {
  const groups = useMemo(
    () =>
      makeGroups(
        resources,
        [
          { title: "旧入口提示", summary: "保留旧提示和兼容资源的可见性，不作为主工作流。", predicate: (resource) => resource.capabilityType === "usage-prompt" },
          { title: "兼容视图", summary: "旧入口仅用于识别迁移边界。", predicate: (resource) => resource.toolType === "legacy" }
        ],
        { title: "其他兼容资源", summary: "仅展示元数据，不恢复旧基线。" }
      ),
    [resources]
  );

  return (
    <AiosModuleFrame
      view="legacy"
      summary="这是内置示例/兼容快照，不代表当前电脑扫描结果。"
      count={resources.length}
      ariaLabel={moduleAriaLabel("legacy")}
      backButton={renderBackButton("legacy", onBack)}
      actions={
        <>
          <ResourceCorpusIndicator state={resourceCorpus} />
          <Chip className="status-chip status-warn" label="旧入口示例" variant="outlined" />
          <Chip label="不代表当前电脑扫描结果" variant="outlined" />
        </>
      }
    >
      {groups.length === 0 ? <ModuleEmptyState {...moduleEmptyStateCopy("legacy")} /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="legacy" onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}
