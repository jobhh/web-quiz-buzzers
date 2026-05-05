import { useEffect, useState } from "react";

interface Props {
  endsAt: number;
  totalMs: number;
  className?: string;
}

// Server-authoritative countdown. We compute remaining locally but never
// trust the client clock for game decisions — the bar is purely visual.
export function CountdownBar({ endsAt, totalMs, className = "" }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, endsAt - now);
  const ratio = Math.max(0, Math.min(1, remaining / totalMs));
  const danger = ratio < 0.25;
  return (
    <div
      className={`relative w-full h-3 bg-black/70 rounded overflow-hidden border border-cyan-900/80 ${className}`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${
          danger
            ? "bg-gradient-to-r from-red-600 to-red-400 animate-pulse"
            : ratio < 0.5
            ? "bg-gradient-to-r from-yellow-500 to-yellow-300"
            : "bg-gradient-to-r from-cyan-500 to-cyan-300"
        }`}
        style={{
          width: `${ratio * 100}%`,
          transition: "width 0.12s linear",
          boxShadow: danger
            ? "0 0 18px rgba(255,42,74,0.7)"
            : "0 0 12px rgba(0,245,255,0.5)",
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,transparent_50%,rgba(0,0,0,0.3)_100%)]" />
    </div>
  );
}
