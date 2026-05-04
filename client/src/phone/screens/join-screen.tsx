import { useEffect, useState } from "react";
import { gameSession } from "@client/state/game-session";

interface Props {
  initialRoomCode: string;
  errorMessage: string | null;
}

export function JoinScreen({ initialRoomCode, errorMessage }: Props) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canSubmit = roomCode.length === 4 && name.trim().length > 0 && !submitted;

  // If the server rejects the join (bad room, name taken, etc.), let the user
  // retry — clear the submitted lock so the button re-enables.
  useEffect(() => {
    if (errorMessage) setSubmitted(false);
  }, [errorMessage]);

  const onJoin = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    gameSession.send({
      type: "JOIN_ROOM",
      payload: { roomCode, playerName: name.trim(), deviceType: "phone" },
    });
  };

  return (
    <div className="phone-root flex flex-col items-stretch justify-center px-6 py-8 bg-black text-cyan-200">
      <h1 className="text-5xl font-black text-center tracking-widest text-pink-400 mb-2">
        BUZZ
      </h1>
      <p className="text-center text-xs uppercase opacity-60 mb-8">phone player</p>

      <label className="text-xs uppercase opacity-70 mt-2">Room Code</label>
      <input
        className="bg-black border-2 border-cyan-700 rounded text-3xl font-bold text-center py-3 mt-1 uppercase tracking-[0.4em]"
        placeholder="XXXX"
        value={roomCode}
        maxLength={4}
        autoCapitalize="characters"
        autoCorrect="off"
        disabled={submitted}
        onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
      />

      <label className="text-xs uppercase opacity-70 mt-5">Your Name</label>
      <input
        className="bg-black border-2 border-cyan-700 rounded text-2xl py-3 px-3 mt-1"
        placeholder="Player 1"
        value={name}
        maxLength={40}
        disabled={submitted}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        type="button"
        onClick={onJoin}
        disabled={!canSubmit}
        className="mt-8 bg-pink-500 disabled:bg-gray-700 text-black disabled:text-gray-400 text-xl font-black py-5 rounded uppercase tracking-wider"
      >
        {submitted ? "Joining…" : "Join Game"}
      </button>

      {errorMessage && <p className="mt-4 text-red-400 text-sm text-center">{errorMessage}</p>}
    </div>
  );
}
