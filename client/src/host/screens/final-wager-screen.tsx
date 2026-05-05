import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { PlayerAvatar } from "../components/player-avatar";
import { CountdownBar } from "../components/countdown-bar";
import { FINAL_WAGER_WINDOW_MS } from "@shared/scoring";
import { AnimatedBg, CountUp, SlamIn, flashScreen } from "@client/anim";

interface Props {
  state: GameState;
}

export function FinalWagerScreen({ state }: Props) {
  const wagered = Object.keys(state.wagers ?? {}).length;
  const total = state.players.length;

  useEffect(() => {
    flashScreen("gold", 0.55, 0.7);
  }, []);

  return (
    <div className="min-h-screen text-cyan-100 px-8 py-6 flex flex-col items-center relative overflow-hidden">
      <AnimatedBg variant="danger" />

      <SlamIn flash="gold" scaleFrom={3.5}>
        <h1 className="text-7xl md:text-8xl font-display text-neon-gold tracking-wider mt-6 text-glow-gold animate-chromatic-shake">
          FINAL WAGER
        </h1>
      </SlamIn>

      <motion.p
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 opacity-90 text-center max-w-md text-cyan-200"
      >
        Each player chooses how much to wager. After everyone locks in, the
        question reveals.
      </motion.p>

      <motion.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
        className="mt-8 text-3xl font-display"
      >
        <CountUp
          value={wagered}
          className="text-neon-gold text-4xl text-glow-gold"
        />{" "}
        / {total} wagered
      </motion.p>

      {state.buzzWindowEndsAt && (
        <div className="mt-6 w-80">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={FINAL_WAGER_WINDOW_MS} />
        </div>
      )}

      <ul className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
        <AnimatePresence>
          {state.players.map((p, idx) => {
            const w = state.wagers?.[p.id];
            const locked = w != null;
            return (
              <motion.li
                key={p.id}
                layout
                initial={{ y: 30, opacity: 0, scale: 0.85 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{
                  delay: 0.5 + idx * 0.07,
                  type: "spring",
                  stiffness: 240,
                  damping: 18,
                }}
                className={`relative p-3 rounded border-2 flex flex-col items-center gap-2 transition-all overflow-hidden ${
                  locked
                    ? "border-neon-green bg-green-950/40 shadow-[0_0_30px_rgba(124,252,0,0.45)]"
                    : "border-cyan-800 bg-neon-dark/40"
                }`}
              >
                <PlayerAvatar player={p} size="md" />
                <p className="font-display text-sm tracking-wider truncate w-full text-center">
                  {p.name}
                </p>
                <p className="text-xs opacity-70 tabular-nums">
                  Score: {p.score}
                </p>
                <AnimatePresence mode="wait">
                  {locked ? (
                    <motion.p
                      key="locked"
                      initial={{ scale: 0.4, opacity: 0, rotate: -25 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ ease: [0.34, 1.56, 0.64, 1], duration: 0.5 }}
                      className="text-lg font-display text-neon-green text-glow-cyan"
                    >
                      Locked ✓
                    </motion.p>
                  ) : (
                    <motion.p
                      key="thinking"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="text-lg font-display opacity-50"
                    >
                      thinking…
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
