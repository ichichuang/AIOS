import { useEffect, useState, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { designTokens } from "../theme/designTokens";

gsap.registerPlugin(useGSAP);

const hoverSurfaceSelector = [
  "[data-aios-hover-card]",
  "[data-aios-hover-surface]",
  ".rail-item",
  ".resource-scope-tab",
  ".aios-segmented-button",
  ".aios-section-rail-item",
  ".aios-action-button",
  ".scan-mode-card",
  ".scan-source-card",
  ".scan-control-card",
  ".scan-progress-card",
  ".scan-empty-state"
].join(", ");
const selectedSurfaceSelector = "[data-aios-selected-surface='true'], .selected";
const listRowSelector = "[data-aios-list-row], .compact-skill-row-inner, .resource-card, .timeline-row";
const emptyStateSelector = "[data-aios-empty-state], .empty-state, .scan-empty-state";

export const aiosMotionTokens = {
  hover: {
    duration: designTokens.motion.durationHover,
    exitDuration: designTokens.motion.durationHoverExit,
    ease: designTokens.motion.easeEmphasis,
    scale: 1.012,
    y: -2
  },
  selected: {
    duration: designTokens.motion.durationSelected,
    ease: designTokens.motion.easeEmphasis,
    scale: 1.01,
    y: -1
  },
  reveal: {
    duration: designTokens.motion.durationReveal,
    ease: designTokens.motion.easeStandard,
    stagger: 0.024,
    y: 8
  },
  panel: {
    duration: designTokens.motion.durationPanel,
    ease: designTokens.motion.easeStandard,
    y: 6
  },
  press: {
    duration: designTokens.motion.durationPress,
    ease: designTokens.motion.easeStandard,
    scale: 0.992,
    y: 1
  }
} as const;

interface SmoothHoverSurfaceMotionOptions {
  limit?: number;
  scale?: number;
  selector?: string;
  y?: number;
}

interface IndicatorSelectors {
  activeSelector: string;
  indicatorSelector: string;
  trackSelector: string;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return reduced;
}

export function useModuleSwapMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const header = scope.current.querySelector<HTMLElement>(".module-header");
      const rows = gsap.utils.toArray<HTMLElement>("[data-motion='resource-card']", scope.current).slice(0, 8);
      const targets = [header, ...rows].filter((target): target is HTMLElement => Boolean(target));
      if (!targets.length) return;

      setWillChange(targets, "opacity, transform");
      const timeline = gsap.timeline({
        defaults: {
          duration: aiosMotionTokens.panel.duration,
          ease: aiosMotionTokens.panel.ease,
          force3D: true,
          overwrite: "auto"
        },
        onComplete: () => clearWillChange(targets)
      });
      if (header) timeline.fromTo(header, { autoAlpha: 0, y: aiosMotionTokens.panel.y }, { autoAlpha: 1, y: 0 }, 0);
      if (rows.length) timeline.fromTo(rows, { autoAlpha: 0, y: aiosMotionTokens.reveal.y }, { autoAlpha: 1, stagger: aiosMotionTokens.reveal.stagger, y: 0 }, 0.04);
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useCardRevealMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-motion='resource-card']", scope.current).slice(0, 12);
      if (!cards.length) return;

      setWillChange(cards, "opacity, transform");
      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: aiosMotionTokens.reveal.y, force3D: true },
        {
          autoAlpha: 1,
          duration: aiosMotionTokens.reveal.duration,
          ease: aiosMotionTokens.reveal.ease,
          force3D: true,
          onComplete: () => clearWillChange(cards),
          overwrite: "auto",
          stagger: aiosMotionTokens.reveal.stagger,
          y: 0
        }
      );
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useVisibleCardRevealMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useCardRevealMotion(scope, dependency);
}

export function useSelectedRowEmphasisMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useSoftSelectedSurfaceMotion(scope, dependency, ".selected");
}

export function useTabPanelSwapMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  usePanelEnterMotion(scope, dependency, ".aios-tab-panel-active");
}

export function useContentPanelSwapMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  usePanelEnterMotion(scope, dependency, "[data-aios-content-panel='active']");
}

export function useSelectedCardEmphasisMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useSoftSelectedSurfaceMotion(scope, dependency);
}

export function useSelectedSurfaceEmphasisMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useSoftSelectedSurfaceMotion(scope, dependency);
}

export function useSoftSelectedSurfaceMotion(scope: RefObject<HTMLElement>, dependency: unknown, selector = selectedSurfaceSelector): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (!scope.current || !dependency) return;
      const selected = gsap.utils.toArray<HTMLElement>(selector, scope.current).filter(isInteractiveMotionTarget).slice(0, 12);
      if (!selected.length) return;

      if (reduced) {
        gsap.set(selected, { clearProps: "transform" });
        return;
      }

      setTransformOrigin(selected);
      setWillChange(selected, "transform");
      gsap.fromTo(
        selected,
        { scale: aiosMotionTokens.selected.scale, y: aiosMotionTokens.selected.y, force3D: true },
        {
          duration: aiosMotionTokens.selected.duration,
          ease: aiosMotionTokens.selected.ease,
          force3D: true,
          onComplete: () => clearWillChange(selected),
          overwrite: "auto",
          scale: 1,
          stagger: 0.018,
          y: 0
        }
      );
    },
    { dependencies: [dependency, reduced, selector], scope }
  );
}

