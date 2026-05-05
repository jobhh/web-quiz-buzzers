import { AnimatePresence, motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { LobbyScreen } from "./screens/lobby-screen";
import { RoundIntroScreen } from "./screens/round-intro-screen";
import { BuzzInScreen } from "./screens/buzz-in-screen";
import { AnswerLockScreen } from "./screens/answer-lock-screen";
import { RevealScreen } from "./screens/reveal-screen";
import { RoundScoreboardScreen } from "./screens/round-scoreboard-screen";
import { FinalWagerScreen } from "./screens/final-wager-screen";
import { WinnerScreen } from "./screens/winner-screen";

interface ServerInfo {
  lanIps: string[];
  packs: { id: string; name: string; description: string; questionCount: number }[];
}

interface Props {
  state: GameState;
  serverInfo: ServerInfo | null;
}

// Variants tuned for screen-router phase swaps. Different phases get different
// entrances so the rhythm of the game has more shape.
const PHASE_VARIANTS: Record<string, { initial: any; animate: any; exit: any; transition: any }> = {
  ROUND_INTRO: {
    initial: { opacity: 0, scale: 1.2 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
  BUZZ_OPEN: {
    initial: { opacity: 0, x: 60 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -60 },
    transition: { duration: 0.35, ease: "easeOut" },
  },
  ANSWER_LOCK: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.92 },
    transition: { duration: 0.3, ease: [0.34, 1.56, 0.64, 1] },
  },
  REVEAL: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -24 },
    transition: { duration: 0.35, ease: "easeOut" },
  },
  SCOREBOARD: {
    initial: { opacity: 0, y: 60, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -30, scale: 0.95 },
    transition: { duration: 0.5, ease: [0.16, 1.4, 0.3, 1] },
  },
  FINAL_WAGER: {
    initial: { opacity: 0, scale: 1.4, filter: "blur(12px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
  WINNER: {
    initial: { opacity: 0, scale: 0.8, rotate: -3 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.55, ease: [0.16, 1.4, 0.3, 1] },
  },
};

const DEFAULT_VARIANT = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.25 },
};

export function ScreenRouter({ state, serverInfo }: Props) {
  if (state.phase === "LOBBY") return <LobbyScreen state={state} serverInfo={serverInfo} />;

  const key = `${state.phase}:${state.currentRound}:${state.questionIndex}`;
  const v = PHASE_VARIANTS[state.phase] ?? DEFAULT_VARIANT;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={v.initial}
        animate={v.animate}
        exit={v.exit}
        transition={v.transition}
        className="contents"
      >
        {renderScreen(state)}
      </motion.div>
    </AnimatePresence>
  );
}

function renderScreen(state: GameState) {
  switch (state.phase) {
    case "ROUND_INTRO":
      return <RoundIntroScreen state={state} />;
    case "BUZZ_OPEN":
      return <BuzzInScreen state={state} />;
    case "ANSWER_LOCK":
      return <AnswerLockScreen state={state} />;
    case "REVEAL":
      return <RevealScreen state={state} />;
    case "SCOREBOARD":
      return <RoundScoreboardScreen state={state} />;
    case "FINAL_WAGER":
      return <FinalWagerScreen state={state} />;
    case "WINNER":
      return <WinnerScreen state={state} />;
    default:
      return null;
  }
}
