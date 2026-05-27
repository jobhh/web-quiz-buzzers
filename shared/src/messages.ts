import type { DeviceType, BuzzSlot, GameState } from "./game-state";

// Client → Server. Inbound messages are validated by the Zod schema in
// `messages-zod.ts` before reaching the reducer.
export type ClientMessage =
  | { type: "PING"; payload?: Record<string, never> }
  | { type: "CREATE_ROOM"; payload: { hostName: string } }
  | {
      type: "JOIN_ROOM";
      payload: {
        roomCode: string;
        playerName: string;
        deviceType: DeviceType;
        buzzSlot?: BuzzSlot;
      };
    }
  | { type: "RECONNECT"; payload: { roomCode: string; playerId: string } }
  | { type: "START_GAME"; payload: { packId: string } }
  | { type: "BUZZ"; payload?: Record<string, never> }
  | { type: "ANSWER"; payload: { choice: 0 | 1 | 2 | 3 } }
  | { type: "WAGER"; payload: { amount: number } }
  | { type: "NEXT_QUESTION"; payload?: Record<string, never> }
  | { type: "RESET_GAME"; payload?: Record<string, never> }
  | { type: "LEAVE"; payload?: { buzzPlayerId?: string } };

// Server → Client.
export type ServerMessage =
  | { type: "PONG"; payload: { at: number } }
  | { type: "ROOM_CREATED"; payload: { roomCode: string; playerId: string } }
  | { type: "JOIN_ACK"; payload: { roomCode: string; playerId: string } }
  | { type: "STATE_UPDATE"; payload: { state: GameState } }
  | { type: "ERROR"; payload: { code: string; message: string } };

export type ClientMessageType = ClientMessage["type"];
export type ServerMessageType = ServerMessage["type"];
