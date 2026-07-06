import { getMcpGroup } from "../../i18n/resourceText";
import type { ResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { ResourceView } from "../../lib/filtering";
import { VIEW_LABELS } from "../../lib/filtering";
import type { ProjectResourceMapEntry, ResourceCorpusScope, ResourceCorpusSourceMode, ResourceCorpusSummary, ResourceDataSourceState, ScanSourceResourceMapEntry } from "../../lib/resourceCorpus";
import type { SkillLibraryModuleState, SkillListItem } from "../../lib/skillLibrary";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import type { AiosResource, BaselineSummary, McpServerRecord, RiskLevel } from "../../types/inventory";
import type { ResourceGroupData } from "../resources/ResourceGroup";

export interface ResourceSelectionContext {
  skillIdentity?: SkillIdentityRow;
  skillListItem?: SkillListItem;
}

export interface ResourceCorpusModuleState {
  activeScope: ResourceCorpusScope;
  dataSource: ResourceDataSourceState;
  error: string | null;
  firstRunOnboardingDismissed: boolean;
  loading: boolean;
  mode: ResourceCorpusSourceMode;
  projectMap: ProjectResourceMapEntry[];
  onSetFirstRunOnboardingDismissed: (dismissed: boolean) => void;
  onScopeChange: (scope: ResourceCorpusScope) => void;
  refresh: () => void;
  scanSourceMap: ScanSourceResourceMapEntry[];
  scopes: ResourceCorpusScope[];
  summary: ResourceCorpusSummary;
}

export interface AiosModuleProps {
  allResources: AiosResource[];
  baseline: BaselineSummary;
  resourceCorpus: ResourceCorpusModuleState;
  skillLibrary: SkillLibraryModuleState;
  displayById: ReadonlyMap<string, ResourceDisplay>;
  query: string;
  resources: AiosResource[];
  selectedId: string | null;
  skillCapabilityById: ReadonlyMap<string, SkillCapabilityClassification>;
  viewCounts: Record<ResourceView, number>;
  onBack?: () => void;
  onClearSelection: () => void;
  onSelect: (resource: AiosResource, context?: ResourceSelectionContext) => void;
  onViewChange: (view: ResourceView) => void;
  onQueryChange?: (query: string) => void;
}

export function sortByUpdatedAt(resources: AiosResource[]): AiosResource[] {
  return [...resources].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime());
}

export function riskCounts(resources: AiosResource[]): Record<RiskLevel, number> {
  return resources.reduce<Record<RiskLevel, number>>(
    (counts, resource) => {
      counts[resource.risk] += 1;
      return counts;
    },
    { low: 0, medium: 0, high: 0 }
  );
}

export function makeGroups(resources: AiosResource[], definitions: Array<{ title: string; summary: string; predicate: (resource: AiosResource) => boolean }>, fallback?: { title: string; summary: string }): ResourceGroupData[] {
  const assigned = new Set<string>();
  const groups = definitions.map((definition) => {
    const groupResources = resources.filter((resource) => {
      const matched = definition.predicate(resource);
      if (matched) assigned.add(resource.id);
      return matched;
    });
    return { title: definition.title, summary: definition.summary, resources: groupResources };
  });

  if (fallback) {
    const other = resources.filter((resource) => !assigned.has(resource.id));
    groups.push({ title: fallback.title, summary: fallback.summary, resources: other });
  }

  return groups.filter((group) => group.resources.length > 0);
}

export function getMcpServer(resource: AiosResource): McpServerRecord | null {
  const server = resource.metadata?.server;
  if (!server || typeof server !== "object") return null;
  const candidate = server as Partial<McpServerRecord>;
  if (typeof candidate.name !== "string" || typeof candidate.command !== "string") return null;
  return candidate as McpServerRecord;
}

export function getMcpGroups(resources: AiosResource[]): ResourceGroupData[] {
  const order = ["credential", "npx", "remote", "local", "unknown"] as const;
  return order
    .map((group) => ({
      title: zhCN.mcp.groups[group],
      summary: zhCN.mcp.groupSummaries[group],
      resources: resources.filter((resource) => {
        const server = getMcpServer(resource);
        return server ? getMcpGroup(server) === group : group === "unknown";
      })
    }))
    .filter((group) => group.resources.length > 0);
}

export function moduleAriaLabel(view: ResourceView): string {
  return `${VIEW_LABELS[view]}页面`;
}

export function moduleEmptyStateCopy(view: ResourceView): { title: string; body: string; hints: string[] } {
  switch (view) {
    case "skills":
      return {
        title: "还没有找到 AI 技能",
        body: "开始查找后，这里会显示技能名称、用途、来源和使用方法。",
        hints: ["技能是一段给 AI 使用的说明和流程。", "可按来源和状态整理技能。", "查找不会自动开始。"]
      };
    case "mcp":
      return {
        title: "还没有找到 MCP 工具",
        body: "开始查找后，这里会显示本机已配置的 MCP 服务和工具。",
        hints: ["MCP 是一种让 AI 应用连接外部工具的方式。", "AIOS Desktop 不会启动 MCP 服务。", "AIOS Desktop 不会调用 MCP 工具。"]
      };
    case "advanced":
      return {
        title: "还没有高级信息",
        body: "高级页用于查看查找位置、来源分组、问题摘要和本地记录控制。",
        hints: ["高级内容只用于排查。", "普通页面仍只展示技能和 MCP。", "这里不会执行脚本或启动 MCP 服务。"]
      };
    case "scripts":
      return {
        title: "还没有脚本说明",
        body: "这里仅作为高级支持，帮助解释技能或 MCP 相关脚本线索；AIOS Desktop 不执行脚本。",
        hints: ["只读查看。", "不会运行脚本。", "普通用户不需要进入这里。"]
      };
    case "reports":
      return {
        title: "还没有历史报告摘要",
        body: "这里仅作为高级支持，帮助追溯技能和 MCP 查找结果来源。",
        hints: ["只显示摘要线索。", "不会读取私人文档正文。", "普通用户不需要进入这里。"]
      };
    case "project-packs":
      return {
        title: "还没有项目来源线索",
        body: "这里仅作为高级支持，查看项目文件夹里的技能、MCP 配置和相关来源。",
        hints: ["不会复制项目文件。", "不会修改技能或 MCP 配置。", "建议选择具体项目文件夹。"]
      };
    case "policies":
      return {
        title: "还没有安全说明线索",
        body: "这里仅作为高级支持，查看只读边界和安全说明。",
        hints: ["不会修改安全配置。", "不会读取密钥值。", "普通用户可只看首页提醒。"]
      };
    case "validators":
      return {
        title: "还没有检查结果",
        body: "这里仅作为高级支持，查看观察型检查结果和开发者诊断信息。",
        hints: ["不会运行检查器。", "不会执行命令。", "只用于排查技能和 MCP 体验。"]
      };
    case "legacy":
      return {
        title: "历史入口不可用",
        body: "这里仅作为高级支持，保留旧示例和迁移边界。",
        hints: ["不作为普通用户入口。", "不代表当前电脑查找结果。", "不会修改本机文件。"]
      };
    default:
      return {
        title: "还没有查找这台电脑上的 AI 技能",
        body: "点击开始后，AIOS Desktop 会查找本机 AI 技能和 MCP 工具的基本信息。",
        hints: ["结果只保存在这台电脑上。", "不会上传查找结果。", "查找必须由用户手动开始。"]
      };
  }
}
