import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { useConfetti } from "@client/lib/use-confetti";
import { useScreenShake } from "@client/lib/use-screen-shake";
import { PlayerAvatar } from "../components/player-avatar";
import { ScoreDeltaPopup } from "../components/score-delta-popup";
import { AnimatedBg, Shockwave, flashScreen } from "@client/anim";

const COLORS = [
  "bg-yellow-400 text-black",
  "bg-green-500 text-black",
  "bg-orange-500 text-black",
  "bg-blue-500 text-white",
];

interface Props {
  state: GameState;
}

export function RevealScreen({ state }: Props) {
  const q = state.currentQuestion;
  const reveal = state.lastReveal;
  const { burst, cannons } = useConfetti();
  const shake = useScreenShake();
  const someoneScored = reveal
    ? Object.values(reveal.scoreDeltas).some((d) => d > 0)
    : false;
  const someoneLost = reveal
    ? Object.values(reveal.scoreDeltas).some((d) => d < 0)
    : false;
  const bigSwing = reveal
    ? Object.values(reveal.scoreDeltas).some((d) => Math.abs(d) >= 200)
    : false;

  useEffect(() => {
    if (someoneScored) {
      bigSwing ? cannons() : burst();
      flashScreen("green", 0.5, 0.55);
    }
    if (someoneLost) {
      shake("normal");
      flashScreen("red", 0.45, 0.5);
    }
  }, [someoneScored, someoneLost, bigSwing, burst, cannons, shake]);

  if (!q || !reveal) return null;
  const correctIdx = reveal.correctIndex;

  return (
    <div className="min-h-screen text-cyan-100 px-8 py-6 flex flex-col relative">
      <AnimatedBg variant={someoneScored ? "spotlight" : "grid"} />

      <h1 className="text-3xl md:text-4xl font-display text-center max-w-4xl mx-auto leading-tight text-glow-cyan">
        {q.text}
      </h1>
      <div className="mt-8 grid grid-cols-2 gap-4">
        {q.answers.map((a, i) => {
          const isCorrect = i === correctIdx;
          return (
            <motion.div
              key={i}
              animate={
                isCorrect
                  ? {
                      scale: [1, 1.18, 1.08],
                      boxShadow: [
                        "0 0 0 rgba(255,0,110,0)",
                        "0 0 80px rgba(255,0,110,0.95)",
                        "0 0 40px rgba(255,0,110,0.7)",
                      ],
                      rotate: [0, -1.2, 0.8, 0],
                    }
                  : { opacity: 0.22, scale: 0.94, filter: "saturate(0.3) blur(1px)" }
              }
              transition={
                isCorrect
                  ? { duration: 0.9, ease: "easeOut" }
                  : { duration: 0.5, delay: 0.15 }
              }
              className={`${COLORS[i]} relative rounded-lg p-5 flex items-center gap-4 text-2xl font-display overflow-hidden`}
            >
              {isCorrect && <Shockwave active color="#ffd700" size={300} rings={3} />}
              <span className="text-5xl opacity-70 font-black">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="leading-tight relative z-10">{a}</span>
              {isCorrect && (
                <motion.span
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, ease: "backOut", delay: 0.3 }}
                  className="ml-auto text-5xl text-glow-gold relative z-10"
                >
                  ✓
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>
      <section className="mt-10">
        <h2 className="text-sm uppercase opacity-80 tracking-widest mb-3 font-display">
          Scores
        </h2>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {state.players.map((p, idx) => {
            const delta = reveal.scoreDeltas[p.id] ?? 0;
            return (
              <motion.li
                key={p.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + idx * 0.06, type: "spring", stiffness: 240, damping: 18 }}
                className={`flex items-center gap-3 rounded p-2 border-2 transition-colors ${
                  delta > 0
                    ? "border-neon-green bg-green-950/40 shadow-[0_0_24px_rgba(124,252,0,0.45)]"
                    : delta < 0
                    ? "border-red-500/70 bg-red-950/40"
                    : "border-cyan-900/60 bg-cyan-950/40"
                }`}
              >
                <PlayerAvatar player={p} size="sm" highlight={delta > 0} />
                <div className="flex-1 min-w-0">
                  <p className="font-display tracking-wider truncate">{p.name}</p>
                  <p className="text-xs opacity-80 tabular-nums">{p.score} pts</p>
                </div>
                <ScoreDeltaPopup delta={delta} />
              </motion.li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
