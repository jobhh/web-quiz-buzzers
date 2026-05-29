import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";
import { CountdownBar } from "@client/host/components/countdown-bar";
import { BUZZ_OPEN_IDLE_MS, R2_WINDOW_MS } from "@shared/scoring";

const ANSWER_COLORS = [
  "bg-blue-500 text-white",
  "bg-orange-500 text-black",
  "bg-green-500 text-black",
  "bg-yellow-400 text-black",
];

interface Props {
  state: GameState;
  me: Player;
}

export function BuzzScreen({ state, me }: Props) {
  const [armed, setArmed] = useState(true);
  const [pressed, setPressed] = useState(false);
  const lockedOut = state.lockedOutPlayerIds.includes(me.id);
  const q = state.currentQuestion;

  useEffect(() => {
    setArmed(true);
    setPressed(false);
  }, [state.phase, state.questionIndex]);

  const onTap = () => {
    if (!armed || lockedOut) return;
    setArmed(false);
    setPressed(true);
    if (navigator.vibrate) navigator.vibrate([60, 30, 90]);
    gameSession.send({ type: "BUZZ" });
  };

  if (lockedOut) {
    return (
      <div className="phone-root flex flex-col bg-gradient-to-br from-gray-900 to-red-950 text-red-300 px-4 pt-10 pb-4 overflow-hidden">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="text-center mb-4"
        >
          <h1 className="text-3xl font-display uppercase tracking-widest text-red-400 animate-chromatic-shake">
            Locked Out
          </h1>
          <p className="mt-2 opacity-80 text-sm">You buzzed wrong — sit this one out.</p>
        </motion.div>
        {q && (
          <div className="flex-1 flex flex-col min-h-0">
            <p className="text-xl font-display text-center leading-snug text-cyan-300 mb-5">
              {q.text}
            </p>
            <div className="grid grid-cols-1 gap-1 min-h-0">
              {q.answers.map((a, i) => {
                const isWrong = state.wrongAnswers?.includes(i) ?? false;
                return (
                  <div
                    key={i}
                    className={`${ANSWER_COLORS[i]} rounded px-3 py-1.5 flex items-center gap-2 text-sm font-display ${isWrong ? "opacity-20 line-through" : "opacity-60"}`}
                  >
                    <span className="text-lg font-black opacity-70">{String.fromCharCode(65 + i)}</span>
                    <span className="leading-tight">{a}</span>
                    {isWrong && <span className="ml-auto text-lg">✗</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="phone-root flex flex-col bg-black text-cyan-100 px-4 pt-[6vh] pb-4 overflow-hidden">
      {/* Question */}
      {q && (
        <div className="flex flex-col min-h-0">
          <p className="text-2xl font-display text-center leading-snug text-neon-cyan mb-5">
            {q.text}
          </p>
          {/* Answers */}
          <div className="grid grid-cols-1 gap-1.5" style={{ height: `${q.answers.length * 7.5}vh` }}>
            {q.answers.map((a, i) => {
              const isWrong = state.wrongAnswers?.includes(i) ?? false;
              return (
                <div
                  key={i}
                  className={`${ANSWER_COLORS[i]} rounded px-3 flex items-center gap-2 text-sm font-display ${isWrong ? "opacity-30 line-through" : ""}`}
                >
                  <span className="text-lg font-black opacity-70">{String.fromCharCode(65 + i)}</span>
                  <span className="leading-tight">{a}</span>
                  {isWrong && <span className="ml-auto text-lg">✗</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Buzz button */}
      <div className="mt-auto flex justify-center pb-6">
        <motion.button
          type="button"
          onClick={onTap}
          animate={armed ? { scale: [1, 1.08, 1] } : {}}
          transition={armed ? { duration: 0.85, repeat: Infinity, ease: "easeInOut" } : {}}
          whileTap={{ scale: 0.9 }}
          className={`w-60 h-60 rounded-full font-display text-4xl uppercase tracking-widest will-change-transform ${
            armed
              ? "bg-gradient-to-br from-pink-500 via-neon-pink to-rose-600 text-black shadow-[0_0_60px_rgba(255,0,110,0.7)]"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {armed ? "BUZZ IN!" : "Buzzed!"}
        </motion.button>
      </div>
      {/* Countdown */}
      {state.buzzWindowEndsAt && (
        <div className="px-4 pb-6">
          <CountdownBar
            endsAt={state.buzzWindowEndsAt}
            totalMs={state.currentRound === 2 ? R2_WINDOW_MS : BUZZ_OPEN_IDLE_MS}
            paused={state.paused}
          />
        </div>
      )}
    </div>
  );
}
