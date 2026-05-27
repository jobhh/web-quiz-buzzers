import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";

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

  const onTap = (choice: 0 | 1 | 2 | 3) => {
    if (submitted !== null) return;
    setSubmitted(choice);
    if (navigator.vibrate) navigator.vibrate(40);
    gameSession.send({ type: "ANSWER", payload: { choice } });
  };

  return (
    <div className="phone-root flex flex-col bg-black">
      <header className="px-4 py-2 text-xs uppercase tracking-[0.4em] text-neon-cyan font-display">
        Pick an answer
      </header>
      <div className="grid grid-cols-2 grid-rows-2 gap-1 flex-1">
        {BUTTONS.map(({ choice, bg, text }, idx) => {
          const label = q?.answers[choice] ?? letterFor(choice);
          const inactive = submitted !== null && submitted !== choice;
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
              className={`relative ${bg} ${text} text-2xl font-display px-3 overflow-hidden ${
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
              <span className="block text-4xl font-black opacity-80 drop-shadow">
                {letterFor(choice)}
              </span>
              <span className="block mt-2 text-base font-bold leading-tight break-words">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
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
