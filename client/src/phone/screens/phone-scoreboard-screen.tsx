import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";

interface Props {
  state: GameState;
}

export function PhoneScoreboardScreen({ state }: Props) {
  const players = [...state.players].sort((a, b) => b.score - a.score);
  const top = players[0]?.score ?? 1;

  return (
    <div className="phone-root flex flex-col bg-black text-cyan-100 px-4 pt-10 pb-4 overflow-y-auto">
      <h1 className="text-3xl font-display text-center text-neon-pink tracking-wider mb-1">
        SCOREBOARD
      </h1>
      <p className="text-center text-xs opacity-70 font-display tracking-widest uppercase mb-6">
        After round {state.currentRound}
      </p>
      <ul className="space-y-3">
        {players.map((p, idx) => {
          const ratio = top > 0 ? p.score / top : 0;
          const isTop = idx === 0;
          return (
            <motion.li
              key={p.id}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className={`flex items-center gap-2 ${isTop ? "text-neon-gold" : ""}`}
            >
              <span className="w-5 text-right font-display text-lg">{idx + 1}</span>
              <span className="font-display tracking-wider w-24 truncate">{p.name}</span>
              <div className="flex-1 h-5 bg-cyan-950/80 rounded overflow-hidden border border-cyan-900">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, ratio) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                  className={`h-full ${
                    isTop
                      ? "bg-gradient-to-r from-neon-pink to-neon-gold"
                      : "bg-gradient-to-r from-pink-500 to-yellow-300"
                  }`}
                />
              </div>
              <span className="w-12 text-right font-display tabular-nums text-sm">{p.score}</span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
