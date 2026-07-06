import { createContext, useCallback, useContext, useEffect, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from "react";
import { designTokens } from "../theme/designTokens";
import {
  computeAvailableContentHeight,
  computeAvailableModuleHeight,
  computeAvailableScrollBodyHeight,
  layoutCssVariableNames,
  type LayoutMeasurements
} from "./layoutMetrics";

export interface AiosLayoutMetrics {
  rootRef: MutableRefObject<HTMLDivElement | null>;
  mainRef: MutableRefObject<HTMLDivElement | null>;
  topBarRef: MutableRefObject<HTMLDivElement | null>;
  scopeBarRef: MutableRefObject<HTMLDivElement | null>;
  moduleHeaderRef: MutableRefObject<HTMLDivElement | null>;
  moduleContentRef: MutableRefObject<HTMLDivElement | null>;
  viewportHeight: number;
  moduleHeight: number;
  contentHeight: number;
  scrollBodyHeight: number;
  requestMeasure: () => void;
}

const AiosLayoutContext = createContext<AiosLayoutMetrics | null>(null);

export function AiosLayoutProvider({ children, value }: { children: ReactNode; value: AiosLayoutMetrics }) {
  return <AiosLayoutContext.Provider value={value}>{children}</AiosLayoutContext.Provider>;
}

export function useAiosLayoutContext(): AiosLayoutMetrics | null {
  return useContext(AiosLayoutContext);
}

export function useAiosLayoutModuleHeaderRef(): RefObject<HTMLDivElement | null> {
  const context = useContext(AiosLayoutContext);
  return context?.moduleHeaderRef ?? { current: null };
}

export function useAiosLayoutModuleContentRef(): MutableRefObject<HTMLDivElement | null> {
  const context = useContext(AiosLayoutContext);
  return context?.moduleContentRef ?? { current: null };
}

export function useAiosLayoutRequestMeasure(): () => void {
  return useContext(AiosLayoutContext)?.requestMeasure ?? (() => undefined);
}

export function useAiosLayoutMetrics(): AiosLayoutMetrics {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const scopeBarRef = useRef<HTMLDivElement | null>(null);
  const moduleHeaderRef = useRef<HTMLDivElement | null>(null);
  const moduleContentRef = useRef<HTMLDivElement | null>(null);
  const requestMeasureRef = useRef<() => void>(() => undefined);

  const [viewportHeight, setViewportHeight] = useState(0);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [scopeBarHeight, setScopeBarHeight] = useState(0);
  const [moduleHeaderHeight, setModuleHeaderHeight] = useState(0);
  const [fixedContentHeight, setFixedContentHeight] = useState(0);
  const [contentPaddingBlock, setContentPaddingBlock] = useState(0);

  const requestMeasure = useCallback(() => {
    requestMeasureRef.current();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const shellPadding = designTokens.shell.viewportPadding;
    const shellGap = designTokens.shell.gap;

    function readNumericStyle(element: HTMLElement | null, property: string): number {
      if (!element) return 0;
      const value = window.getComputedStyle(element).getPropertyValue(property);
      const parsed = parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function update() {
      const root = rootRef.current;
      const main = mainRef.current;
      const topBar = topBarRef.current;
      const scopeBar = scopeBarRef.current;
      const moduleHeader = moduleHeaderRef.current;
      const moduleContent = moduleContentRef.current;

      const nextViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const nextTopBarHeight = topBar?.getBoundingClientRect().height ?? 0;
      const nextScopeBarHeight = scopeBar?.getBoundingClientRect().height ?? 0;
      const nextModuleHeaderHeight = moduleHeader?.getBoundingClientRect().height ?? 0;
      const nextFixedContentHeight = measureFixedContentHeight(moduleContent);
      const nextContentPaddingBlock = measureContentPaddingBlock(moduleContent);
      const nextShellPadding = root ? readNumericStyle(root, "padding-top") || shellPadding : shellPadding;
      const nextShellGap = main ? readNumericStyle(main, "row-gap") || shellGap : shellGap;

      const measurements: LayoutMeasurements = {
        viewportHeight: Math.round(nextViewportHeight),
        topBarHeight: Math.round(nextTopBarHeight),
        scopeBarHeight: Math.round(nextScopeBarHeight),
        moduleHeaderHeight: Math.round(nextModuleHeaderHeight),
        fixedContentHeight: Math.round(nextFixedContentHeight),
        contentPaddingBlock: Math.round(nextContentPaddingBlock),
        shellPadding: Math.round(nextShellPadding),
        shellGap: Math.round(nextShellGap)
      };

      const moduleHeight = computeAvailableModuleHeight(measurements);
      const contentHeight = computeAvailableContentHeight(measurements);
      const scrollBodyHeight = computeAvailableScrollBodyHeight(measurements);

      setViewportHeight(measurements.viewportHeight);
      setTopBarHeight(measurements.topBarHeight);
      setScopeBarHeight(measurements.scopeBarHeight);
      setModuleHeaderHeight(measurements.moduleHeaderHeight);
      setFixedContentHeight(measurements.fixedContentHeight);
      setContentPaddingBlock(measurements.contentPaddingBlock);

      if (root) {
        const style = root.style;
        style.setProperty(layoutCssVariableNames[0], `${measurements.viewportHeight}px`);
        style.setProperty(layoutCssVariableNames[1], `${moduleHeight}px`);
        style.setProperty(layoutCssVariableNames[2], `${contentHeight}px`);
        style.setProperty(layoutCssVariableNames[3], `${scrollBodyHeight}px`);
        style.setProperty(layoutCssVariableNames[4], `${measurements.fixedContentHeight}px`);
        style.setProperty(layoutCssVariableNames[5], `${measurements.topBarHeight}px`);
        style.setProperty(layoutCssVariableNames[6], `${measurements.scopeBarHeight}px`);
        style.setProperty(layoutCssVariableNames[7], `${measurements.moduleHeaderHeight}px`);
        style.setProperty(layoutCssVariableNames[8], `${measurements.contentPaddingBlock}px`);
      }
    }

    let rafId = 0;
    function scheduleUpdate() {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    }

    requestMeasureRef.current = scheduleUpdate;

    const observers: ResizeObserver[] = [];
    function observe(element: HTMLElement | null) {
      if (!element || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(scheduleUpdate);
      observer.observe(element);
      observers.push(observer);
    }

    observe(rootRef.current);
    observe(mainRef.current);
    observe(topBarRef.current);
    observe(scopeBarRef.current);
    observe(moduleHeaderRef.current);
    observe(moduleContentRef.current);

    const mutationTarget = mainRef.current;
    const mutationObserver = typeof MutationObserver === "undefined" || !mutationTarget ? null : new MutationObserver(scheduleUpdate);
    if (mutationObserver && mutationTarget) {
      mutationObserver.observe(mutationTarget, {
        attributes: true,
        childList: true,
        subtree: true
      });
    }

    window.addEventListener("resize", scheduleUpdate);
    window.visualViewport?.addEventListener?.("resize", scheduleUpdate);

    scheduleUpdate();

    return () => {
      window.removeEventListener("resize", scheduleUpdate);
      window.visualViewport?.removeEventListener?.("resize", scheduleUpdate);
      observers.forEach((observer) => observer.disconnect());
      mutationObserver?.disconnect();
      if (rafId) window.cancelAnimationFrame(rafId);
      requestMeasureRef.current = () => undefined;
      const root = rootRef.current;
      if (root) {
        layoutCssVariableNames.forEach((name) => root.style.removeProperty(name));
      }
    };
  }, []);

  const moduleHeight = computeAvailableModuleHeight({
    viewportHeight,
    topBarHeight,
    scopeBarHeight,
    moduleHeaderHeight,
    fixedContentHeight,
    contentPaddingBlock,
    shellPadding: designTokens.shell.viewportPadding,
    shellGap: designTokens.shell.gap
  });
  const contentHeight = computeAvailableContentHeight({
    viewportHeight,
    topBarHeight,
    scopeBarHeight,
    moduleHeaderHeight,
    fixedContentHeight,
    contentPaddingBlock,
    shellPadding: designTokens.shell.viewportPadding,
    shellGap: designTokens.shell.gap
  });
  const scrollBodyHeight = computeAvailableScrollBodyHeight({
    viewportHeight,
    topBarHeight,
    scopeBarHeight,
    moduleHeaderHeight,
    fixedContentHeight,
    contentPaddingBlock,
    shellPadding: designTokens.shell.viewportPadding,
    shellGap: designTokens.shell.gap
  });

  return {
    rootRef,
    mainRef,
    topBarRef,
    scopeBarRef,
    moduleHeaderRef,
    moduleContentRef,
    viewportHeight,
    moduleHeight,
    contentHeight,
    scrollBodyHeight,
    requestMeasure
  };
}

function measureFixedContentHeight(moduleContent: HTMLElement | null): number {
  if (!moduleContent || typeof window === "undefined") return 0;
  const fixedChildren = Array.from(moduleContent.querySelectorAll<HTMLElement>(":scope > [data-aios-layout-fixed], :scope > [data-aios-layout-footer]"));
  const rowGap = readContentGap(moduleContent);
  return fixedChildren.reduce((total, element, index) => {
    const style = window.getComputedStyle(element);
    const marginBlock = parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    const height = element.getBoundingClientRect().height + (Number.isFinite(marginBlock) ? marginBlock : 0);
    return total + height + (index > 0 ? rowGap : 0);
  }, 0);
}

function measureContentPaddingBlock(moduleContent: HTMLElement | null): number {
  if (!moduleContent || typeof window === "undefined") return 0;
  const style = window.getComputedStyle(moduleContent);
  const paddingBlock = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  return Number.isFinite(paddingBlock) ? paddingBlock : 0;
}

function readContentGap(moduleContent: HTMLElement): number {
  const value = window.getComputedStyle(moduleContent).rowGap;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
