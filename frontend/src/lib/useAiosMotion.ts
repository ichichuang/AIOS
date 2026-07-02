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
      scope.current.style.willChange = "opacity, transform";
      gsap
        .timeline({ defaults: { duration: 0.18, ease: "power2.out", overwrite: "auto" } })
        .fromTo(scope.current, { autoAlpha: 0, y: 6, force3D: true }, { autoAlpha: 1, y: 0, force3D: true, onComplete: () => scope.current && (scope.current.style.willChange = "") });
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
      indicator.style.width = `${activeRect.width}px`;
      indicator.style.height = `${activeRect.height}px`;

      if (reduced) {
        gsap.set(indicator, { autoAlpha: 1, x, y });
        return;
      }

      indicator.style.willChange = "opacity, transform";
      gsap.to(indicator, {
        autoAlpha: 1,
        duration: 0.18,
        ease: "power3.out",
        force3D: true,
        onComplete: () => (indicator.style.willChange = ""),
        overwrite: "auto",
        x,
        y
      });
    },
    { dependencies: [dependency, layoutTick, reduced], scope }
  );
}

export function useVisibleCardRevealMotion(scope: RefObject<HTMLElement>, dependency: unknown, selector = "[data-motion='resource-card']"): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      const cards = gsap.utils.toArray<HTMLElement>(selector, scope.current).slice(0, 12);
      if (!cards.length) return;
      cards.forEach((card) => (card.style.willChange = "opacity, transform"));
      gsap
        .timeline({ defaults: { duration: 0.18, ease: "power2.out", overwrite: "auto" } })
        .fromTo(cards, { autoAlpha: 0, y: 6, force3D: true }, { autoAlpha: 1, force3D: true, stagger: 0.012, y: 0, onComplete: () => cards.forEach((card) => (card.style.willChange = "")) });
    },
    { dependencies: [dependency, reduced, selector], scope }
  );
}

export function useInspectorMotion(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      scope.current.style.willChange = "opacity, transform";
      gsap
        .timeline({ defaults: { duration: 0.18, ease: "power2.out", overwrite: "auto" } })
        .fromTo(scope.current, { autoAlpha: 0, x: 8, force3D: true }, { autoAlpha: 1, force3D: true, x: 0, onComplete: () => scope.current && (scope.current.style.willChange = "") });
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useCopyFeedbackMotion(scope: RefObject<HTMLElement>): () => void {
  const reduced = usePrefersReducedMotion();
  const { contextSafe } = useGSAP({ scope });

  return contextSafe(() => {
    if (reduced || !scope.current) return;
    scope.current.style.willChange = "transform";
    gsap
      .timeline({ defaults: { duration: 0.16, ease: "power2.out", overwrite: "auto" } })
      .fromTo(scope.current, { scale: 0.98, force3D: true }, { force3D: true, scale: 1, onComplete: () => scope.current && (scope.current.style.willChange = "") });
  });
}
