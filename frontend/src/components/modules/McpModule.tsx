import { Alert, Box, Chip } from "@mui/material";
import { useCallback, useMemo, useRef, useState } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { useContentPanelSwapMotion } from "../../lib/useAiosMotion";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosContentPanel, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosSectionRail, AiosUsageCard } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { getMcpGroups, moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

type McpSection = "services" | "tools" | "attention";

export function McpModule({ resources, selectedId, onSelect }: AiosModuleProps) {
  const [activeSection, setActiveSection] = useState<McpSection>("services");
  const panelRef = useRef<HTMLDivElement>(null);
  const attentionCount = resources.filter((resource) => resource.risk !== "low" || (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available")).length;
  const serviceResources = useMemo(() => resources.filter((resource) => resource.capabilityType === "mcp-server"), [resources]);
  const toolResources = useMemo(() => resources.filter((resource) => resource.capabilityType === "mcp-client"), [resources]);
  const attentionResources = useMemo(() => resources.filter((resource) => resource.risk !== "low" || (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available")), [resources]);
  const sections = useMemo(
    () => [
      {
        value: "services",
        label: "服务",
        count: serviceResources.length || resources.length,
        title: "MCP 服务",
        summary: "本机已配置的服务摘要；这里只展示用途、来源和边界，不启动服务。",
        resources: serviceResources.length > 0 ? serviceResources : resources
      },
      {
        value: "tools",
        label: "工具",
        count: toolResources.length,
        title: "工具能力",
        summary: "服务暴露的工具线索；AIOS Desktop 只展示配置摘要，不调用工具。",
        resources: toolResources
      },
      {
        value: "attention",
        label: "需关注",
        count: attentionCount,
        title: "需要复核",
        summary: "权限、状态或边界需要人工查看的 MCP 条目。",
        resources: attentionResources
      }
    ],
    [attentionCount, attentionResources, resources, serviceResources, toolResources]
  );
  const active = sections.find((section) => section.value === activeSection) ?? sections[0];
  const sectionResources = active.resources;
  const groups = useMemo(() => getMcpGroups(sectionResources), [sectionResources]);
  const sectionOptions = useMemo(() => sections.map(({ value, label, count }) => ({ value, label, count })), [sections]);
  const handleSectionChange = useCallback((nextValue: string) => setActiveSection(nextValue as McpSection), []);
  useContentPanelSwapMotion(panelRef, activeSection);

  return (
    <AiosModuleFrame
      className="mcp-module"
      contentClassName="mcp-module-scroll"
      view="mcp"
      summary={zhCN.moduleSummaries.mcp}
      count={sectionResources.length}
      ariaLabel={moduleAriaLabel("mcp")}
      motionKey={`mcp:${activeSection}:${sectionResources.length}`}
      actions={
        <>
          <Chip label="不启动服务" variant="outlined" size="small" />
          <Chip label="不调用工具" variant="outlined" size="small" />
        </>
      }
    >
      <Box className="mcp-service-overview" data-aios-layout-fixed data-aios-motion-surface>
        <AiosSection className="mcp-intro-section">
          <Box className="mcp-intro-text">
            <p>MCP 让 AI 应用可以连接本机工具或服务，比如读取文件、调用浏览器或操作其他程序。这里只显示本机已经配置的 MCP 服务信息，不会实际连接或运行它们。</p>
          </Box>
          <Alert className="mcp-local-reminder" severity="info" variant="outlined">
            这里只读展示本机配置摘要；AIOS Desktop 不启动服务、不连接远程端点、不调用 MCP 工具。
          </Alert>
          <Box className="mcp-summary-grid">
            <AiosUsageCard
              className="mcp-summary-card"
              icon={null}
              purpose="本机已配置的 MCP 服务数量。"
              selected={activeSection === "services"}
              technicalName={`${resources.length} 个`}
              title="MCP 服务"
              onClick={() => setActiveSection("services")}
            />
            <AiosUsageCard
              className="mcp-summary-card"
              icon={null}
              purpose="来源、权限或风险需要再确认的服务。"
              selected={activeSection === "attention"}
              technicalName={`${attentionCount} 个`}
              title="需要复核"
              onClick={() => setActiveSection("attention")}
            />
          </Box>
        </AiosSection>
      </Box>

      <Box className="mcp-service-workspace aios-two-pane" data-aios-motion-surface>
        <AiosSectionRail ariaLabel="MCP 浏览分类" options={sectionOptions} value={activeSection} onChange={handleSectionChange} />
        <Box className="aios-pane aios-pane-scroll mcp-browser-panel" ref={panelRef} data-aios-internal-scroll="true">
          <AiosContentPanel className="mcp-content-panel" active>
            <AiosSectionHeader title={active.title} summary={active.summary} count={sectionResources.length} />
            {groups.length === 0 ? (
              <ModuleEmptyState {...moduleEmptyStateCopy("mcp")} />
            ) : (
              groups.map((group) => (
                <ResourceGroup key={group.title} accordion group={group} selectedId={selectedId} variant="mcp" onSelect={onSelect} />
              ))
            )}
          </AiosContentPanel>
        </Box>
      </Box>
    </AiosModuleFrame>
  );
}
