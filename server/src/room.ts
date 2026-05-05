import type { ServerWebSocket } from "bun";
import type { ServerMessage } from "@shared/messages";
import type { GameState } from "@shared/game-state";
import type { RoundQuestions } from "@shared/pack-types";
import { reduce, initialState, type Action } from "./reducer";
import type { SocketData } from "./socket-data";
import { packRegistry } from "./pack-registry";
import { TimerManager } from "./timer-manager";
import { projectStateForBroadcast } from "./state-projection";
import {
  advanceFromIntroOrReveal,
  enterFinalWager,
  handleAnswer,
  handleBuzz,
  handleTimerExpired,
  handleWager,
  type EngineResult,
  type TimerEvent,
} from "./round-engine";

// How long a disconnected player remains in the room before being auto-removed.
// Allows tab refresh / phone backgrounding to seamlessly reconnect.
export const RECONNECT_GRACE_MS = 60_000;

export type StartGameError = "NOT_HOST" | "BAD_PHASE" | "PACK_NOT_FOUND";

export class Room {
  state: GameState;
  // Round questions are server-side ONLY (they include the `correct` index).
  // Public state holds at most a single QuestionPublic projection at a time.
  roundQuestions: RoundQuestions | null = null;
  private sockets = new Map<string, ServerWebSocket<SocketData>>();
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly timers = new TimerManager();

  constructor(roomCode: string, hostId: string) {
    this.state = initialState(roomCode, hostId);
  }

  // Loads + assigns pack questions, then transitions LOBBY → ROUND_INTRO.
  startGame(packId: string, requesterId: string): StartGameError | null {
    if (requesterId !== this.state.hostId) return "NOT_HOST";
    if (this.state.phase !== "LOBBY") return "BAD_PHASE";
    const rounds = packRegistry.assignToRounds(packId);
    if (!rounds) return "PACK_NOT_FOUND";
    this.roundQuestions = rounds;
    this.dispatch({
      type: "START_GAME",
      playerId: requesterId,
      payload: { packId },
    });
    return null;
  }

  // Player action: BUZZ. Goes through round engine.
  handleBuzz(playerId: string): void {
    if (!this.roundQuestions) return;
    this.applyEngine(handleBuzz(this.state, playerId));
  }

  // Player action: ANSWER.
  handleAnswer(playerId: string, choice: 0 | 1 | 2 | 3): void {
    if (!this.roundQuestions) return;
    this.applyEngine(handleAnswer(this.state, this.roundQuestions, playerId, choice));
  }

  // Player action: WAGER.
  handleWager(playerId: string, amount: number): void {
    if (!this.roundQuestions) return;
    this.applyEngine(handleWager(this.state, playerId, amount));
  }

  // Host action: RESET_GAME. Clears game state back to LOBBY but keeps players
  // (scores zeroed) so a "Play Again" doesn't drop everyone's connection.
  handleResetGame(playerId: string): void {
    if (playerId !== this.state.hostId) return;
    this.timers.clearAll();
    this.roundQuestions = null;
    this.state = {
      roomCode: this.state.roomCode,
      hostId: this.state.hostId,
      phase: "LOBBY",
      players: this.state.players.map((p) => ({ ...p, score: 0 })),
      currentRound: 1,
      questionIndex: 0,
      lockedOutPlayerIds: [],
    };
    this.broadcast();
  }

  // Host action: NEXT_QUESTION (advances ROUND_INTRO/QUESTION_REVEAL/REVEAL/SCOREBOARD/BUZZ_OPEN).
  // Also auto-promotes round 3 → round 4 (final) when SCOREBOARD advances.
  handleNextQuestion(playerId: string): void {
    if (playerId !== this.state.hostId) return;
    if (!this.roundQuestions) return;
    // Special case: SCOREBOARD after round 3 → enter FINAL_WAGER directly.
    if (this.state.phase === "SCOREBOARD" && this.state.currentRound === 3) {
      this.applyEngine(enterFinalWager(this.state, this.roundQuestions));
      return;
    }
    this.applyEngine(advanceFromIntroOrReveal(this.state, this.roundQuestions));
  }

  attachSocket(playerId: string, ws: ServerWebSocket<SocketData>): void {
    const prev = this.sockets.get(playerId);
    if (prev && prev !== ws) {
      try {
        prev.close(1000, "replaced");
      } catch {
        /* swallow */
      }
    }
    this.sockets.set(playerId, ws);

    const t = this.disconnectTimers.get(playerId);
    if (t) {
      clearTimeout(t);
      this.disconnectTimers.delete(playerId);
    }

    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === playerId ? { ...p, connected: true } : p,
      ),
    };
  }

  detachSocket(ws: ServerWebSocket<SocketData>): void {
    const playerId = ws.data.playerId;
    if (!playerId) return;
    if (this.sockets.get(playerId) !== ws) return;

    this.sockets.delete(playerId);
    this.state = {
      ...this.state,
      players: this.state.players.map((p) =>
        p.id === playerId ? { ...p, connected: false } : p,
      ),
    };

    const t = setTimeout(() => {
      this.disconnectTimers.delete(playerId);
      const player = this.state.players.find((p) => p.id === playerId);
      if (!player || player.connected) return;
      this.dispatch({ type: "LEAVE", playerId, payload: {} } as Action);
    }, RECONNECT_GRACE_MS);
    this.disconnectTimers.set(playerId, t);

    this.broadcast();
  }

  dispatch(action: Action): GameState {
    const prev = this.state;
    this.state = reduce(prev, action);
    if (this.state !== prev) this.broadcast();
    return this.state;
  }

  send(playerId: string, msg: ServerMessage): void {
    const ws = this.sockets.get(playerId);
    if (!ws) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* swallow */
    }
  }

  broadcast(): void {
    // Apply privacy projection so per-player wager amounts / speed-round picks
    // / final-wager question text never reach other clients via STATE_UPDATE.
    const msg: ServerMessage = {
      type: "STATE_UPDATE",
      payload: { state: projectStateForBroadcast(this.state) },
    };
    const json = JSON.stringify(msg);
    for (const ws of this.sockets.values()) {
      try {
        ws.send(json);
      } catch {
        /* swallow */
      }
    }
  }

  hasPlayer(playerId: string): boolean {
    return this.state.players.some((p) => p.id === playerId);
  }

  isEmpty(): boolean {
    return this.state.players.length === 0 && this.sockets.size === 0;
  }

  destroy(): void {
    this.timers.clearAll();
    for (const t of this.disconnectTimers.values()) clearTimeout(t);
    this.disconnectTimers.clear();
    for (const ws of this.sockets.values()) {
      try {
        ws.close(1000, "room destroyed");
      } catch {
        /* swallow */
      }
    }
    this.sockets.clear();
  }

  // Applies an engine result: updates state, schedules / clears timers,
  // broadcasts the new state if it changed.
  private applyEngine(result: EngineResult): void {
    const prev = this.state;
    if (result.clear) {
      for (const name of result.clear) this.timers.clear(name);
    }
    if (result.schedule) {
      const { name, delayMs, event } = result.schedule;
      this.timers.schedule(name, delayMs, () => this.fireTimer(event));
    }
    this.state = result.state;
    if (this.state !== prev) this.broadcast();
  }

  private fireTimer(event: TimerEvent): void {
    if (!this.roundQuestions) return;
    this.applyEngine(handleTimerExpired(this.state, this.roundQuestions, event));
  }
}
