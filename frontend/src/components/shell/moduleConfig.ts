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
