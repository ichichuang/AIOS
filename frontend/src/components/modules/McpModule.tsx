import { Alert, Box, Chip, Typography } from "@mui/material";
import { useCallback, useMemo, useRef, useState } from "react";
import { zhCN } from "../../i18n/zh-CN";
import { fallbackMcpToolHintsUnavailableText } from "../../lib/mcpLibrary";
import { useContentPanelSwapMotion } from "../../lib/useAiosMotion";
import { ResourceGroup } from "../resources/ResourceGroup";
import { AiosContentPanel, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosSectionRail, AiosUsageCard } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { getMcpGroups, moduleAriaLabel, moduleEmptyStateCopy } from "./moduleUtils";
import { ModuleEmptyState } from "./ModuleEmptyState";

type McpSection = "services" | "tools" | "attention";

export function McpModule({ mcpLibrary, resources, selectedId, onSelect }: AiosModuleProps) {
  const [activeSection, setActiveSection] = useState<McpSection>("services");
  const panelRef = useRef<HTMLDivElement>(null);
  const useProductLibrary = mcpLibrary.summary !== null;
  const productCounts = mcpLibrary.summary?.counts ?? null;
  const attentionCount = resources.filter((resource) => resource.risk !== "low" || (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available")).length;
  const serviceResources = useMemo(() => resources.filter((resource) => resource.capabilityType === "mcp-server"), [resources]);
  const toolResources = useMemo(() => resources.filter((resource) => resource.capabilityType === "mcp-client"), [resources]);
  const attentionResources = useMemo(() => {
    const candidates = useProductLibrary ? serviceResources : resources;
    return candidates.filter((resource) => resource.risk !== "low" || (resource.status !== "ok" && resource.status !== "active" && resource.status !== "available"));
  }, [resources, serviceResources, useProductLibrary]);
  const serviceCount = productCounts ? productCounts.serviceCount : serviceResources.length || resources.length;
  const toolHintCount = productCounts ? productCounts.toolHintCount : toolResources.length;
  const needsAttentionCount = productCounts ? productCounts.needsAttentionCount : attentionCount;
  const sections = useMemo(
    () => [
      {
        value: "services",
        label: "服务",
        count: serviceCount,
        title: "MCP 服务",
        summary: "本机已配置的服务摘要；这里只展示用途、来源和边界，不启动服务。",
        resources: serviceResources.length > 0 ? serviceResources : resources
      },
      {
        value: "tools",
        label: "工具",
        count: toolHintCount,
        title: "工具能力",
        summary: useProductLibrary ? "只统计已经安全保存的工具名称线索；无法判断时不会启动服务补全。" : "服务暴露的工具线索；AIOS Desktop 只展示配置摘要，不调用工具。",
        resources: toolResources
      },
      {
        value: "attention",
        label: "需关注",
        count: needsAttentionCount,
        title: "需要复核",
        summary: "权限、状态或边界需要人工查看的 MCP 条目。",
        resources: attentionResources
      }
    ],
    [attentionResources, needsAttentionCount, resources, serviceCount, serviceResources, toolHintCount, toolResources, useProductLibrary]
  );
  const active = sections.find((section) => section.value === activeSection) ?? sections[0];
  const sectionResources = active.resources;
  const groups = useMemo(() => getMcpGroups(sectionResources), [sectionResources]);
  const productRowsMismatch = useProductLibrary && active.count > 0 && sectionResources.length === 0 && !mcpLibrary.loading && !mcpLibrary.error;
  const sectionOptions = useMemo(() => sections.map(({ value, label, count }) => ({ value, label, count })), [sections]);
  const handleSectionChange = useCallback((nextValue: string) => setActiveSection(nextValue as McpSection), []);
  useContentPanelSwapMotion(panelRef, activeSection);

  return (
    <AiosModuleFrame
      className="mcp-module"
      contentClassName="mcp-module-scroll"
      view="mcp"
      summary={zhCN.moduleSummaries.mcp}
      count={active.count}
      ariaLabel={moduleAriaLabel("mcp")}
      motionKey={`mcp:${activeSection}:${sectionResources.length}`}
      actions={
        <>
          <Chip label="不启动服务" variant="outlined" size="small" />
          <Chip label="不连接端点" variant="outlined" size="small" />
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
              technicalName={`${serviceCount} 个`}
              title="MCP 服务"
              onClick={() => setActiveSection("services")}
            />
            <AiosUsageCard
              className="mcp-summary-card"
              icon={null}
              purpose="可安全识别的工具名称数量；无法判断时不会启动服务补全。"
              selected={activeSection === "tools"}
              technicalName={`${toolHintCount} 个`}
              title="MCP 工具"
              onClick={() => setActiveSection("tools")}
            />
            <AiosUsageCard
              className="mcp-summary-card"
              icon={null}
              purpose="来源、权限或风险需要再确认的服务。"
              selected={activeSection === "attention"}
              technicalName={`${needsAttentionCount} 个`}
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
            <AiosSectionHeader title={active.title} summary={active.summary} count={active.count} />
            {useProductLibrary && activeSection === "tools" && toolHintCount === 0 && (
              <Alert className="mcp-local-reminder" severity="info" variant="outlined">
                {fallbackMcpToolHintsUnavailableText}
              </Alert>
            )}
            {productRowsMismatch ? (
              <Alert className="product-row-diagnostic" severity="warning" variant="outlined">
                <Typography component="strong">统计显示已有 MCP 项，但当前列表没有可显示行。</Typography>
                <Typography color="text.secondary" variant="body2">
                  请刷新本地记录或重新完成一次查找；AIOS Desktop 不启动服务、不连接端点、不调用工具。
                </Typography>
              </Alert>
            ) : groups.length === 0 ? (
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
