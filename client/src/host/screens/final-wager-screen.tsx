import type { GameState } from "@shared/game-state";
import { PlayerAvatar } from "../components/player-avatar";
import { CountdownBar } from "../components/countdown-bar";
import { FINAL_WAGER_WINDOW_MS } from "@shared/scoring";

interface Props {
  state: GameState;
}

export function FinalWagerScreen({ state }: Props) {
  const wagered = Object.keys(state.wagers ?? {}).length;
  const total = state.players.length;
  return (
    <div className="min-h-screen bg-black text-cyan-100 px-8 py-6 flex flex-col items-center">
      <h1 className="text-6xl font-black text-pink-400 tracking-wider mt-6">FINAL WAGER</h1>
      <p className="mt-2 opacity-80 text-center max-w-md">
        Each player chooses how much to wager. After everyone locks in, the question reveals.
      </p>
      <p className="mt-8 text-xl">
        <span className="text-yellow-300 font-black tabular-nums">{wagered}</span> / {total} wagered
      </p>
      {state.buzzWindowEndsAt && (
        <div className="mt-6 w-80">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={FINAL_WAGER_WINDOW_MS} />
        </div>
      )}
      <ul className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
        {state.players.map((p) => {
          const w = state.wagers?.[p.id];
          const locked = w != null;
          return (
            <li
              key={p.id}
              className={`p-3 rounded border-2 flex flex-col items-center gap-2 ${
                locked ? "border-green-400 bg-green-950/40" : "border-cyan-800"
              }`}
            >
              <PlayerAvatar player={p} size="md" />
              <p className="font-bold text-sm truncate w-full text-center">{p.name}</p>
              <p className="text-xs opacity-70">Score: {p.score}</p>
              <p className={`text-lg font-black ${locked ? "text-green-300" : "opacity-50"}`}>
                {locked ? `Wager: ${w}` : "thinking…"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
