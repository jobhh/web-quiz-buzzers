import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { PlayerAvatar } from "../components/player-avatar";
import { CountdownBar } from "../components/countdown-bar";
import { BUZZ_ANSWER_WINDOW_MS, STEAL_ANSWER_WINDOW_MS, FINAL_ANSWER_WINDOW_MS } from "@shared/scoring";

interface Props {
  state: GameState;
}

export function AnswerLockScreen({ state }: Props) {
  const isFinal = state.currentRound === 4;
  if (isFinal) return <FinalAnswerLock state={state} />;

  const buzzer = state.players.find((p) => p.id === state.buzzedPlayerId);
  if (!buzzer) {
    // Buzzer left mid-question — show a friendly stuck-state so the host
    // knows to advance via the NEXT button.
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-center px-6">
        <div>
          <h1 className="text-3xl font-black text-pink-400 mb-2">Buzzer left</h1>
          <p className="text-cyan-300 opacity-80">
            Tap <span className="font-bold">Next</span> to skip this question.
          </p>
        </div>
      </div>
    );
  }
  const isSteal = state.lockedOutPlayerIds.length > 0;
  const totalMs = isSteal ? STEAL_ANSWER_WINDOW_MS : BUZZ_ANSWER_WINDOW_MS;

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs uppercase tracking-widest opacity-70 mb-2">
        {isSteal ? "Steal answer" : "First buzz"}
      </p>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "backOut" }}
      >
        <PlayerAvatar player={buzzer} size="lg" highlight />
      </motion.div>
      <h1 className="mt-4 text-6xl font-black tracking-wider text-pink-400">{buzzer.name}</h1>
      <p className="mt-2 text-cyan-300 uppercase tracking-widest text-sm">Pick your answer</p>
      {state.buzzWindowEndsAt && (
        <div className="mt-8 w-96">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={totalMs} />
        </div>
      )}
    </div>
  );
}

function FinalAnswerLock({ state }: { state: GameState }) {
  const answered = Object.keys(state.speedRoundAnswers ?? {}).length;
  const total = state.players.length;
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <p className="text-xs uppercase tracking-widest opacity-70 mb-3">Final question — answer!</p>
      <h1 className="text-5xl md:text-6xl font-black text-pink-400 max-w-3xl">
        {state.currentQuestion?.text}
      </h1>
      <p className="mt-6 text-2xl text-cyan-300">
        {answered} / {total} answered
      </p>
      {state.buzzWindowEndsAt && (
        <div className="mt-6 w-96">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={FINAL_ANSWER_WINDOW_MS} />
        </div>
      )}
    </div>
  );
}
