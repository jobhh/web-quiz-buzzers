import { useEffect, useState } from "react";

interface Props {
  endsAt: number; // epoch ms
  totalMs: number; // initial duration of this window
  className?: string;
}

// Server-authoritative countdown. We compute remaining locally but never
// trust the client clock for game decisions — the bar is purely visual.
export function CountdownBar({ endsAt, totalMs, className = "" }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, endsAt - now);
  const ratio = Math.max(0, Math.min(1, remaining / totalMs));
  return (
    <div className={`w-full h-2 bg-gray-800 rounded overflow-hidden ${className}`}>
      <div
        className={`h-full ${
          ratio < 0.25 ? "bg-red-500" : ratio < 0.5 ? "bg-yellow-400" : "bg-cyan-400"
        }`}
        style={{ width: `${ratio * 100}%`, transition: "width 0.1s linear" }}
      />
    </div>
  );
}
