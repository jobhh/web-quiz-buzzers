import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./use-reduced-motion";

interface Props {
  value: number;
  className?: string;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
}

// Tweens between previous and next value. Renders the integer floor by
// default; pass `format` for custom formatting (commas, sign, etc.).
export function CountUp({
  value,
  className = "",
  duration = 0.9,
  delay = 0,
  prefix = "",
  suffix = "",
  format,
}: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const fromRef = useRef<number>(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = `${prefix}${format ? format(value) : Math.round(value)}${suffix}`;
      fromRef.current = value;
      return;
    }
    const obj = { v: fromRef.current };
    const tween = gsap.to(obj, {
      v: value,
      duration,
      delay,
      ease: "power2.out",
      onUpdate: () => {
        const n = Math.round(obj.v);
        el.textContent = `${prefix}${format ? format(n) : n}${suffix}`;
      },
    });
    fromRef.current = value;
    return () => {
      tween.kill();
    };
  }, [value, duration, delay, prefix, suffix, format, reduced]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      {format ? format(value) : value}
      {suffix}
    </span>
  );
}
