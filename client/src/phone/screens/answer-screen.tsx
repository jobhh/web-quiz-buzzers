import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";
import { CountdownBar } from "@client/host/components/countdown-bar";
import { BUZZ_ANSWER_WINDOW_MS, STEAL_ANSWER_WINDOW_MS, FINAL_ANSWER_WINDOW_MS, R2_WINDOW_MS } from "@shared/scoring";

interface Props {
  state: GameState;
  me: Player;
}

const BUTTONS: { choice: 0 | 1 | 2 | 3; bg: string; text: string }[] = [
  { choice: 0, bg: "bg-gradient-to-br from-blue-400 to-blue-600", text: "text-white" },
  { choice: 1, bg: "bg-gradient-to-br from-orange-400 to-orange-600", text: "text-black" },
  { choice: 2, bg: "bg-gradient-to-br from-green-400 to-green-600", text: "text-black" },
  { choice: 3, bg: "bg-gradient-to-br from-yellow-300 to-yellow-500", text: "text-black" },
];

export function AnswerScreen({ state }: Props) {
  const [submitted, setSubmitted] = useState<number | null>(null);
  const q = state.currentQuestion;

  useEffect(() => {
    setSubmitted(null);
  }, [state.phase, state.questionIndex]);

  const answerCount = q?.answers.length ?? 4;

  const onTap = (choice: 0 | 1 | 2 | 3) => {
    if (submitted !== null) return;
    if (state.wrongAnswers?.includes(choice)) return;
    setSubmitted(choice);
    if (navigator.vibrate) navigator.vibrate(40);
    gameSession.send({ type: "ANSWER", payload: { choice } });
  };

  return (
    <div className="phone-root flex flex-col bg-black">
      <header className="px-4 pt-8 pb-4">
        {q && (
          <p className="text-xl font-display text-center leading-snug text-neon-cyan mb-2">
            {q.text}
          </p>
        )}
        <p className="text-xs uppercase tracking-[0.4em] text-cyan-400 font-display text-center">Pick an answer</p>
      </header>
      <div className="grid gap-2 px-2 h-[50vh] grid-cols-2 grid-rows-2">
        {BUTTONS.slice(0, answerCount).map(({ choice, bg, text }, idx) => {
          const label = q?.answers[choice] ?? letterFor(choice);
          const isWrong = state.wrongAnswers?.includes(choice) ?? false;
          const inactive = (submitted !== null && submitted !== choice) || isWrong;
          const isMe = submitted === choice;
          return (
            <motion.button
              key={choice}
              type="button"
              initial={{ scale: 0, rotate: -10, opacity: 0 }}
              animate={{
                scale: inactive ? 0.92 : 1,
                rotate: 0,
                opacity: inactive ? 0.25 : 1,
                filter: inactive ? "saturate(0.4) blur(1px)" : "none",
              }}
              transition={{
                delay: 0.04 * idx,
                type: "spring",
                stiffness: 220,
                damping: 18,
              }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onTap(choice)}
              className={`relative ${bg} ${text} text-xl font-display px-2 overflow-hidden ${
                isMe ? "ring-4 ring-white ring-offset-2 ring-offset-black" : ""
              }`}
            >
              {isMe && (
                <motion.span
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full pointer-events-none"
                />
              )}
              <span className="block text-3xl font-black opacity-80 drop-shadow">
                {letterFor(choice)}
              </span>
              <span className="block text-base font-bold leading-tight break-words">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
      {state.buzzWindowEndsAt && (
        <div className="px-4 py-2">
          <CountdownBar
            endsAt={state.buzzWindowEndsAt}
            totalMs={
              state.currentRound === 4 ? FINAL_ANSWER_WINDOW_MS
              : state.currentRound === 2 ? R2_WINDOW_MS
              : state.lockedOutPlayerIds.length > 0 ? STEAL_ANSWER_WINDOW_MS
              : BUZZ_ANSWER_WINDOW_MS
            }
            paused={state.paused}
          />
        </div>
      )}
      {submitted !== null && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="px-4 py-3 text-center text-base text-neon-cyan font-display tracking-[0.3em] uppercase border-t-2 border-neon-cyan/30"
        >
          ✓ Locked: {letterFor(submitted as 0 | 1 | 2 | 3)}
        </motion.div>
      )}
    </div>
  );
}

function letterFor(choice: 0 | 1 | 2 | 3): string {
  return ["A", "B", "C", "D"][choice];
}
