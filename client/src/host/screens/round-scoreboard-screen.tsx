import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { PlayerAvatar } from "../components/player-avatar";

interface Props {
  state: GameState;
}

export function RoundScoreboardScreen({ state }: Props) {
  const players = [...state.players].sort((a, b) => b.score - a.score);
  const top = players[0]?.score ?? 1;
  return (
    <div className="min-h-screen bg-black text-cyan-100 px-8 py-6 flex flex-col">
      <h1 className="text-5xl font-black text-center text-pink-400 tracking-wider">
        SCOREBOARD
      </h1>
      <p className="text-center text-sm opacity-70 mt-1">After round {state.currentRound}</p>
      <ul className="mt-10 space-y-4 max-w-3xl mx-auto w-full">
        {players.map((p, idx) => {
          const ratio = top > 0 ? p.score / top : 0;
          return (
            <li key={p.id} className="flex items-center gap-3">
              <span className="w-6 text-right text-yellow-300 font-black">{idx + 1}</span>
              <PlayerAvatar player={p} size="sm" />
              <span className="font-bold w-32 truncate">{p.name}</span>
              <div className="flex-1 h-6 bg-cyan-950 rounded overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, ratio) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-pink-500 to-yellow-300"
                />
              </div>
              <span className="w-16 text-right font-black tabular-nums">{p.score}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
