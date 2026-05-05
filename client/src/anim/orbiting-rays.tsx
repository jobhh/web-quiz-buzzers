interface Props {
  className?: string;
  size?: number;
  speed?: "slow" | "fast";
}

// Rotating golden ray fan. Sized via `size` (px). Layer behind a centered
// element to imply triumph (winner reveal).
export function OrbitingRays({ className = "", size = 800, speed = "slow" }: Props) {
  return (
    <div
      className={`pointer-events-none rays-gold-bg rounded-full ${
        speed === "slow" ? "animate-ray-spin-slow" : "animate-ray-spin-fast"
      } ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
