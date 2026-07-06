import ArticleRounded from "@mui/icons-material/ArticleRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import ExtensionRounded from "@mui/icons-material/ExtensionRounded";
import FactCheckRounded from "@mui/icons-material/FactCheckRounded";
import FolderOpenRounded from "@mui/icons-material/FolderOpenRounded";
import HistoryRounded from "@mui/icons-material/HistoryRounded";
import HubRounded from "@mui/icons-material/HubRounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import PolicyRounded from "@mui/icons-material/PolicyRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import TerminalRounded from "@mui/icons-material/TerminalRounded";
import type { SvgIconComponent } from "@mui/icons-material";
import type { ResourceView } from "../../lib/filtering";
import { advancedSupportViews, primaryNavigationViews } from "../../lib/productShell";

export const consoleViews: ResourceView[] = [...primaryNavigationViews, ...advancedSupportViews];

export interface NavigationGroup {
  key: "primary";
  title: string;
  summary: string;
  views: ResourceView[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    key: "primary",
    title: "主导航",
    summary: "首页、技能、MCP 和高级。",
    views: primaryNavigationViews
  }
];

export const moduleIcons: Record<ResourceView, SvgIconComponent> = {
  dashboard: DashboardRounded,
  "custom-scan": FolderOpenRounded,
  skills: ExtensionRounded,
  mcp: HubRounded,
  advanced: SettingsRounded,
  scripts: TerminalRounded,
  reports: ArticleRounded,
  "project-packs": Inventory2Rounded,
  policies: PolicyRounded,
  validators: FactCheckRounded,
  legacy: HistoryRounded
};
