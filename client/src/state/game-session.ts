import { WSClient } from "@client/lib/ws-client";
import { setGameState } from "./game-store";
import type { ClientMessage, ServerMessage } from "@shared/messages";

const STORAGE_KEY = "buzz-quiz:session";

export interface StoredSession {
  roomCode: string;
  playerId: string;
}

type StatusListener = (status: "connected" | "disconnected") => void;
type ErrorListener = (err: { code: string; message: string }) => void;

// Wraps the raw WSClient with game-specific concerns: persists the
// (roomCode, playerId) pair to localStorage so a tab refresh re-attaches
// to the same player slot, and routes STATE_UPDATE into the game store.
export class GameSession {
  private ws: WSClient | null = null;
  private statusListeners = new Set<StatusListener>();
  private errorListeners = new Set<ErrorListener>();
  private pendingRoomCode: string | null = null; // tracked for JOIN_ROOM → JOIN_ACK pairing

  start(): void {
    if (this.ws) return;
    const ws = new WSClient();
    this.ws = ws;
    ws.onMessage((m) => this.handleServerMessage(m as unknown as ServerMessage));
    ws.onStatus((s) => {
      for (const l of this.statusListeners) l(s);
      if (s === "connected") this.tryAutoReconnect();
    });
    ws.connect();
  }

  stop(): void {
    this.ws?.close();
    this.ws = null;
    setGameState(null);
  }

  send(msg: ClientMessage): void {
    if (msg.type === "JOIN_ROOM") this.pendingRoomCode = msg.payload.roomCode;
    if (msg.type === "START_GAME") {
      const stored = this.getStored();
      console.log("[session] START_GAME: stored playerId =", stored?.playerId);
    }
    // ws-client expects WSMessage; ClientMessage is a subset by shape.
    this.ws?.send(msg as never);
  }

  onStatus(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  onError(cb: ErrorListener): () => void {
    this.errorListeners.add(cb);
    return () => {
      this.errorListeners.delete(cb);
    };
  }

  getStored(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      return null;
    }
  }

  clearStored(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* swallow */
    }
  }

  private save(roomCode: string, playerId: string): void {
    console.log("[session] saving:", { roomCode, playerId });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ roomCode, playerId } satisfies StoredSession),
      );
    } catch {
      /* swallow */
    }
  }

  private tryAutoReconnect(): void {
    const stored = this.getStored();
    if (!stored) return;
    this.send({
      type: "RECONNECT",
      payload: { roomCode: stored.roomCode, playerId: stored.playerId },
    });
  }

  private handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "STATE_UPDATE":
        setGameState(msg.payload.state);
        return;
      case "ROOM_CREATED":
        this.save(msg.payload.roomCode, msg.payload.playerId);
        return;
      case "JOIN_ACK":
        // Only save if we don't already have a session (i.e. this is OUR join,
        // not a buzz player the host registered on its behalf).
        if (!this.getStored()) {
          this.save(msg.payload.roomCode, msg.payload.playerId);
        }
        this.pendingRoomCode = null;
        return;
      case "ERROR":
        for (const l of this.errorListeners) l(msg.payload);
        // If the server says PLAYER_NOT_FOUND on auto-reconnect, our stored
        // session is stale — clear it so the user can re-join cleanly.
        if (msg.payload.code === "PLAYER_NOT_FOUND" || msg.payload.code === "ROOM_NOT_FOUND") {
          this.clearStored();
        }
        return;
      case "PONG":
        return;
    }
  }
}

export const gameSession = new GameSession();
