import { useEffect, useState } from "react";
import { gameSession } from "@client/state/game-session";
import { useGameState } from "@client/state/game-store";
import { useBuzzManagerStatus, useBuzzEvent } from "@client/hooks/use-buzz-events";
import { buzzManager } from "@client/hid/buzz-manager";
import { SetupScreen } from "./screens/setup-screen";
import { ScreenRouter } from "./screen-router";
import { HostControls } from "./components/host-controls";
import { buttonToChoice } from "@shared/buzz-constants";
import type { Player } from "@shared/game-state";
import { useAudio } from "@client/audio/use-audio";
import { usePhaseAudio } from "@client/audio/use-phase-audio";
import { audioManager } from "@client/audio/audio-manager";

interface ServerInfo {
  lanIps: string[];
  packs: { id: string; name: string; description: string; questionCount: number }[];
}

// Root for the host route. Three stages:
// 1) connecting → wait for ws + auto-create room
// 2) setup     → user grants WebHID (or skips)
// 3) lobby     → main pre-game screen
export function HostClient() {
  const state = useGameState();
  const { dongleCount } = useBuzzManagerStatus();
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [skippedSetup, setSkippedSetup] = useState(false);
  const [createInFlight, setCreateInFlight] = useState(false);

  useAudio();
  usePhaseAudio(state);

  // Boot ws + restore previously-attached dongles + arm audio unlock on first click.
  useEffect(() => {
    gameSession.start();
    if (buzzManager.isSupported()) {
      buzzManager.restoreAttached().catch(() => {});
    }
    const unlock = () => audioManager.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Fetch server info (LAN IP + packs) once. Don't block the lobby on this —
  // if the fetch fails (e.g. dev mode without /api proxy), fall back to an
  // empty default so the room still renders.
  useEffect(() => {
    let cancelled = false;
    const fallback: ServerInfo = { lanIps: [], packs: [] };
    fetch("/api/server-info")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ct = r.headers.get("content-type") ?? "";
        if (!ct.includes("application/json")) throw new Error(`bad content-type: ${ct}`);
        return r.json() as Promise<ServerInfo>;
      })
      .then((info) => {
        if (!cancelled) setServerInfo(info);
      })
      .catch((e) => {
        console.warn("[host] server-info fetch failed; continuing with empty fallback", e);
        if (!cancelled) setServerInfo(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-create a room if we don't already have one and ws is up.
  // Also retry if a stale stored session was just cleared by ROOM_NOT_FOUND
  // or PLAYER_NOT_FOUND error (e.g. server restarted between page loads).
  useEffect(() => {
    if (state || createInFlight) return;
    const tryCreate = (delay: number) => {
      // Small delay so a pending RECONNECT can resolve first.
      setTimeout(() => {
        if (state || createInFlight) return;
        if (gameSession.getStored()) return;
        setCreateInFlight(true);
        gameSession.send({ type: "CREATE_ROOM", payload: { hostName: "Host" } });
      }, delay);
    };
    const offStatus = gameSession.onStatus((s) => {
      if (s === "connected") tryCreate(150);
    });
    const offError = gameSession.onError((e) => {
      // Stored session was just cleared on stale ROOM_NOT_FOUND/PLAYER_NOT_FOUND.
      if (e.code === "ROOM_NOT_FOUND" || e.code === "PLAYER_NOT_FOUND") {
        tryCreate(50);
      }
    });
    return () => {
      offStatus();
      offError();
    };
  }, [state, createInFlight]);

  // While waiting for state, show a minimal connecting screen.
  if (!state || !serverInfo) {
    return (
      <div className="min-h-screen bg-black text-cyan-300 flex items-center justify-center font-mono">
        <p className="text-xl tracking-widest opacity-60">CONNECTING…</p>
      </div>
    );
  }

  // Setup → Lobby transition: if user has connected ≥1 dongle OR skipped, go to lobby.
  const inSetup = !skippedSetup && dongleCount === 0;
  if (inSetup) return <SetupScreen onContinue={() => setSkippedSetup(true)} />;

  return (
    <>
      <ScreenRouter state={state} serverInfo={serverInfo} />
      <HostControls state={state} />
      <BuzzGameInputs />
    </>
  );
}

// Translates buzz events from physical controllers into game actions
// (BUZZ during BUZZ_OPEN, ANSWER during ANSWER_LOCK or speed BUZZ_OPEN, WAGER
// preset during FINAL_WAGER). Lookup runs on every event so it always reads
// the freshest state without a stale closure.
function BuzzGameInputs() {
  useBuzzEvent((p, kind) => {
    if (kind !== "press") return;
    const state = useGameStateSnapshot();
    if (!state) return;
    // Find the player owning this (dongle, controller) pair.
    const me: Player | undefined = state.players.find(
      (pl) =>
        pl.buzzSlot?.dongleId === p.dongleId &&
        pl.buzzSlot?.controllerIndex === p.controllerIndex,
    );
    if (!me) return;

    // BUZZ button (red) during BUZZ_OPEN of R1/R3 → BUZZ message.
    if (
      p.buttonIndex === 0 &&
      state.phase === "BUZZ_OPEN" &&
      (state.currentRound === 1 || state.currentRound === 3)
    ) {
      gameSession.send({ type: "BUZZ", payload: { buzzPlayerId: me.id } });
      return;
    }
    // Answer buttons (Y/G/O/B) during ANSWER_LOCK (R1/R3 buzzer's pick),
    // BUZZ_OPEN (R2 speed), or final ANSWER_LOCK.
    const choice = buttonToChoice(p.buttonIndex);
    if (choice === undefined) return;
    const isFinalAnswer =
      state.phase === "ANSWER_LOCK" && state.currentRound === 4;
    const isBuzzerAnswer =
      state.phase === "ANSWER_LOCK" &&
      (state.currentRound === 1 || state.currentRound === 3) &&
      state.buzzedPlayerId === me.id;
    const isSpeedAnswer =
      state.phase === "BUZZ_OPEN" && state.currentRound === 2;
    if (isFinalAnswer || isBuzzerAnswer || isSpeedAnswer) {
      // Don't allow selecting an already-eliminated answer
      if (state.wrongAnswers?.includes(choice)) return;
      gameSession.send({ type: "ANSWER", payload: { choice, buzzPlayerId: me.id } });
      return;
    }
    // Wager presets in FINAL_WAGER: Y=25%, G=50%, O=75%, B=100%.
    if (state.phase === "FINAL_WAGER") {
      const pct = [0.25, 0.5, 0.75, 1.0][choice] ?? 0;
      const amount = Math.floor(me.score * pct);
      gameSession.send({ type: "WAGER", payload: { amount, buzzPlayerId: me.id } });
    }
  });
  return null;
}

// Snapshot accessor without re-rendering the host on every state change.
import { getGameState } from "@client/state/game-store";
function useGameStateSnapshot() {
  // Always reads the latest store value at call time.
  return getGameState();
}
