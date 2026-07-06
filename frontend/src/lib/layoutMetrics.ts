export interface LayoutMeasurements {
  viewportHeight: number;
  topBarHeight: number;
  scopeBarHeight: number;
  moduleHeaderHeight: number;
  fixedContentHeight: number;
  contentPaddingBlock: number;
  shellPadding: number;
  shellGap: number;
}

export const MIN_MODULE_HEIGHT = 320;
export const MIN_SCROLL_BODY_HEIGHT = 120;

export function computeAvailableModuleHeight(m: LayoutMeasurements): number {
  const available = m.viewportHeight - m.topBarHeight - m.scopeBarHeight - 2 * m.shellPadding - m.shellGap;
  return Math.max(MIN_MODULE_HEIGHT, Math.round(available));
}

export function computeAvailableContentHeight(m: LayoutMeasurements): number {
  const moduleHeight = computeAvailableModuleHeight(m);
  return Math.max(0, Math.round(moduleHeight - m.moduleHeaderHeight));
}

export function computeAvailableScrollBodyHeight(m: LayoutMeasurements): number {
  const contentHeight = computeAvailableContentHeight(m);
  const available = contentHeight - m.fixedContentHeight - m.contentPaddingBlock;
  return Math.max(MIN_SCROLL_BODY_HEIGHT, Math.round(available));
}

export const layoutCssVariableNames = [
  "--aios-viewport-height",
  "--aios-module-height",
  "--aios-module-content-height",
  "--aios-module-scroll-body-height",
  "--aios-module-fixed-content-height",
  "--aios-topbar-height",
  "--aios-scopebar-height",
  "--aios-module-header-height",
  "--aios-module-content-padding-block"
] as const;

export type LayoutCssVariableName = (typeof layoutCssVariableNames)[number];
