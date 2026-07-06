import type { ResourceView } from "./filtering";

export type PrimaryNavigationView = "dashboard" | "skills" | "mcp" | "advanced";
export type AdvancedSupportView = "custom-scan" | "scripts" | "reports" | "project-packs" | "policies" | "validators" | "legacy";

export interface AdvancedSupportCard {
  view: AdvancedSupportView;
  title: string;
  description: string;
  actionLabel: string;
  section: "search" | "records" | "diagnostics" | "compatibility";
}

export const primaryNavigationViews: PrimaryNavigationView[] = ["dashboard", "skills", "mcp", "advanced"];
export const advancedSupportViews: AdvancedSupportView[] = ["custom-scan", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

export const advancedSupportCards: AdvancedSupportCard[] = [
  {
    view: "custom-scan",
    title: "查找位置",
    description: "高级支持：手动选择文件夹、查看跳过项、问题摘要和应用自己的本地记录控制。",
    actionLabel: "管理查找位置",
    section: "search"
  },
  {
    view: "scripts",
    title: "脚本说明",
    description: "高级支持：只读查看与技能或 MCP 相关的脚本线索，AIOS Desktop 不执行脚本。",
    actionLabel: "查看脚本线索",
    section: "records"
  },
  {
    view: "reports",
    title: "历史报告",
    description: "高级支持：查看旧报告摘要来源，帮助理解技能和 MCP 查找结果。",
    actionLabel: "查看报告摘要",
    section: "records"
  },
  {
    view: "project-packs",
    title: "项目里的技能和工具",
    description: "高级支持：查看项目文件夹里的技能、MCP 配置和相关来源线索。",
    actionLabel: "查看项目来源",
    section: "records"
  },
  {
    view: "policies",
    title: "安全说明",
    description: "高级支持：查看只读边界、安全说明和不会修改本机配置的依据。",
    actionLabel: "查看安全说明",
    section: "diagnostics"
  },
  {
    view: "validators",
    title: "检查结果",
    description: "高级支持：查看观察型检查结果和开发者诊断信息，不运行检查器。",
    actionLabel: "查看检查结果",
    section: "diagnostics"
  },
  {
    view: "legacy",
    title: "历史入口",
    description: "高级支持：保留旧示例和迁移边界，不作为普通用户主流程。",
    actionLabel: "查看历史入口",
    section: "compatibility"
  }
];

export const advancedSupportSectionLabels: Record<AdvancedSupportCard["section"], string> = {
  search: "查找位置",
  records: "本地记录与隐私",
  diagnostics: "开发者诊断",
  compatibility: "旧入口与兼容信息"
};

export const topSearchCopy = {
  placeholder: "搜索技能、MCP 和来源",
  ariaLabel: "搜索技能、MCP 和来源"
};

export function resolvePrimaryNavigationSearch(input: string): PrimaryNavigationView | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;
  return primaryNavigationViews.find((view) => view === value || getPrimaryNavigationLabel(view).toLowerCase() === value || `${getPrimaryNavigationLabel(view)} ${view}`.toLowerCase() === value) ?? null;
}

export const homeCopy = {
  title: "查看这台电脑上的 AI 技能和 MCP 工具",
  summary: "AIOS Desktop 把本机已经安装或配置的 AI 技能和 MCP 工具整理成简单清单。",
  primaryActions: [
    { label: "开始查找", targetView: "advanced" as const },
    { label: "手动选择文件夹", targetView: "advanced" as const }
  ] satisfies Array<{ label: string; targetView: PrimaryNavigationView }>,
  safetyReminders: [
    "结果只保存在这台电脑上。",
    "不会上传查找结果。",
    "不会读取密钥、令牌、密码、浏览器 Cookie 或登录会话。",
    "不会运行本机命令，也不会启动 MCP 服务或调用 MCP 工具。"
  ]
};

export function isAdvancedSupportView(view: ResourceView): view is AdvancedSupportView {
  return advancedSupportViews.includes(view as AdvancedSupportView);
}

export function isAdvancedView(view: ResourceView): boolean {
  return view === "advanced" || isAdvancedSupportView(view);
}

export function getPrimaryNavigationView(view: ResourceView): PrimaryNavigationView {
  if (view === "dashboard" || view === "skills" || view === "mcp" || view === "advanced") return view;
  return "advanced";
}

function getPrimaryNavigationLabel(view: PrimaryNavigationView): string {
  switch (view) {
    case "dashboard":
      return "首页";
    case "skills":
      return "技能";
    case "mcp":
      return "MCP";
    case "advanced":
      return "高级";
  }
}

export function getAdvancedSubviewParent(view: ResourceView): PrimaryNavigationView | null {
  if (isAdvancedSupportView(view)) return "advanced";
  return null;
}

export const advancedSubviewBackLabels: Record<AdvancedSupportView, string> = {
  "custom-scan": "返回高级",
  scripts: "返回高级",
  reports: "返回高级",
  "project-packs": "返回高级",
  policies: "返回高级",
  validators: "返回高级",
  legacy: "返回高级"
};
