import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { AnimatedBg, SplitText } from "@client/anim";

interface Props {
  state: GameState;
  message?: string;
}

export function WaitingScreen({ state, message }: Props) {
  const subtitle = message ?? defaultMessage(state);
  return (
    <div className="phone-root relative flex flex-col items-center justify-center px-6 bg-black text-cyan-200 overflow-hidden">
      <AnimatedBg variant="grid" />
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs uppercase opacity-70 tracking-[0.4em] font-display"
      >
        Room {state.roomCode}
      </motion.p>
      <motion.h1
        key={state.phase}
        initial={{ scale: 0.6, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        className="text-3xl md:text-5xl font-display text-neon-pink mt-3 tracking-wide text-center text-glow-pink whitespace-nowrap"
      >
        <SplitText
          text={phaseTitle(state.phase)}
          stagger={0.05}
          duration={0.55}
          ease="back.out(2)"
          animKey={state.phase}
        />
      </motion.h1>
      <motion.p
        key={`sub-${subtitle}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mt-4 text-center opacity-90 max-w-xs"
      >
        {subtitle}
      </motion.p>
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-10 space-y-1.5 text-sm w-full max-w-xs"
      >
        {state.players.map((p, idx) => (
          <motion.li
            key={p.id}
            layout
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 + idx * 0.05 }}
            className="flex items-center gap-2"
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                p.connected ? "bg-neon-green" : "bg-gray-500"
              } ${p.connected ? "animate-pulse" : ""}`}
            />
            <span className="font-display tracking-wider">{p.name}</span>
            <span className="opacity-60 text-xs tabular-nums ml-auto">
              {p.score} pts
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

function phaseTitle(phase: GameState["phase"]): string {
  switch (phase) {
    case "LOBBY":
      return "Waiting for Host";
    case "ROUND_INTRO":
      return "Get Ready";
    case "REVEAL":
      return "Answer";
    case "SCOREBOARD":
      return "Scores";
    case "WINNER":
      return "Game Over";
    case "ANSWER_LOCK":
      return "Locked";
    default:
      return phase;
  }
}

function defaultMessage(state: GameState): string {
  switch (state.phase) {
    case "LOBBY":
      return "The host will start the game soon.";
    case "ROUND_INTRO":
      return `Round ${state.currentRound}!`;
    case "ANSWER_LOCK":
      return "Watch the big screen — someone is answering.";
    case "REVEAL":
      return "Check who got it right.";
    case "SCOREBOARD":
      return "Standings update.";
    case "WINNER":
      return "And the winner is…";
    default:
      return "";
  }
}
