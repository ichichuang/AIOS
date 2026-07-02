import type { ReactNode } from "react";
import { Badge, Card, Code, Flex, Text } from "@radix-ui/themes";
import { formatSnapshotDate, zhCN } from "../i18n/zh-CN";
import type { AiosInventory } from "../types/inventory";

interface AppShellProps {
  inventory: AiosInventory;
  sidebar: ReactNode;
  main: ReactNode;
  detail: ReactNode;
}

export function AppShell({ inventory, sidebar, main, detail }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <Text as="p" className="eyebrow">
              {zhCN.app.localOnly}
            </Text>
            <h1>{zhCN.app.title}</h1>
            <p>{zhCN.app.subtitle}</p>
          </div>
          <Badge className="status-chip status-ok" variant="soft">
            {zhCN.app.readOnly}
          </Badge>
        </div>
        {sidebar}
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div className="topbar-title">
            <Text as="p" className="eyebrow">
              {zhCN.app.sourceSnapshot}
            </Text>
            <h2>{zhCN.app.title}</h2>
            <p>{zhCN.moduleSummaries.dashboard}</p>
          </div>
          <Flex className="topbar-metrics" gap="3" align="stretch">
            <Card className="topbar-card" size="2">
              <Text as="p" className="caption">
                {zhCN.app.generatedAt}
              </Text>
              <strong>{formatSnapshotDate(inventory.generatedAt)}</strong>
            </Card>
            <Card className="topbar-card path-card" size="2">
              <Text as="p" className="caption">
                {zhCN.app.aiosRoot}
              </Text>
              <Code>{inventory.roots.aiosRoot}</Code>
            </Card>
            <Card className="topbar-card path-card" size="2">
              <Text as="p" className="caption">
                {zhCN.app.appSource}
              </Text>
              <Code>{inventory.roots.appSourcePath}</Code>
            </Card>
          </Flex>
        </header>
        <div className="workspace-body">{main}</div>
      </main>
      <aside className="inspector">{detail}</aside>
    </div>
  );
}
