import { useEffect, useState, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

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
      gsap
        .timeline({ defaults: { duration: 0.22, ease: "power2.out", overwrite: "auto" } })
        .fromTo(scope.current, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0 });
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useNavIndicatorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();
  const [layoutTick, setLayoutTick] = useState(0);

  useEffect(() => {
    const update = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const track = scope.current?.querySelector<HTMLElement>("[data-nav-track]");
    if (!track) return undefined;
    const update = () => setLayoutTick((tick) => tick + 1);
    track.addEventListener("scroll", update, { passive: true });
    return () => track.removeEventListener("scroll", update);
  }, [scope]);

  useGSAP(
    () => {
      const shell = scope.current;
      if (!shell) return;
      const track = shell.querySelector<HTMLElement>("[data-nav-track]");
      const indicator = shell.querySelector<HTMLElement>("[data-nav-indicator]");
      const active = shell.querySelector<HTMLElement>("[data-nav-active='true']");
      if (!track || !indicator || !active) return;

      const trackRect = track.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const x = activeRect.left - trackRect.left + track.scrollLeft;
      const y = activeRect.top - trackRect.top + track.scrollTop;
      const width = activeRect.width;
      const height = activeRect.height;

      if (reduced) {
        gsap.set(indicator, { autoAlpha: 1, height, width, x, y });
        return;
      }

      gsap.to(indicator, {
        autoAlpha: 1,
        duration: 0.22,
        ease: "power3.out",
        height,
        overwrite: "auto",
        width,
        x,
        y
      });
    },
    { dependencies: [dependency, layoutTick, reduced], scope }
  );
}

export function useCardRevealMotion(scope: RefObject<HTMLElement>, dependency: unknown, selector = "[data-motion='resource-card']"): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const cards = gsap.utils.toArray<HTMLElement>(selector, scope.current).slice(0, 24);
      if (!cards.length) return;
      gsap
        .timeline({ defaults: { duration: 0.2, ease: "power2.out", overwrite: "auto" } })
        .fromTo(cards, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, stagger: 0.018, y: 0 });
    },
    { dependencies: [dependency, reduced, selector], scope }
  );
}

export function useInspectorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      gsap
        .timeline({ defaults: { duration: 0.22, ease: "power2.out", overwrite: "auto" } })
        .fromTo(scope.current, { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0 });
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useCopyFeedbackMotion(scope: RefObject<HTMLElement>, active: boolean): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current || !active) return;
      gsap
        .timeline({ defaults: { duration: 0.18, ease: "power2.out", overwrite: "auto" } })
        .fromTo(scope.current, { scale: 0.98 }, { scale: 1 });
    },
    { dependencies: [active, reduced], scope }
  );
}
