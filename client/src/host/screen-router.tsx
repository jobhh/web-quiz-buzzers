import { AnimatePresence, motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { LobbyScreen } from "./screens/lobby-screen";
import { RoundIntroScreen } from "./screens/round-intro-screen";
import { QuestionRevealScreen } from "./screens/question-reveal-screen";
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

// One AnimatePresence wrapper for the whole game so phase transitions
// crossfade. Lobby is a special case (uses its own layout, no transition).
export function ScreenRouter({ state, serverInfo }: Props) {
  if (state.phase === "LOBBY") return <LobbyScreen state={state} serverInfo={serverInfo} />;

  // Key changes per phase + question so REVEAL → REVEAL on next question still triggers transition.
  const key = `${state.phase}:${state.currentRound}:${state.questionIndex}`;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
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
    case "QUESTION_REVEAL":
      return <QuestionRevealScreen state={state} />;
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
