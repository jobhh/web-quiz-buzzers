import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { buzzManager } from "@client/hid/buzz-manager";
import { useBuzzManagerStatus } from "@client/hooks/use-buzz-events";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";
import type { ControllerSlot } from "@client/hid/buzz-types";
import { CONTROLLERS_PER_DONGLE } from "@shared/buzz-constants";
import { BuzzPadSlot } from "../components/buzz-pad-slot";
import { QrCode } from "../components/qr-code";
import { PackPicker } from "../components/pack-picker";
import { AnimatedBg, MagneticButton, SplitText } from "@client/anim";

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

type NamingKey = string;
const keyOf = (d: number, c: number): NamingKey => `${d}:${c}`;

export function LobbyScreen({ state, serverInfo }: Props) {
  const { dongleCount, manager } = useBuzzManagerStatus();
  const [namingSlots, setNamingSlots] = useState<Set<NamingKey>>(new Set());
  const [confirmLeaveSlots, setConfirmLeaveSlots] = useState<Set<NamingKey>>(new Set());
  const [selectedPack, setSelectedPack] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPack && serverInfo && serverInfo.packs.length > 0) {
      setSelectedPack(serverInfo.packs[0].id);
    }
  }, [serverInfo, selectedPack]);

  useEffect(() => {
    return buzzManager.on((p, kind) => {
      if (kind !== "press") return;
      if (p.buttonIndex !== 0) return;
      const slotKey = keyOf(p.dongleId, p.controllerIndex);

      // Check if this slot is already claimed by a player
      const player = state.players.find(
        (pl) =>
          pl.buzzSlot?.dongleId === p.dongleId &&
          pl.buzzSlot?.controllerIndex === p.controllerIndex,
      );

      if (player) {
        // Claimed slot: double-press to leave
        setConfirmLeaveSlots((prev) => {
          if (prev.has(slotKey)) {
            // Second press — remove the player
            gameSession.send({
              type: "LEAVE",
              payload: { buzzPlayerId: player.id },
            });
            const next = new Set(prev);
            next.delete(slotKey);
            return next;
          }
          // First press — enter confirm state, auto-clear after 3s
          const next = new Set(prev);
          next.add(slotKey);
          setTimeout(() => {
            setConfirmLeaveSlots((cur) => {
              if (!cur.has(slotKey)) return cur;
              const n = new Set(cur);
              n.delete(slotKey);
              return n;
            });
          }, 3000);
          return next;
        });
        return;
      }

      // Unclaimed slot: enter naming mode
      setNamingSlots((prev) => {
        if (prev.has(slotKey)) return prev;
        const next = new Set(prev);
        next.add(slotKey);
        return next;
      });
    });
  }, [state.players]);

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
    setNamingSlots((prev) => {
      const next = new Set(prev);
      next.delete(keyOf(dongleId, controllerIndex));
      return next;
    });
  };

  const onCancelName = (dongleId: number, controllerIndex: ControllerSlot) => {
    setNamingSlots((prev) => {
      const next = new Set(prev);
      next.delete(keyOf(dongleId, controllerIndex));
      return next;
    });
  };

  const phonePlayers = state.players.filter((p) => p.deviceType === "phone");
  const buzzPlayers = state.players.filter((p) => p.deviceType === "buzz");
  const lanIp = serverInfo?.lanIps[0];
  const portSuffix = location.port ? `:${location.port}` : "";
  const joinUrl = lanIp
    ? `${location.protocol}//${lanIp}${portSuffix}/play?room=${state.roomCode}`
    : `${location.origin}/play?room=${state.roomCode}`;

  const canStart = state.players.length >= 1 && selectedPack !== null;

  return (
    <div className="min-h-screen text-cyan-100 p-6 font-body relative overflow-hidden">
      <AnimatedBg variant="grid" />

      <header className="flex items-baseline gap-6">
        <h1 className="text-5xl md:text-6xl font-display text-neon-pink tracking-widest animate-neon-flicker">
          <SplitText text="BUZZ QUIZ" stagger={0.05} duration={0.7} />
        </h1>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="ml-auto text-right"
        >
          <p className="text-xs opacity-60 uppercase">Room</p>
          <p className="text-3xl font-display text-neon-gold tracking-[0.4em] text-glow-gold">
            {state.roomCode}
          </p>
        </motion.div>
      </header>

      <main className="mt-8 grid lg:grid-cols-[2fr_1fr] gap-6">
        <section>
          <h2 className="text-sm uppercase tracking-widest opacity-60 mb-2 font-display">
            Buzz Players ({buzzPlayers.length}/{dongleCount * CONTROLLERS_PER_DONGLE})
          </h2>
          {dongleCount === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-cyan-800/60 p-4 rounded bg-neon-dark/40"
            >
              <p className="opacity-60">
                No dongles attached. Phone players can still join via QR.
              </p>
            </motion.div>
          )}
          {manager.dongles.map((d, di) => (
            <motion.div
              key={d.dongleId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * di }}
              className="mb-4"
            >
              <p className="text-xs opacity-60 mb-2 font-display tracking-widest">
                Dongle #{di + 1}
              </p>
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
                      isNaming={namingSlots.has(slotKey)}
                      confirmingLeave={confirmLeaveSlots.has(slotKey)}
                      onSubmitName={(name) =>
                        onSubmitName(d.dongleId, ci as ControllerSlot, name)
                      }
                      onCancelName={() => onCancelName(d.dongleId, ci as ControllerSlot)}
                    />
                  );
                })}
              </div>
            </motion.div>
          ))}

          <h2 className="text-sm uppercase tracking-widest opacity-60 mt-6 mb-2 font-display">
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
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "backOut" }}
          >
            <p className="text-xs uppercase opacity-60 mb-2 tracking-widest font-display">
              Scan to join
            </p>
            <motion.div
              animate={{ boxShadow: [
                "0 0 0 0 rgba(255,0,110,0.0)",
                "0 0 24px 4px rgba(255,0,110,0.45)",
                "0 0 0 0 rgba(255,0,110,0.0)",
              ] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block rounded"
            >
              <QrCode url={joinUrl} />
            </motion.div>
            <p className="text-xs opacity-50 mt-2 break-all">{joinUrl}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <PackPicker
              packs={serverInfo?.packs ?? []}
              selected={selectedPack}
              onChange={setSelectedPack}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="relative"
          >
            {canStart && (
              <span className="absolute -inset-1 rounded animate-pulse-ring border-2 border-neon-pink pointer-events-none" />
            )}
            <MagneticButton
              type="button"
              disabled={!canStart}
              strength={0.4}
              onClick={() =>
                selectedPack &&
                gameSession.send({ type: "START_GAME", payload: { packId: selectedPack } })
              }
              className={`relative w-full px-6 py-5 ${
                canStart
                  ? "bg-neon-pink text-black shadow-neon"
                  : "bg-gray-700 text-gray-400"
              } font-display uppercase tracking-[0.3em] rounded text-xl overflow-hidden`}
            >
              <span className="relative z-10">Start Game</span>
              {canStart && <span className="scan-sweep-bar animate-scan-sweep" />}
            </MagneticButton>
          </motion.div>
        </aside>
      </main>
    </div>
  );
}

function PhonePlayerRow({ player }: { player: Player }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 text-sm"
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          player.connected ? "bg-neon-green animate-pulse" : "bg-gray-500"
        }`}
      />
      <span className="opacity-80">📱</span>
      <span className="font-bold">{player.name}</span>
    </motion.li>
  );
}
