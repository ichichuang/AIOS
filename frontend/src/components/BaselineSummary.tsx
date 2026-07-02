import { Badge, Card, Code, Text } from "@radix-ui/themes";
import { formatAutomationState, shortHash, zhCN } from "../i18n/zh-CN";
import type { BaselineSummary as BaselineSummaryType } from "../types/inventory";

interface BaselineSummaryProps {
  baseline: BaselineSummaryType;
}

export function BaselineSummary({ baseline }: BaselineSummaryProps) {
  const routerStatus = baseline.customSkillRouterCodex && baseline.customSkillRouterAgents ? "Codex + Agents" : "部分启用";

  return (
    <section className="summary-grid" aria-label="基线摘要">
      <Card className="metric-panel wide" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.policyHash}
        </Text>
        <strong>{shortHash(baseline.policyHash)}</strong>
        <span>{baseline.policyHash ? zhCN.dashboardMetrics.guardTarget : zhCN.dashboardMetrics.policyMissing}</span>
      </Card>
      <Card className="metric-panel" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.canonicalSkills}
        </Text>
        <strong>{baseline.canonicalSkillCount}</strong>
        <Code>/Users/cc/.ai</Code>
      </Card>
      <Card className="metric-panel" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.codexActive}
        </Text>
        <strong>{baseline.codexActiveUserSkillCount}</strong>
        <span>
          {baseline.codexTopLevelCount} {zhCN.dashboardMetrics.topLevelReserved}
        </span>
      </Card>
      <Card className="metric-panel" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.agentsActive}
        </Text>
        <strong>{baseline.agentsActiveUserSkillCount}</strong>
        <span>{zhCN.dashboardMetrics.globalEntrypoints}</span>
      </Card>
      <Card className="metric-panel" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.claudeSkills}
        </Text>
        <strong>{baseline.claudeSkillCount ?? zhCN.app.notAvailable}</strong>
        <span>{zhCN.dashboardMetrics.safeEntrypointMetadata}</span>
      </Card>
      <Card className="metric-panel" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.router}
        </Text>
        <strong>{routerStatus}</strong>
        <Badge variant="soft">{zhCN.dashboardMetrics.customSkillRouter}</Badge>
      </Card>
      <Card className="metric-panel" size="2">
        <Text as="p" className="caption">
          {zhCN.dashboardMetrics.codexAutomations}
        </Text>
        <strong>{formatAutomationState(baseline.codexAutomationDirectoryState)}</strong>
        <span>{zhCN.dashboardMetrics.mustNotRecreate}</span>
      </Card>
    </section>
  );
}
