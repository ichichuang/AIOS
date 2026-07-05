import { getMcpGroup } from "../../i18n/resourceText";
import type { ResourceDisplay } from "../../i18n/resourceText";
import { zhCN } from "../../i18n/zh-CN";
import type { ResourceView } from "../../lib/filtering";
import { VIEW_LABELS } from "../../lib/filtering";
import type { ProjectResourceMapEntry, ResourceCorpusScope, ResourceCorpusSourceMode, ResourceCorpusSummary, ResourceDataSourceState, ScanSourceResourceMapEntry } from "../../lib/resourceCorpus";
import type { SkillCapabilityClassification } from "../../lib/skillCapabilityClassifier";
import type { SkillIdentityRow } from "../../lib/skillIdentityModel";
import type { AiosResource, BaselineSummary, McpServerRecord, RiskLevel } from "../../types/inventory";
import type { ResourceGroupData } from "../resources/ResourceGroup";

export interface ResourceSelectionContext {
  skillIdentity?: SkillIdentityRow;
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
  displayById: ReadonlyMap<string, ResourceDisplay>;
  query: string;
  resources: AiosResource[];
  selectedId: string | null;
  skillCapabilityById: ReadonlyMap<string, SkillCapabilityClassification>;
  viewCounts: Record<ResourceView, number>;
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
  return `${VIEW_LABELS[view]}模块`;
}

export function moduleEmptyStateCopy(view: ResourceView): { title: string; body: string; hints: string[] } {
  switch (view) {
    case "skills":
      return {
        title: "尚未发现 Skills",
        body: "尚未发现 Skills；请到扫描管理添加项目目录或运行智能发现。",
        hints: ["当前技能库只读取 SQLite 动态资源库。", "Legacy 示例数据不会计入技能库数量。", "扫描不会自动开始。"]
      };
    case "mcp":
      return {
        title: "尚未发现 MCP metadata",
        body: "尚未发现 MCP metadata。",
        hints: ["AIOS 不会启动或连接 MCP 服务。", "仅用户扫描后的动态元数据会显示在这里。", "Legacy 示例数据只在旧入口查看。"]
      };
    case "scripts":
      return {
        title: "尚未发现脚本元数据",
        body: "尚未发现脚本元数据；AIOS 不会执行脚本。",
        hints: ["脚本只作为元数据资源展示。", "扫描结果来自本地 SQLite 资源库。", "执行仍需要用户在应用外显式命令。"]
      };
    case "reports":
      return {
        title: "尚未发现报告元数据",
        body: "尚未发现报告元数据；请先在扫描管理中添加目录并手动扫描。",
        hints: ["报告列表只展示扫描持久化的元数据。", "不会读取或展示文件正文。", "Legacy 示例数据不参与当前模块计数。"]
      };
    case "project-packs":
      return {
        title: "尚未发现项目包元数据",
        body: "尚未发现项目包元数据；请扫描包含项目资源包的目录。",
        hints: ["项目 / source scope 只来自动态资源库。", "不会复制资源到全局入口。", "Legacy 示例数据仅用于兼容查看。"]
      };
    case "policies":
      return {
        title: "尚未发现策略元数据",
        body: "尚未发现策略元数据；请扫描包含治理或策略资源的项目目录。",
        hints: ["策略模块不会修改策略文件。", "当前列表只使用用户扫描后的 SQLite 元数据。", "Legacy 示例数据不参与策略计数。"]
      };
    case "validators":
      return {
        title: "尚未发现验证器元数据",
        body: "尚未发现验证器元数据；请扫描包含验证器或检查脚本的目录。",
        hints: ["验证器状态卡是只读基线说明。", "验证器资源列表只来自动态资源库。", "AIOS 不会运行验证器。"]
      };
    case "legacy":
      return {
        title: "Legacy 示例数据不可用",
        body: "未加载到内置示例/兼容快照。",
        hints: ["Legacy 只用于兼容查看。", "它不代表当前电脑扫描结果。", "不会写入 SQLite 动态资源库。"]
      };
    default:
      return {
        title: "尚未扫描任何目录",
        body: "当前动态资源库为空；请到扫描管理添加项目目录或运行智能发现。",
        hints: ["默认模块只读取 SQLite 动态资源库。", "Legacy 示例数据不会计入默认数量。", "扫描必须由用户手动启动。"]
      };
  }
}
