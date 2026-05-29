import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import type { GameState } from "@shared/game-state";
import { MagneticButton } from "@client/anim";
import {
  ROUND_INTRO_AUTO_ADVANCE_MS,
  REVEAL_AUTO_ADVANCE_MS,
  SCOREBOARD_AUTO_ADVANCE_MS,
} from "@shared/scoring";

interface Props {
  state: GameState;
}

function autoAdvanceDuration(state: GameState): number {
  switch (state.phase) {
    case "ROUND_INTRO": return ROUND_INTRO_AUTO_ADVANCE_MS;
    case "REVEAL": return REVEAL_AUTO_ADVANCE_MS;
    case "SCOREBOARD": return SCOREBOARD_AUTO_ADVANCE_MS;
    default: return 0;
  }
}

export function HostControls({ state }: Props) {
  const label = nextLabel(state);
  const showPause = state.phase !== "LOBBY" && state.phase !== "WINNER";
  const showEnd = state.phase !== "LOBBY";
  const totalMs = autoAdvanceDuration(state);
  const [progress, setProgress] = useState(1);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useEffect(() => {
    if (!state.autoAdvanceAt || state.paused || !totalMs) {
      setProgress(1);
      return;
    }
    const tick = () => {
      const remaining = state.autoAdvanceAt! - Date.now();
      setProgress(Math.max(0, Math.min(1, remaining / totalMs)));
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [state.autoAdvanceAt, state.paused, totalMs]);

  return (
    <>
      <AnimatePresence>
        {confirmEnd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="border-2 border-neon-pink rounded-lg p-8 bg-neon-dark/90 text-center max-w-sm shadow-neon"
            >
              <h2 className="text-3xl font-display text-neon-pink tracking-wider mb-4">End Game?</h2>
              <p className="text-cyan-200 mb-6">This will return everyone to the lobby.</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="px-6 py-3 bg-cyan-800 hover:bg-cyan-700 text-cyan-100 font-display uppercase tracking-widest rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmEnd(false); gameSession.send({ type: "RESET_GAME" }); }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-display uppercase tracking-widest rounded shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                >
                  End Game
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        {showEnd && (
          <MagneticButton
            onClick={() => setConfirmEnd(true)}
            strength={0.35}
            className="px-4 py-3 bg-red-900 hover:bg-red-700 text-red-100 font-display uppercase tracking-[0.2em] rounded"
          >
            ✕ End
          </MagneticButton>
        )}
      {showPause && (
        <MagneticButton
          onClick={() => gameSession.send({ type: "TOGGLE_PAUSE" })}
          strength={0.35}
          className={`relative px-4 py-3 font-display uppercase tracking-[0.2em] rounded overflow-hidden ${
            state.paused
              ? "bg-neon-green text-black shadow-[0_0_20px_rgba(124,252,0,0.6)]"
              : "bg-cyan-800 text-cyan-100 hover:bg-cyan-700"
          }`}
        >
          <span className="relative z-10">{state.paused ? "▶ Resume" : "⏸ Pause"}</span>
        </MagneticButton>
      )}
      {label && (
        <MagneticButton
          onClick={() => gameSession.send({ type: "NEXT_QUESTION" })}
          strength={0.35}
          className="relative px-6 py-3 bg-neon-pink hover:bg-pink-400 text-black font-display uppercase tracking-[0.25em] rounded shadow-neon overflow-hidden"
        >
          {totalMs > 0 && !state.paused && (
            <span
              className="absolute inset-0 bg-black/30 origin-right"
              style={{ transform: `scaleX(${1 - progress})` }}
            />
          )}
          <span className="relative z-10">{label} →</span>
        </MagneticButton>
      )}
    </div>
    </>
  );
}

function nextLabel(state: GameState): string | null {
  switch (state.phase) {
    case "ROUND_INTRO":
      return state.currentRound === 2
        ? "Start Speed Round"
        : state.currentRound === 4
        ? "Begin Final"
        : "Show Question";
    case "BUZZ_OPEN":
      return "Skip Question";
    case "FINAL_WAGER":
      return "Skip Wager";
    case "ANSWER_LOCK":
      return "Skip Question";
    case "REVEAL":
      return "Continue";
    case "SCOREBOARD":
      return state.currentRound === 3 ? "Final Round!" : "Next Round";
    default:
      return null;
  }
}
