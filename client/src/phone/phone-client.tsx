import { useEffect, useState } from "react";
import { gameSession } from "@client/state/game-session";
import { useGameState } from "@client/state/game-store";
import { getRoomCodeFromUrl } from "@client/router";
import { usePreventZoom } from "./use-prevent-zoom";
import { ConnectionPill } from "./components/connection-pill";
import { JoinScreen } from "./screens/join-screen";
import { WaitingScreen } from "./screens/waiting-screen";
import { BuzzScreen } from "./screens/buzz-screen";
import { AnswerScreen } from "./screens/answer-screen";
import { WagerScreen } from "./screens/wager-screen";
import "./phone-styles.css";

// Root component for the phone player route. Subscribes to game state +
// the local session, and renders the correct subscreen for the current phase.
export function PhoneClient() {
  usePreventZoom();
  const state = useGameState();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gameSession.start();
    const offError = gameSession.onError((e) => setError(`${e.code}: ${e.message}`));
    return offError;
  }, []);

  const stored = gameSession.getStored();
  const me = state && stored ? state.players.find((p) => p.id === stored.playerId) : null;

  let body: React.ReactNode;
  if (!state || !me) {
    body = <JoinScreen initialRoomCode={getRoomCodeFromUrl()} errorMessage={error} />;
  } else {
    body = <PhaseScreen state={state} me={me} />;
  }

  return (
    <>
      <ConnectionPill />
      {body}
    </>
  );
}

function PhaseScreen({ state, me }: { state: ReturnType<typeof useGameState> & object; me: NonNullable<ReturnType<typeof useGameState>>["players"][number] }) {
  const isBuzzer = state.buzzedPlayerId === me.id;
  switch (state.phase) {
    case "LOBBY":
    case "ROUND_INTRO":
    case "REVEAL":
    case "SCOREBOARD":
    case "WINNER":
      return <WaitingScreen state={state} />;
    case "BUZZ_OPEN":
      // R2 (speed round) has no buzz step — players tap an answer directly.
      // R1/R3 use the big-red BUZZ button; the buzzer then sees AnswerScreen
      // when the phase moves to ANSWER_LOCK.
      return state.currentRound === 2 ? (
        <AnswerScreen state={state} me={me} />
      ) : (
        <BuzzScreen state={state} me={me} />
      );
    case "ANSWER_LOCK":
      return isBuzzer ? (
        <AnswerScreen state={state} me={me} />
      ) : (
        <WaitingScreen state={state} message="Locked. Watch the big screen." />
      );
    case "FINAL_WAGER":
      return <WagerScreen state={state} me={me} />;
    default:
      return <WaitingScreen state={state} />;
  }
}
