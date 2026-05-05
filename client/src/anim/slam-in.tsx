import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./use-reduced-motion";
import { flashScreen, type FlashColor } from "./screen-flash";

interface Props {
  children: ReactNode;
  className?: string;
  flash?: FlashColor | null;
  shake?: boolean;
  delay?: number;
  scaleFrom?: number;
  durationIn?: number;
  animKey?: string | number;
}

// Slammed-in title element. Drops from offscreen at huge scale, lands with a
// brief overshoot + screen flash + screen shake — the canonical Jackbox-y
// big-text entrance.
export function SlamIn({
  children,
  className = "",
  flash = "white",
  shake = true,
  delay = 0,
  scaleFrom = 3.2,
  durationIn = 0.55,
  animKey,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { clearProps: "all" });
      return;
    }
    const tl = gsap.timeline({ delay });
    tl.fromTo(
      el,
      { scale: scaleFrom, opacity: 0, rotate: -2, y: -40 },
      {
        scale: 1.0,
        opacity: 1,
        rotate: 0,
        y: 0,
        duration: durationIn,
        ease: "power4.out",
        onComplete: () => {
          if (flash) flashScreen(flash, 0.6, 0.6);
          if (shake) {
            document.body.classList.remove("animate-screen-shake");
            void document.body.offsetWidth;
            document.body.classList.add("animate-screen-shake");
            setTimeout(() => document.body.classList.remove("animate-screen-shake"), 580);
          }
        },
      },
    )
      .to(el, { scale: 1.08, duration: 0.12, ease: "power2.out" })
      .to(el, { scale: 1.0, duration: 0.35, ease: "elastic.out(1, 0.35)" });
    return () => {
      tl.kill();
    };
  }, [delay, scaleFrom, durationIn, animKey, reduced, flash, shake]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
