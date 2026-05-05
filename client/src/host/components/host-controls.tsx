import { gameSession } from "@client/state/game-session";
import type { GameState } from "@shared/game-state";
import { MagneticButton } from "@client/anim";

interface Props {
  state: GameState;
}

export function HostControls({ state }: Props) {
  const label = nextLabel(state);
  if (!label) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <MagneticButton
        onClick={() => gameSession.send({ type: "NEXT_QUESTION" })}
        strength={0.35}
        className="relative px-6 py-3 bg-neon-pink hover:bg-pink-400 text-black font-display uppercase tracking-[0.25em] rounded shadow-neon overflow-hidden"
      >
        <span className="relative z-10">{label} →</span>
        <span className="scan-sweep-bar animate-scan-sweep" />
      </MagneticButton>
    </div>
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
      return state.currentRound === 1 || state.currentRound === 3
        ? "Skip Question"
        : null;
    case "REVEAL":
      return "Continue";
    case "SCOREBOARD":
      return state.currentRound === 3 ? "Final Round!" : "Next Round";
    default:
      return null;
  }
}
