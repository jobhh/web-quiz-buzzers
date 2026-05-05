import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useReducedMotion } from "./use-reduced-motion";

interface Props {
  children: ReactNode;
  className?: string;
  max?: number;
  scale?: number;
}

// 3D pointer-tilt wrapper. Adds perspective + responds to pointer position
// with a CSS rotate3d transform. Pure GSAP — no re-renders.
export function TiltCard({ children, className = "", max = 14, scale = 1.04 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  return (
    <div
      ref={ref}
      className={`will-change-transform ${className}`}
      style={{ transformStyle: "preserve-3d", perspective: 800 }}
      onPointerMove={(e) => {
        if (reduced || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(ref.current, {
          rotateY: px * max,
          rotateX: -py * max,
          scale,
          duration: 0.25,
          ease: "power3.out",
          transformPerspective: 800,
        });
      }}
      onPointerLeave={() => {
        if (!ref.current) return;
        gsap.to(ref.current, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.7,
          ease: "elastic.out(1, 0.5)",
        });
      }}
    >
      {children}
    </div>
  );
}
