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

export function useModuleTransition(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      gsap.fromTo(
        scope.current,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" }
      );
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useCardEntrance(scope: RefObject<HTMLElement>, dependency: unknown, selector = "[data-motion='card']"): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      gsap.fromTo(
        selector,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out", stagger: 0.025 }
      );
    },
    { dependencies: [dependency, reduced, selector], scope }
  );
}

export function useDetailSwitch(scope: RefObject<HTMLElement>, dependency: unknown): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current) return;
      gsap.fromTo(
        scope.current,
        { autoAlpha: 0, x: 10 },
        { autoAlpha: 1, x: 0, duration: 0.22, ease: "power2.out" }
      );
    },
    { dependencies: [dependency, reduced], scope }
  );
}

export function useCopyFeedback(scope: RefObject<HTMLElement>, active: boolean): void {
  const reduced = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reduced || !scope.current || !active) return;
      gsap.fromTo(scope.current, { scale: 0.98 }, { scale: 1, duration: 0.22, ease: "back.out(2)" });
    },
    { dependencies: [active, reduced], scope }
  );
}
