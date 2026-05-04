import type { GameState } from "@shared/game-state";

interface Props {
  state: GameState;
  message?: string;
}

export function WaitingScreen({ state, message }: Props) {
  const subtitle = message ?? defaultMessage(state);
  return (
    <div className="phone-root flex flex-col items-center justify-center px-6 bg-black text-cyan-200">
      <p className="text-xs uppercase opacity-60 tracking-widest">Room {state.roomCode}</p>
      <h1 className="text-3xl font-black text-pink-400 mt-2 tracking-wider text-center">
        {phaseTitle(state.phase)}
      </h1>
      <p className="mt-3 text-center opacity-80 max-w-xs">{subtitle}</p>
      <ul className="mt-8 space-y-1 text-sm">
        {state.players.map((p) => (
          <li key={p.id} className="flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                p.connected ? "bg-green-400" : "bg-gray-500"
              }`}
            />
            <span>{p.name}</span>
            <span className="opacity-50 text-xs">{p.score} pts</span>
          </li>
        ))}
      </ul>
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