export function useHoverCardLiftMotion(scope: RefObject<HTMLElement>, dependency?: unknown): void {
  useSmoothHoverSurfaceMotion(scope, dependency);
}

export function useSmoothHoverSurfaceMotion(scope: RefObject<HTMLElement>, dependency?: unknown, options: SmoothHoverSurfaceMotionOptions = {}): void {
  const reduced = usePrefersReducedMotion();
  const selector = options.selector ?? hoverSurfaceSelector;
  const limit = options.limit ?? 80;
  const scale = options.scale ?? aiosMotionTokens.hover.scale;
  const y = options.y ?? aiosMotionTokens.hover.y;

  useGSAP(
    (_context, contextSafe) => {
      if (!scope.current) return;
      if (!contextSafe) return;
      const surfaces = gsap.utils.toArray<HTMLElement>(selector, scope.current).filter(isInteractiveMotionTarget).slice(0, limit);
      if (!surfaces.length) return;

      if (reduced) {
        gsap.set(surfaces, { clearProps: "transform" });
        return;
      }

      const handleEnter = contextSafe((event: Event) => {
        const target = getCurrentMotionTarget(event);
        if (!target) return;
        target.style.transformOrigin = "center center";
        target.style.willChange = "transform";
        gsap.to(target, {
          duration: aiosMotionTokens.hover.duration,
          ease: aiosMotionTokens.hover.ease,
          force3D: true,
          onComplete: () => (target.style.willChange = ""),
          overwrite: "auto",
          scale,
          transformOrigin: "center center",
          y
        });
      });
      const handleLeave = contextSafe((event: Event) => {
        const target = getCurrentMotionTarget(event);
        if (!target) return;
        target.style.willChange = "transform";
        gsap.to(target, {
          duration: aiosMotionTokens.hover.exitDuration,
          ease: aiosMotionTokens.hover.ease,
          force3D: true,
          onComplete: () => {
            target.style.willChange = "";
            gsap.set(target, { clearProps: "transform" });
          },
          overwrite: "auto",
          scale: 1,
          transformOrigin: "center center",
          y: 0
        });
      });

      surfaces.forEach((surface) => {
        surface.addEventListener("pointerenter", handleEnter);
        surface.addEventListener("pointerleave", handleLeave);
        surface.addEventListener("focusin", handleEnter);
        surface.addEventListener("focusout", handleLeave);
      });

      return () => {
        surfaces.forEach((surface) => {
          surface.removeEventListener("pointerenter", handleEnter);
          surface.removeEventListener("pointerleave", handleLeave);
          surface.removeEventListener("focusin", handleEnter);
          surface.removeEventListener("focusout", handleLeave);
          gsap.killTweensOf(surface);
          surface.style.willChange = "";
        });
      };
    },
    { dependencies: [dependency, reduced, selector, limit, scale, y], scope }
  );
}

export function useEmptyStateRevealMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const emptyState = scope.current.querySelector<HTMLElement>(emptyStateSelector);
      if (!emptyState) return;
      emptyState.style.willChange = "opacity, transform";
      gsap.fromTo(
        emptyState,
        { autoAlpha: 0, y: aiosMotionTokens.panel.y, force3D: true },
        {
          autoAlpha: 1,
          duration: aiosMotionTokens.panel.duration,
          ease: aiosMotionTokens.panel.ease,
          force3D: true,
          onComplete: () => (emptyState.style.willChange = ""),
          overwrite: "auto",
          y: 0
        }
      );
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useListRowStaggerMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const rows = gsap.utils.toArray<HTMLElement>(listRowSelector, scope.current).slice(0, 12);
      if (!rows.length) return;
      setWillChange(rows, "opacity, transform");
      gsap.fromTo(
        rows,
        { autoAlpha: 0, y: 6, force3D: true },
        {
          autoAlpha: 1,
          duration: aiosMotionTokens.panel.duration,
          ease: aiosMotionTokens.panel.ease,
          force3D: true,
          onComplete: () => clearWillChange(rows),
          overwrite: "auto",
          stagger: 0.02,
          y: 0
        }
      );
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useAccordionRevealMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const details = scope.current.querySelector<HTMLElement>(".MuiAccordionDetails-root");
      if (!details) return;
      details.style.willChange = "opacity, transform";
      gsap.fromTo(
        details,
        { autoAlpha: 0, y: 4, force3D: true },
        {
          autoAlpha: 1,
          duration: aiosMotionTokens.hover.duration,
          ease: aiosMotionTokens.hover.ease,
          force3D: true,
          onComplete: () => (details.style.willChange = ""),
          overwrite: "auto",
          y: 0
        }
      );
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useNavIndicatorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useMeasuredIndicatorMotion(scope, dependency, {
    activeSelector: "[data-nav-active='true']",
    indicatorSelector: "[data-nav-indicator]",
    trackSelector: "[data-nav-track]"
  });
}

