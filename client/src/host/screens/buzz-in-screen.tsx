import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { MediaPlayer } from "../components/media-player";
import { CountdownBar } from "../components/countdown-bar";
import { R2_WINDOW_MS, BUZZ_OPEN_IDLE_MS } from "@shared/scoring";

const COLORS = [
  "bg-yellow-400 text-black",
  "bg-green-500 text-black",
  "bg-orange-500 text-black",
  "bg-blue-500 text-white",
];

interface Props {
  state: GameState;
}

export function BuzzInScreen({ state }: Props) {
  const q = state.currentQuestion;
  if (!q) return null;
  const isSpeed = state.currentRound === 2;
  const isSteal = state.lockedOutPlayerIds.length > 0;
  const totalMs = isSpeed ? R2_WINDOW_MS : BUZZ_OPEN_IDLE_MS;

  return (
    <div className="min-h-screen bg-black text-cyan-100 flex flex-col px-8 py-6">
      <header className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-70">
        <span>Round {state.currentRound} · Q{state.questionIndex + 1}</span>
        <motion.span
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 0.9, repeat: Infinity }}
          className="text-pink-400 text-base font-black"
        >
          {isSpeed ? "ANSWER NOW!" : isSteal ? "STEAL OPEN!" : "BUZZ IN!"}
        </motion.span>
        <span>{q.category}</span>
      </header>
      <h1 className="mt-6 text-4xl md:text-5xl font-black text-center max-w-4xl mx-auto leading-tight">
        {q.text}
      </h1>
      {q.media && (
        <div className="mt-6 flex justify-center">
          <MediaPlayer media={q.media} packId={state.packId} />
        </div>
      )}
      <div className="mt-8 grid grid-cols-2 gap-4">
        {q.answers.map((a, i) => (
          <div
            key={i}
            className={`${COLORS[i]} rounded-lg p-5 flex items-center gap-4 text-2xl font-black`}
          >
            <span className="text-4xl opacity-70">{String.fromCharCode(65 + i)}</span>
            <span className="leading-tight">{a}</span>
          </div>
        ))}
      </div>
      {state.buzzWindowEndsAt && (
        <div className="mt-6 px-12">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={totalMs} />
        </div>
      )}
    </div>
  );
}
