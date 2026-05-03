import type { ReactNode } from "react";

interface Props {
  color?: "pink" | "cyan" | "gold";
  className?: string;
  children: ReactNode;
}

const COLORS: Record<NonNullable<Props["color"]>, string> = {
  pink: "border-neon-pink shadow-pink-500/30",
  cyan: "border-neon-cyan shadow-cyan-500/30",
  gold: "border-neon-gold shadow-yellow-500/30",
};

export function GlowCard({ color = "cyan", className = "", children }: Props) {
  return (
    <div
      className={`border-2 ${COLORS[color]} bg-neon-dark/60 backdrop-blur-sm rounded-lg shadow-lg p-4 ${className}`}
    >
      {children}
    </div>
  );
}
