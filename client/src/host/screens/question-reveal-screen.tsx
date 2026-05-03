import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { MediaPlayer } from "../components/media-player";

const COLORS = [
  "bg-yellow-400 text-black", // A
  "bg-green-500 text-black", // B
  "bg-orange-500 text-black", // C
  "bg-blue-500 text-white", // D
];

interface Props {
  state: GameState;
}

export function QuestionRevealScreen({ state }: Props) {
  const q = state.currentQuestion;
  if (!q) return null;
  return (
    <div className="min-h-screen bg-black text-cyan-100 flex flex-col px-8 py-6">
      <header className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-70">
        <span>Round {state.currentRound} · Q{state.questionIndex + 1}</span>
        <span>{q.category}</span>
      </header>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="mt-6 text-4xl md:text-5xl font-black text-center max-w-4xl mx-auto leading-tight"
      >
        {q.text}
      </motion.h1>
      {q.media && (
        <div className="mt-6 flex justify-center">
          <MediaPlayer media={q.media} packId={state.packId} />
        </div>
      )}
      <div className="mt-auto grid grid-cols-2 gap-4 mt-8">
        {q.answers.map((a, i) => (
          <motion.div
            key={i}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08 }}
            className={`${COLORS[i]} rounded-lg p-5 flex items-center gap-4 text-2xl font-black`}
          >
            <span className="text-4xl opacity-70">{String.fromCharCode(65 + i)}</span>
            <span className="leading-tight">{a}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