export function useSegmentedIndicatorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useSectionSwitcherIndicatorMotion(scope, dependency);
}

export function useSectionSwitcherIndicatorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useMeasuredIndicatorMotion(scope, dependency, {
    activeSelector: "[data-segmented-active='true']",
    indicatorSelector: "[data-segmented-indicator]",
    trackSelector: "[data-segmented-track]"
  });
}

export function useInspectorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  useContextualPanelOpenMotion(scope, dependency);
}

export function useContextualPanelOpenMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  usePanelEnterMotion(scope, dependency);
}

export function usePanelEnterMotion(scope: RefObject<HTMLElement>, dependency: unknown, selector?: string): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const panel = selector ? scope.current.querySelector<HTMLElement>(selector) : scope.current;
      if (!panel) return;
      panel.style.willChange = "opacity, transform";
      gsap.fromTo(
        panel,
        { autoAlpha: 0, force3D: true, y: aiosMotionTokens.panel.y },
        {
          autoAlpha: 1,
          duration: aiosMotionTokens.panel.duration,
          ease: aiosMotionTokens.panel.ease,
          force3D: true,
          onComplete: () => (panel.style.willChange = ""),
          overwrite: "auto",
          y: 0
        }
      );
    },
    { dependencies: [dependency, reduced, selector], scope }
  );
}

export function useCopyFeedbackMotion(scope: RefObject<HTMLElement>): () => void {
  const reduced = usePrefersReducedMotion();
  const { contextSafe } = useGSAP({ scope });

  return contextSafe(() => {
    if (reduced || !scope.current) return;
    scope.current.style.transformOrigin = "center center";
    scope.current.style.willChange = "transform";
    gsap
      .timeline({
        defaults: {
          duration: aiosMotionTokens.press.duration,
          ease: aiosMotionTokens.press.ease,
          force3D: true,
          overwrite: "auto"
        },
        onComplete: () => scope.current && (scope.current.style.willChange = "")
      })
      .fromTo(scope.current, { scale: 0.986 }, { scale: 1 });
  });
}

function useMeasuredIndicatorMotion(scope: RefObject<HTMLElement>, dependency: unknown, selectors: IndicatorSelectors): void {
  const reduced = usePrefersReducedMotion();
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    const update = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const track = scope.current?.querySelector<HTMLElement>(selectors.trackSelector);
    if (!track) return undefined;
    const update = () => setLayoutTick((tick) => tick + 1);
    track.addEventListener("scroll", update, { passive: true });
    return () => track.removeEventListener("scroll", update);
  }, [scope, selectors.trackSelector]);

  useGSAP(
    () => {
      const shell = scope.current;
      if (!shell) return;
      const track = shell.querySelector<HTMLElement>(selectors.trackSelector);
      const indicator = shell.querySelector<HTMLElement>(selectors.indicatorSelector);
      const active = shell.querySelector<HTMLElement>(selectors.activeSelector);
      if (!track || !indicator || !active) return;

      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const x = activeRect.left - trackRect.left + track.scrollLeft;
      const y = activeRect.top - trackRect.top + track.scrollTop;
      indicator.style.width = `${activeRect.width}px`;
      indicator.style.height = `${activeRect.height}px`;

      if (reduced) {
        gsap.set(indicator, { autoAlpha: 1, x, y });
        return;
      }

      indicator.style.willChange = "opacity, transform";
      gsap.to(indicator, {
        autoAlpha: 1,
        duration: aiosMotionTokens.selected.duration,
        ease: aiosMotionTokens.selected.ease,
        force3D: true,
        onComplete: () => (indicator.style.willChange = ""),
        overwrite: "auto",
        x,
        y
      });
    },
    {
      dependencies: [
        dependency,
        layoutTick,
        reduced,
        selectors.activeSelector,
        selectors.indicatorSelector,
        selectors.trackSelector
      ],
      scope
    }
  );
}

function getCurrentMotionTarget(event: Event): HTMLElement | null {
  const target = event.currentTarget;
  return target instanceof HTMLElement && isInteractiveMotionTarget(target) ? target : null;
}

function isInteractiveMotionTarget(target: HTMLElement): boolean {
  return !target.matches("[disabled], [aria-disabled='true'], .Mui-disabled");
}

function setTransformOrigin(targets: HTMLElement[]): void {
  targets.forEach((target) => {
    target.style.transformOrigin = "center center";
  });
}

function setWillChange(targets: HTMLElement[], value: string): void {
  targets.forEach((target) => {
    target.style.willChange = value;
  });
}

function clearWillChange(targets: HTMLElement[]): void {
  targets.forEach((target) => {
    target.style.willChange = "";
  });
}
