import assert from "node:assert/strict";
import {
  computeAvailableContentHeight,
  computeAvailableModuleHeight,
  computeAvailableScrollBodyHeight,
  layoutCssVariableNames,
  MIN_SCROLL_BODY_HEIGHT,
  MIN_MODULE_HEIGHT,
  type LayoutMeasurements
} from "./layoutMetrics";

const base: LayoutMeasurements = {
  viewportHeight: 800,
  topBarHeight: 56,
  scopeBarHeight: 48,
  moduleHeaderHeight: 68,
  fixedContentHeight: 126,
  contentPaddingBlock: 36,
  shellPadding: 14,
  shellGap: 14
};

const moduleHeight = computeAvailableModuleHeight(base);
assert.equal(moduleHeight, 800 - 56 - 48 - 2 * 14 - 14);
assert(moduleHeight > 0);
assert(moduleHeight < base.viewportHeight);

const contentHeight = computeAvailableContentHeight(base);
assert.equal(contentHeight, moduleHeight - base.moduleHeaderHeight);
assert(contentHeight > 0);

const scrollBodyHeight = computeAvailableScrollBodyHeight(base);
assert.equal(scrollBodyHeight, contentHeight - base.fixedContentHeight - base.contentPaddingBlock);
assert(scrollBodyHeight >= MIN_SCROLL_BODY_HEIGHT);

const tiny: LayoutMeasurements = { ...base, viewportHeight: 200 };
assert.equal(computeAvailableModuleHeight(tiny), MIN_MODULE_HEIGHT);
assert.equal(computeAvailableContentHeight(tiny), MIN_MODULE_HEIGHT - base.moduleHeaderHeight);
assert.equal(computeAvailableScrollBodyHeight({ ...tiny, fixedContentHeight: 240 }), MIN_SCROLL_BODY_HEIGHT);

assert.deepEqual(layoutCssVariableNames, [
  "--aios-viewport-height",
  "--aios-module-height",
  "--aios-module-content-height",
  "--aios-module-scroll-body-height",
  "--aios-module-fixed-content-height",
  "--aios-topbar-height",
  "--aios-scopebar-height",
  "--aios-module-header-height",
  "--aios-module-content-padding-block"
]);

console.log("layoutMetrics tests passed");
