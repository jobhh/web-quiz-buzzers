import { useRef, type ButtonHTMLAttributes } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./use-reduced-motion";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  strength?: number;
  pressScale?: number;
}

// Button that nudges toward the cursor and pops on press. Pure GSAP — no
// re-renders. Falls back to a plain button under reduced motion.
export function MagneticButton({
  strength = 0.35,
  pressScale = 0.92,
  onPointerMove,
  onPointerLeave,
  onPointerDown,
  onPointerUp,
  className = "",
  children,
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();

  return (
    <button
      ref={ref}
      {...rest}
      className={`will-change-transform ${className}`}
      onPointerMove={(e) => {
        onPointerMove?.(e);
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * strength;
        const dy = (e.clientY - (r.top + r.height / 2)) * strength;
        gsap.to(ref.current, { x: dx, y: dy, duration: 0.25, ease: "power3.out" });
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        if (!ref.current) return;
        gsap.to(ref.current, { x: 0, y: 0, scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      }}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (reduced || !ref.current) return;
        gsap.to(ref.current, { scale: pressScale, duration: 0.1, ease: "power2.in" });
      }}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        if (!ref.current) return;
        gsap.to(ref.current, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.35)" });
      }}
    >
      {children}
    </button>
  );
}
