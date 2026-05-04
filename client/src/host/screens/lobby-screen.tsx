import { useEffect, useState } from "react";
import { buzzManager } from "@client/hid/buzz-manager";
import { useBuzzManagerStatus } from "@client/hooks/use-buzz-events";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";
import type { ControllerSlot } from "@client/hid/buzz-types";
import { CONTROLLERS_PER_DONGLE } from "@shared/buzz-constants";
import { BuzzPadSlot } from "../components/buzz-pad-slot";
import { QrCode } from "../components/qr-code";
import { PackPicker } from "../components/pack-picker";

interface PackInfo {
  id: string;
  name: string;
  description: string;
  questionCount: number;
}

interface ServerInfo {
  lanIps: string[];
  packs: PackInfo[];
}

interface Props {
  state: GameState;
  serverInfo: ServerInfo | null;
}

// Tracks which (dongle,controller) is currently in the name-entry flow.
type NamingKey = string; // `${dongleId}:${controllerIndex}`
const keyOf = (d: number, c: number): NamingKey => `${d}:${c}`;

export function LobbyScreen({ state, serverInfo }: Props) {
  const { dongleCount, manager } = useBuzzManagerStatus();
  const [namingSlot, setNamingSlot] = useState<NamingKey | null>(null);
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  // Default-pick the first pack once server-info arrives.
  useEffect(() => {
    if (!selectedPack && serverInfo && serverInfo.packs.length > 0) {
      setSelectedPack(serverInfo.packs[0].id);
    }
  }, [serverInfo, selectedPack]);

  // Listen for big-red presses on UNCLAIMED slots → start naming.
  useEffect(() => {
    return buzzManager.on((p, kind) => {
      if (kind !== "press") return;
      if (p.buttonIndex !== 0) return; // only RED triggers claim
      const slotKey = keyOf(p.dongleId, p.controllerIndex);
      const occupied = state.players.some(
        (pl) =>
          pl.buzzSlot?.dongleId === p.dongleId &&
          pl.buzzSlot?.controllerIndex === p.controllerIndex,
      );
      if (occupied) return;
      // Don't override an existing naming session for the same slot.
      if (namingSlot === slotKey) return;
      setNamingSlot(slotKey);
    });
  }, [state.players, namingSlot]);

  const onSubmitName = (dongleId: number, controllerIndex: ControllerSlot, name: string) => {
    gameSession.send({
      type: "JOIN_ROOM",
      payload: {
        roomCode: state.roomCode,
        playerName: name,
        deviceType: "buzz",
        buzzSlot: { dongleId, controllerIndex },
      },
    });
    setNamingSlot(null);
  };

  const onCancelName = () => setNamingSlot(null);

  const phonePlayers = state.players.filter((p) => p.deviceType === "phone");
  const buzzPlayers = state.players.filter((p) => p.deviceType === "buzz");
  const lanIp = serverInfo?.lanIps[0];
  // Use the same port the host loaded the page on (Vite 5173 in dev, Bun 3000
  // in prod, or whatever PORT env was passed). Phones reach Vite via the same
  // port; Vite's WS proxy handles the rest.
  const portSuffix = location.port ? `:${location.port}` : "";
  const joinUrl = lanIp
    ? `${location.protocol}//${lanIp}${portSuffix}/play?room=${state.roomCode}`
    : `${location.origin}/play?room=${state.roomCode}`;

  const canStart = state.players.length >= 1 && selectedPack !== null;

  return (
    <div className="min-h-screen bg-black text-cyan-100 p-6 font-mono">
      <header className="flex items-baseline gap-6">
        <h1 className="text-5xl font-black text-pink-400 tracking-widest">BUZZ QUIZ</h1>
        <div className="ml-auto text-right">
          <p className="text-xs opacity-60 uppercase">Room</p>
          <p className="text-3xl font-black text-yellow-300 tracking-[0.4em]">{state.roomCode}</p>
        </div>
      </header>

      <main className="mt-8 grid lg:grid-cols-[2fr_1fr] gap-6">
        <section>
          <h2 className="text-sm uppercase tracking-widest opacity-60 mb-2">
            Buzz Players ({buzzPlayers.length}/{dongleCount * CONTROLLERS_PER_DONGLE})
          </h2>
          {dongleCount === 0 && (
            <div className="border border-gray-700 p-4 rounded">
              <p className="opacity-60">No dongles attached. Phone players can still join via QR.</p>
            </div>
          )}
          {manager.dongles.map((d, di) => (
            <div key={d.dongleId} className="mb-4">
              <p className="text-xs opacity-60 mb-2">Dongle #{di + 1}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: CONTROLLERS_PER_DONGLE }, (_, ci) => {
                  const slotKey = keyOf(d.dongleId, ci);
                  const player =
                    state.players.find(
                      (p) =>
                        p.buzzSlot?.dongleId === d.dongleId &&
                        p.buzzSlot?.controllerIndex === ci,
                    ) ?? null;
                  return (
                    <BuzzPadSlot
                      key={ci}
                      dongle={d}
                      controllerIndex={ci as ControllerSlot}
                      player={player}
                      isNaming={namingSlot === slotKey}
                      onSubmitName={(name) => onSubmitName(d.dongleId, ci as ControllerSlot, name)}
                      onCancelName={onCancelName}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          <h2 className="text-sm uppercase tracking-widest opacity-60 mt-6 mb-2">
            Phone Players ({phonePlayers.length})
          </h2>
          <ul className="space-y-1">
            {phonePlayers.length === 0 && (
              <li className="opacity-60 text-sm">— scan the QR to join —</li>
            )}
            {phonePlayers.map((p) => (
              <PhonePlayerRow key={p.id} player={p} />
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div>
            <p className="text-xs uppercase opacity-60 mb-2 tracking-widest">Scan to join</p>
            <QrCode url={joinUrl} />
            <p className="text-xs opacity-50 mt-2 break-all">{joinUrl}</p>
          </div>

          <PackPicker
            packs={serverInfo?.packs ?? []}
            selected={selectedPack}
            onChange={setSelectedPack}
          />

          <button
            type="button"
            disabled={!canStart}
            onClick={() =>
              selectedPack &&
              gameSession.send({ type: "START_GAME", payload: { packId: selectedPack } })
            }
            className="w-full px-6 py-4 bg-pink-500 disabled:bg-gray-700 text-black disabled:text-gray-400 font-black uppercase tracking-wider rounded text-xl"
          >
            Start Game
          </button>
        </aside>
      </main>
    </div>
  );
}

function PhonePlayerRow({ player }: { player: Player }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          player.connected ? "bg-green-400" : "bg-gray-500"
        }`}
      />
      <span className="opacity-80">📱</span>
      <span className="font-bold">{player.name}</span>
    </li>
  );
}
