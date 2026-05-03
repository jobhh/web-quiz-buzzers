import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { useConfetti } from "@client/lib/use-confetti";
import { PlayerAvatar } from "../components/player-avatar";
import { ScoreDeltaPopup } from "../components/score-delta-popup";

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
  const { burst } = useConfetti();
  const someoneScored = reveal
    ? Object.values(reveal.scoreDeltas).some((d) => d > 0)
    : false;

  useEffect(() => {
    if (someoneScored) burst();
  }, [someoneScored, burst]);

  if (!q || !reveal) return null;
  const correctIdx = reveal.correctIndex;

  return (
    <div className="min-h-screen bg-black text-cyan-100 px-8 py-6 flex flex-col">
      <h1 className="text-3xl md:text-4xl font-black text-center max-w-4xl mx-auto leading-tight">
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
                  ? { scale: [1, 1.1, 1.05], boxShadow: "0 0 40px rgba(255,0,110,0.7)" }
                  : { opacity: 0.3 }
              }
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`${COLORS[i]} rounded-lg p-5 flex items-center gap-4 text-2xl font-black`}
            >
              <span className="text-4xl opacity-70">{String.fromCharCode(65 + i)}</span>
              <span className="leading-tight">{a}</span>
              {isCorrect && (
                <span className="ml-auto text-3xl">✓</span>
              )}
            </motion.div>
          );
        })}
      </div>
      <section className="mt-10">
        <h2 className="text-sm uppercase opacity-70 tracking-widest mb-3">Scores</h2>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {state.players.map((p) => {
            const delta = reveal.scoreDeltas[p.id] ?? 0;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 bg-cyan-950/50 rounded p-2"
              >
                <PlayerAvatar player={p} size="sm" highlight={delta > 0} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{p.name}</p>
                  <p className="text-xs opacity-70">{p.score} pts</p>
                </div>
                <ScoreDeltaPopup delta={delta} />
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
