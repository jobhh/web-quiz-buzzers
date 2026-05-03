import type { ReactNode } from "react";

interface Props {
  color?: "pink" | "cyan" | "gold";
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}

const GLOW: Record<NonNullable<Props["color"]>, string> = {
  pink: "text-glow-pink",
  cyan: "text-glow-cyan",
  gold: "text-glow-gold",
};

export function NeonText({ color = "pink", pulse = false, className = "", children }: Props) {
  return (
    <span className={`${GLOW[color]} ${pulse ? "animate-glow-pulse" : ""} ${className}`}>
      {children}
    </span>
  );
}
