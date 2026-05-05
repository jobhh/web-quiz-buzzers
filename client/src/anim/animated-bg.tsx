import type { CSSProperties } from "react";

interface Props {
  variant?: "grid" | "rays" | "spotlight" | "danger" | "calm";
  className?: string;
}

// Always-present animated backdrop. Pure CSS animations (gated by the
// `reduce-motion` class on <html>) so it costs essentially nothing.
export function AnimatedBg({ variant = "grid", className = "" }: Props) {
  if (variant === "rays") {
    return (
      <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}>
        <div className="absolute inset-[-25%] rays-gold-bg animate-ray-spin-slow opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-950/40 via-black to-black" />
      </div>
    );
  }
  if (variant === "spotlight") {
    return (
      <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`}>
        <div
          className="absolute inset-0 animate-radial-breathe"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(255,0,110,0.22), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black" />
      </div>
    );
  }
  if (variant === "danger") {
    return (
      <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`}>
        <div
          className="absolute inset-0 animate-radial-breathe"
          style={{
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(255,0,60,0.32), transparent 65%)",
          }}
        />
        <div
          className="absolute inset-0 bg-neon-grid bg-neon-grid animate-grid-pan opacity-40"
          style={{ backgroundSize: "80px 80px" } as CSSProperties}
        />
      </div>
    );
  }
  if (variant === "calm") {
    return (
      <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 0%, rgba(0,245,255,0.12), transparent 70%)",
          }}
        />
      </div>
    );
  }
  // grid
  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 bg-neon-grid animate-grid-pan opacity-50"
        style={{ backgroundSize: "60px 60px" } as CSSProperties}
      />
      <div
        className="absolute inset-0 animate-radial-breathe"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,0,110,0.18), transparent 60%)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
    </div>
  );
}
