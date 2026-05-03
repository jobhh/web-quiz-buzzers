// Discriminated union of all WebSocket messages exchanged between client and server.
// Phase 1 only defines PING/PONG; later phases extend this with game protocol messages.

export type WSMessage =
  | { type: "PING" }
  | { type: "PONG"; at: number };
