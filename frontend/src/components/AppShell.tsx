import type { ReactNode } from "react";
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
            <h1>AIOS Control Center</h1>
            <p>Local read-only inventory</p>
          </div>
          <span className="status-chip status-ok">READ ONLY</span>
        </div>
        {sidebar}
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="caption">Snapshot</p>
            <strong>{new Date(inventory.generatedAt).toLocaleString()}</strong>
          </div>
          <div>
            <p className="caption">AIOS root</p>
            <code>{inventory.roots.aiosRoot}</code>
          </div>
          <div>
            <p className="caption">App source</p>
            <code>{inventory.roots.appSourcePath}</code>
          </div>
        </header>
        {main}
      </main>
      <aside className="inspector">{detail}</aside>
    </div>
  );
}
