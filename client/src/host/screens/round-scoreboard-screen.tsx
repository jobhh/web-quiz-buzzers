import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { PlayerAvatar } from "../components/player-avatar";
import { AnimatedBg, CountUp, ScanSweep, SlamIn } from "@client/anim";

interface Props {
  state: GameState;
}

export function RoundScoreboardScreen({ state }: Props) {
  const players = [...state.players].sort((a, b) => b.score - a.score);
  const top = players[0]?.score ?? 1;
  return (
    <div className="min-h-screen text-cyan-100 px-8 py-6 flex flex-col relative">
      <AnimatedBg variant="grid" />

      <SlamIn flash="cyan" animKey={state.currentRound}>
        <h1 className="text-6xl md:text-7xl font-display text-center text-neon-pink tracking-wider text-glow-pink">
          SCOREBOARD
        </h1>
      </SlamIn>
      <p className="text-center text-sm opacity-80 mt-2 font-display tracking-widest uppercase">
        After round {state.currentRound}
      </p>

      <ul className="mt-10 space-y-4 max-w-3xl mx-auto w-full">
        {players.map((p, idx) => {
          const ratio = top > 0 ? p.score / top : 0;
          const isTop = idx === 0;
          return (
            <motion.li
              layout
              key={p.id}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                delay: 0.7 + idx * 0.18,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              className={`flex items-center gap-3 rounded p-1 ${
                isTop ? "ring-2 ring-neon-gold shadow-neon-gold animate-bob" : ""
              }`}
            >
              <span
                className={`w-7 text-right font-display ${
                  isTop ? "text-neon-gold text-2xl text-glow-gold" : "text-yellow-300 text-xl"
                }`}
              >
                {idx + 1}
              </span>
              <PlayerAvatar player={p} size="sm" highlight={isTop} />
              <span
                className={`font-display tracking-wider w-32 truncate ${
                  isTop ? "text-neon-gold" : ""
                }`}
              >
                {p.name}
              </span>
              <div className="flex-1 h-7 bg-cyan-950/80 rounded overflow-hidden relative border border-cyan-900">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, ratio) * 100}%` }}
                  transition={{
                    duration: 1.1,
                    delay: 1.0 + idx * 0.15,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={`h-full ${
                    isTop
                      ? "bg-gradient-to-r from-neon-pink via-neon-gold to-yellow-200"
                      : "bg-gradient-to-r from-pink-500 to-yellow-300"
                  } relative overflow-hidden`}
                >
                  <ScanSweep />
                </motion.div>
              </div>
              <span className="w-20 text-right font-display tabular-nums">
                <CountUp
                  value={p.score}
                  duration={1.0}
                  delay={1.0 + idx * 0.12}
                  className={isTop ? "text-neon-gold text-glow-gold text-xl" : ""}
                />
              </span>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
