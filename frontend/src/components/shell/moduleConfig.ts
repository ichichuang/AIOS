import ArticleRounded from "@mui/icons-material/ArticleRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import ExtensionRounded from "@mui/icons-material/ExtensionRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import PolicyRounded from "@mui/icons-material/PolicyRounded";
import TerminalRounded from "@mui/icons-material/TerminalRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ResourceView } from "../../lib/filtering";

export const consoleViews: ResourceView[] = ["dashboard", "skills", "mcp", "scripts", "reports", "project-packs", "policies", "validators", "legacy"];

export interface NavigationGroup {
  key: "overview" | "inventory" | "operations" | "governance" | "legacy";
  title: string;
  summary: string;
  views: ResourceView[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    key: "overview",
    title: "总览",
    summary: "桌面工作台入口与产品边界。",
    views: ["dashboard"]
  },
  {
    key: "inventory",
    title: "能力清单",
    summary: "本地能力、MCP 元数据与项目包清单。",
    views: ["skills", "mcp", "project-packs"]
  },
  {
    key: "operations",
    title: "本地操作",
    summary: "脚本与报告仅作为只读清单展示。",
    views: ["scripts", "reports"]
  },
  {
    key: "governance",
    title: "治理",
    summary: "策略守卫和观察型验证器状态。",
    views: ["policies", "validators"]
  },
  {
    key: "legacy",
    title: "旧入口 / 兼容",
    summary: "旧入口与兼容边界，不恢复旧工作流。",
    views: ["legacy"]
  }
];

export const moduleIcons: Record<ResourceView, SvgIconComponent> = {
  dashboard: DashboardRounded,
  skills: ExtensionRounded,
  mcp: HubRounded,
  scripts: TerminalRounded,
  reports: ArticleRounded,
  "project-packs": Inventory2Rounded,
  policies: PolicyRounded,
  validators: FactCheckRounded,
  legacy: HistoryRounded
};
