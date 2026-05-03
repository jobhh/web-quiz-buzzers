import { gameSession } from "@client/state/game-session";
import type { GameState } from "@shared/game-state";

interface Props {
  state: GameState;
}

// Bottom-right host advance button. Visible on phases where the host can
// manually progress (or has nothing else to do). The button label tracks the
// next phase so the host knows what comes next.
export function HostControls({ state }: Props) {
  const label = nextLabel(state);
  if (!label) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => gameSession.send({ type: "NEXT_QUESTION" })}
        className="px-5 py-3 bg-pink-500 hover:bg-pink-400 text-black font-black uppercase tracking-wider rounded shadow-lg shadow-pink-500/40"
      >
        {label} →
      </button>
    </div>
  );
}

function nextLabel(state: GameState): string | null {
  switch (state.phase) {
    case "ROUND_INTRO":
      return "Show Question";
    case "QUESTION_REVEAL":
      return state.currentRound === 2 ? "Open Speed Round" : "Open Buzzers";
    case "BUZZ_OPEN":
      return state.currentRound === 1 || state.currentRound === 3 ? "Skip Question" : null;
    case "REVEAL":
      return "Continue";
    case "SCOREBOARD":
      return state.currentRound === 3 ? "Final Round!" : "Next Round";
    default:
      return null;
  }
}
