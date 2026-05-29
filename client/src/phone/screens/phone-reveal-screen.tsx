import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";

const COLORS = [
  "bg-blue-400",
  "bg-orange-400",
  "bg-green-400",
  "bg-yellow-300",
];

interface Props {
  state: GameState;
}

export function PhoneRevealScreen({ state }: Props) {
  const q = state.currentQuestion;
  const reveal = state.lastReveal;
  if (!q || !reveal) return null;

  const correctIdx = reveal.correctIndex;

  return (
    <div className="phone-root flex flex-col bg-black text-cyan-100 px-4 pt-10 pb-4 overflow-y-auto">
      <p className="text-lg font-display text-center leading-snug text-neon-cyan mb-4">
        {q.text}
      </p>
      <div className="grid grid-cols-1 gap-1.5 mb-6">
        {q.answers.map((a, i) => {
          const isCorrect = i === correctIdx;
          return (
            <motion.div
              key={i}
              animate={isCorrect ? { scale: [1, 1.05, 1] } : { opacity: 0.3 }}
              transition={{ duration: 0.5 }}
              className={`${COLORS[i]} text-black rounded px-3 py-2 flex items-center gap-2 text-sm font-display ${
                isCorrect ? "ring-2 ring-neon-green shadow-[0_0_20px_rgba(124,252,0,0.5)]" : ""
              }`}
            >
              <span className="text-lg font-black opacity-70">{String.fromCharCode(65 + i)}</span>
              <span className="leading-tight flex-1">{a}</span>
              {isCorrect && <span className="text-xl">✓</span>}
            </motion.div>
          );
        })}
      </div>
      <h2 className="text-xs uppercase tracking-widest opacity-70 font-display mb-2">Scores</h2>
      <ul className="space-y-1.5">
        {state.players.map((p) => {
          const delta = reveal.scoreDeltas[p.id] ?? 0;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded px-2 py-1.5 border text-sm ${
                delta > 0
                  ? "border-neon-green bg-green-950/40"
                  : delta < 0
                  ? "border-red-500/70 bg-red-950/40"
                  : "border-cyan-900/60 bg-cyan-950/40"
              }`}
            >
              <span className="font-display tracking-wider truncate flex-1">{p.name}</span>
              <span className="tabular-nums opacity-80">{p.score}</span>
              {delta !== 0 && (
                <span className={`font-bold ${delta > 0 ? "text-neon-green" : "text-red-400"}`}>
                  {delta > 0 ? "+" : ""}{delta}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
