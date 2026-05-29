import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./use-reduced-motion";

type SplitMode = "chars" | "words";

interface Props {
  text: string;
  className?: string;
  charClassName?: string;
  mode?: SplitMode;
  // gsap.from() vars applied to each child. Stagger handled separately.
  from?: gsap.TweenVars;
  stagger?: number | gsap.StaggerVars;
  duration?: number;
  delay?: number;
  ease?: string;
  // Re-runs the entrance whenever this key changes.
  animKey?: string | number;
}

const DEFAULT_FROM: gsap.TweenVars = { yPercent: 120, opacity: 0, rotate: -8 };

// Splits a string into per-char (or per-word) <span>s and animates them in
// with a GSAP stagger. The text remains selectable + accessible because each
// span keeps its content. Spaces are preserved as zero-width chars when
// splitting by char — visual width is restored via padding.
export function SplitText({
  text,
  className = "",
  charClassName = "",
  mode = "chars",
  from = DEFAULT_FROM,
  stagger = 0.04,
  duration = 0.7,
  delay = 0,
  ease = "back.out(1.8)",
  animKey,
}: Props) {
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>(
      mode === "chars" ? ".anim-char" : ".anim-word",
    );
    if (targets.length === 0) return;
    if (reduced) {
      gsap.set(targets, { clearProps: "all", opacity: 1, y: 0, rotate: 0 });
      return;
    }
    const tween = gsap.fromTo(
      targets,
      from,
      {
        yPercent: 0,
        opacity: 1,
        rotate: 0,
        x: 0,
        scale: 1,
        duration,
        delay,
        ease,
        stagger,
        overwrite: "auto",
      },
    );
    return () => {
      tween.kill();
    };
  }, [text, mode, animKey, reduced, from, stagger, duration, delay, ease]);

  const tokens =
    mode === "chars"
      ? Array.from(text).map((c, i) => (
          <span key={i} className={`anim-char ${charClassName}`}>
            {c === " " ? " " : c}
          </span>
        ))
      : text.split(/(\s+)/).map((w, i) =>
          /^\s+$/.test(w) ? (
            <span key={i}>{w}</span>
          ) : (
            <span key={i} className={`anim-word ${charClassName}`}>
              {w}
            </span>
          ),
        );

  return (
    <span ref={wrapRef} className={className} aria-label={text}>
      {tokens}
    </span>
  );
}
