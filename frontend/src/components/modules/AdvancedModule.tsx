import { Alert, Box, Chip } from "@mui/material";
import { useCallback, useMemo, useRef, useState } from "react";
import { advancedSupportCards, advancedSupportSectionLabels, homeCopy } from "../../lib/productShell";
import { useContentPanelSwapMotion } from "../../lib/useAiosMotion";
import { moduleIcons } from "../shell/moduleConfig";
import { AiosCapabilityLauncherCard, AiosContentPanel, AiosModuleFrame, AiosSection, AiosSectionHeader, AiosSectionRail, AiosUsageCard } from "../ui/AiosUiPrimitives";
import type { AiosModuleProps } from "./moduleUtils";
import { ResourceCorpusIndicator } from "./ResourceCorpusIndicator";

const sectionOrder = ["search", "records", "diagnostics", "compatibility"] as const;
type AdvancedSection = (typeof sectionOrder)[number];

export function AdvancedModule({ resourceCorpus, viewCounts, onViewChange }: AiosModuleProps) {
  const cardsBySection = useCardsBySection();
  const [activeSection, setActiveSection] = useState<AdvancedSection>("search");
  const activeCards = cardsBySection.get(activeSection) ?? [];
  const sectionOptions = useMemo(
    () =>
      sectionOrder.map((section) => ({
        value: section,
        label: advancedSupportSectionLabels[section],
        count: cardsBySection.get(section)?.length ?? 0
      })),
    [cardsBySection]
  );
  const handleSectionChange = useCallback((nextValue: string) => setActiveSection(nextValue as AdvancedSection), []);
  const panelRef = useRef<HTMLDivElement>(null);
  useContentPanelSwapMotion(panelRef, activeSection);

  return (
    <AiosModuleFrame
      className="advanced-module"
      contentClassName="dashboard-scroll"
      view="advanced"
      summary="给需要排查的人查看查找位置、本地记录、开发者诊断和旧入口。"
      count={advancedSupportCards.length}
      motionKey={`advanced:${activeSection}`}
      actions={
        <>
          <ResourceCorpusIndicator state={resourceCorpus} />
          <Chip className="status-chip status-warn" label="高级支持" variant="outlined" size="small" />
        </>
      }
    >
      <Alert className="advanced-support-alert" severity="info" variant="outlined" data-aios-layout-fixed>
        高级页只整理支持工具入口；普通首页、技能和 MCP 页面不显示旧诊断清单。
      </Alert>

      <Box className="aios-two-pane" data-aios-motion-surface>
        <AiosSectionRail ariaLabel="高级支持分类" options={sectionOptions} value={activeSection} onChange={handleSectionChange} />
        <Box className="aios-pane aios-pane-scroll advanced-support-pane" ref={panelRef} data-aios-internal-scroll="true">
          <AiosContentPanel className="advanced-content-panel" active>
            <AiosSection>
              <AiosSectionHeader title={advancedSupportSectionLabels[activeSection]} summary="选择一项进入对应支持视图；返回按钮会带你回到高级页。" />
              <Box className="quick-entry-grid module-launcher">
                {activeCards.map((card) => {
                  const Icon = moduleIcons[card.view];
                  return (
                    <AiosCapabilityLauncherCard
                      actionLabel={`${card.actionLabel} · ${viewCounts[card.view]} 项`}
                      description={card.description}
                      icon={<Icon fontSize="small" />}
                      key={card.view}
                      title={card.title}
                      onClick={() => onViewChange(card.view)}
                    />
                  );
                })}
              </Box>
            </AiosSection>

            <AiosSection>
              <AiosSectionHeader title="隐私和安全提醒" summary="高级信息仍遵守本地只读边界。" />
              <Box className="local-library-grid">
                {homeCopy.safetyReminders.map((reminder) => (
                  <AiosUsageCard key={reminder} title="本地只读" purpose={reminder} icon={null} />
                ))}
              </Box>
            </AiosSection>
          </AiosContentPanel>
        </Box>
      </Box>
    </AiosModuleFrame>
  );
}

function useCardsBySection() {
  return new Map(
    sectionOrder.map((section) => [section, advancedSupportCards.filter((card) => card.section === section)])
  );
}
