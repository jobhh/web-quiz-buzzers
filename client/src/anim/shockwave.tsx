import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./use-reduced-motion";

interface Props {
  active: boolean;
  color?: string;
  className?: string;
  size?: number;
  rings?: number;
}

// Expanding pulse ring(s). Triggers on the rising edge of `active`.
// Use as an absolute child of a positioned container; rings expand outward
// from the wrapper's center.
export function Shockwave({
  active,
  color = "#ff006e",
  className = "",
  size = 200,
  rings = 3,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Start at the opposite so a `true` initial value still triggers on mount.
  const lastRef = useRef(!active);
  const reduced = useReducedMotion();

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    if (!active || lastRef.current === active) {
      lastRef.current = active;
      return;
    }
    lastRef.current = active;
    if (reduced) return;
    const items =
      wrapRef.current.querySelectorAll<HTMLDivElement>(".shockwave-ring");
    items.forEach((ring, i) => {
      gsap.fromTo(
        ring,
        { scale: 0.4, opacity: 0.85 },
        {
          scale: 3.4,
          opacity: 0,
          duration: 1.1,
          delay: i * 0.18,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    });
  }, [active, reduced]);

  return (
    <div
      ref={wrapRef}
      className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}
      style={{ width: size, height: size }}
    >
      {Array.from({ length: rings }).map((_, i) => (
        <div
          key={i}
          className="shockwave-ring absolute inset-0 rounded-full"
          style={{
            border: `4px solid ${color}`,
            boxShadow: `0 0 24px ${color}`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
