import { Chip } from "@mui/material";
import { useMemo } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosModuleFrame } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { makeGroups, moduleAriaLabel } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

export function ScriptsModule({ resourceCorpus, resources, selectedId, onSelect }: AiosModuleProps) {
  const groups = useMemo(
    () =>
      makeGroups(
        resources,
        [
          { title: "验证脚本", summary: "验证与体检类脚本，只作为清单记录。", predicate: (resource) => scriptKind(resource) === "validator" },
          { title: "构建与生成", summary: "索引、快照和运行时视图生成脚本。", predicate: (resource) => scriptKind(resource) === "builder" },
          { title: "路由脚本", summary: "技能解析与路由辅助脚本。", predicate: (resource) => scriptKind(resource) === "router" },
          { title: "报告脚本", summary: "报告整理与输出相关脚本。", predicate: (resource) => scriptKind(resource) === "report" },
          { title: "同步脚本", summary: "同步类脚本在本界面仅展示，不触发。", predicate: (resource) => scriptKind(resource) === "sync" }
        ],
        { title: "本地脚本", summary: "其他本地脚本资源，保持只读库存记录。" }
      ),
    [resources]
  );

  return (
    <AiosModuleFrame
      view="scripts"
      summary={zhCN.moduleSummaries.scripts}
      count={resources.length}
      ariaLabel={moduleAriaLabel("scripts")}
      actions={
        <>
          <ResourceCorpusIndicator state={resourceCorpus} />
          <Chip label="清单记录，不执行" variant="outlined" />
        </>
      }
    >
      {groups.length === 0 ? <ModuleEmptyState /> : groups.map((group) => <ResourceGroup key={group.title} group={group} selectedId={selectedId} variant="script" onSelect={onSelect} />)}
    </AiosModuleFrame>
  );
}

function scriptKind(resource: { metadata?: Record<string, unknown>; name: string; path?: string }): string {
  const kind = resource.metadata?.kind;
  if (typeof kind === "string") return kind;
  const haystack = `${resource.name} ${resource.path ?? ""}`.toLowerCase();
  if (haystack.includes("validate") || haystack.includes("doctor") || haystack.includes("check")) return "validator";
  if (haystack.includes("build") || haystack.includes("generate") || haystack.includes("inventory")) return "builder";
  if (haystack.includes("router") || haystack.includes("route")) return "router";
  if (haystack.includes("report")) return "report";
  if (haystack.includes("sync")) return "sync";
  return "unknown";
}
