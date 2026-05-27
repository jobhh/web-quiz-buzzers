import { randomUUID } from "node:crypto";
import type { ServerWebSocket } from "bun";
import { parseClientMessage } from "@shared/messages-zod";
import type { ServerMessage } from "@shared/messages";
import { rooms } from "./rooms";
import type { Action } from "./reducer";
import type { SocketData } from "./socket-data";

// Single entry point for all WS messages. Validates with Zod, resolves the
// player from the socket, and dispatches to the room reducer.
export function handleClientMessage(
  ws: ServerWebSocket<SocketData>,
  raw: unknown,
): void {
  const msg = parseClientMessage(raw);
  if (!msg) {
    sendError(ws, "INVALID_MESSAGE", "message failed schema validation");
    return;
  }

  switch (msg.type) {
    case "PING":
      send(ws, { type: "PONG", payload: { at: Date.now() } });
      return;

    case "CREATE_ROOM": {
      const playerId = randomUUID();
      const room = rooms.create(playerId);
      ws.data.playerId = playerId;
      ws.data.roomCode = room.state.roomCode;
      // Ack first so the client persists (roomCode, playerId) before the
      // initial STATE_UPDATE arrives — see RECONNECT path for why ordering
      // matters.
      send(ws, {
        type: "ROOM_CREATED",
        payload: { roomCode: room.state.roomCode, playerId },
      });
      room.attachSocket(playerId, ws);
      // Host is identified by `state.hostId` and gets STATE_UPDATE broadcasts
      // via its attached socket — but it does NOT occupy a player slot.
      room.broadcast();
      return;
    }

    case "JOIN_ROOM": {
      const room = rooms.get(msg.payload.roomCode);
      if (!room) {
        sendError(ws, "ROOM_NOT_FOUND", `no room ${msg.payload.roomCode}`);
        return;
      }
      if (room.state.phase !== "LOBBY") {
        sendError(ws, "GAME_IN_PROGRESS", "cannot join after game started");
        return;
      }
      const bs = msg.payload.buzzSlot;
      if (
        bs &&
        room.state.players.some(
          (p) =>
            p.buzzSlot?.dongleId === bs.dongleId &&
            p.buzzSlot?.controllerIndex === bs.controllerIndex,
        )
      ) {
        sendError(ws, "SLOT_TAKEN", "buzz slot already claimed");
        return;
      }
      const playerId = randomUUID();
      ws.data.playerId = playerId;
      ws.data.roomCode = room.state.roomCode;
      // Ack first (see CREATE_ROOM rationale).
      send(ws, {
        type: "JOIN_ACK",
        payload: { roomCode: room.state.roomCode, playerId },
      });
      room.attachSocket(playerId, ws);
      room.dispatch({ type: "JOIN_ROOM", playerId, payload: msg.payload });
      return;
    }

    case "RECONNECT": {
      const room = rooms.get(msg.payload.roomCode);
      if (!room) {
        sendError(ws, "ROOM_NOT_FOUND", "no such room");
        return;
      }
      // Host doesn't appear in `players` but should still be allowed to
      // re-attach by playerId === hostId.
      const isHost = msg.payload.playerId === room.state.hostId;
      const player = room.state.players.find(
        (p) => p.id === msg.payload.playerId,
      );
      if (!player && !isHost) {
        sendError(ws, "PLAYER_NOT_FOUND", "no such player in this room");
        return;
      }
      ws.data.playerId = msg.payload.playerId;
      ws.data.roomCode = room.state.roomCode;
      send(ws, {
        type: "JOIN_ACK",
        payload: { roomCode: room.state.roomCode, playerId: msg.payload.playerId },
      });
      room.attachSocket(msg.payload.playerId, ws);
      room.broadcast();
      return;
    }

    case "START_GAME": {
      if (!ws.data.playerId || !ws.data.roomCode) {
        sendError(ws, "NOT_IN_ROOM", "join a room first");
        return;
      }
      const room = rooms.get(ws.data.roomCode);
      if (!room) {
        sendError(ws, "ROOM_NOT_FOUND", "your room no longer exists");
        return;
      }
      const err = room.startGame(msg.payload.packId, ws.data.playerId);
      if (err === "PACK_NOT_FOUND") {
        sendError(ws, "PACK_NOT_FOUND", `pack '${msg.payload.packId}' not loaded`);
      } else if (err === "NOT_HOST") {
        sendError(ws, "NOT_HOST", "only the host can start the game");
      } else if (err === "BAD_PHASE") {
        sendError(ws, "BAD_PHASE", "game already started");
      }
      return;
    }

    case "LEAVE":
    case "BUZZ":
    case "ANSWER":
    case "WAGER":
    case "NEXT_QUESTION":
    case "RESET_GAME": {
      if (!ws.data.playerId || !ws.data.roomCode) {
        sendError(ws, "NOT_IN_ROOM", "join a room first");
        return;
      }
      const room = rooms.get(ws.data.roomCode);
      if (!room) {
        sendError(ws, "ROOM_NOT_FOUND", "your room no longer exists");
        return;
      }
      const playerId = ws.data.playerId;
      switch (msg.type) {
        case "BUZZ":
          room.handleBuzz(playerId);
          break;
        case "ANSWER":
          room.handleAnswer(playerId, msg.payload.choice);
          break;
        case "WAGER":
          room.handleWager(playerId, msg.payload.amount);
          break;
        case "NEXT_QUESTION":
          room.handleNextQuestion(playerId);
          break;
        case "RESET_GAME":
          room.handleResetGame(playerId);
          break;
        case "LEAVE": {
          // If the host sends LEAVE with a buzzPlayerId, remove that player
          // instead (buzz controllers share the host's socket).
          const targetId =
            msg.payload?.buzzPlayerId &&
            playerId === room.state.hostId
              ? msg.payload.buzzPlayerId
              : playerId;
          const action = { type: "LEAVE" as const, playerId: targetId, payload: msg.payload ?? {} } as Action;
          room.dispatch(action);
          if (targetId === playerId) {
            ws.data.playerId = null;
            ws.data.roomCode = null;
          }
          break;
        }
      }
      return;
    }
  }
}

export function handleSocketClose(ws: ServerWebSocket<SocketData>): void {
  if (!ws.data.roomCode) return;
  const room = rooms.get(ws.data.roomCode);
  if (!room) return;
  room.detachSocket(ws);
}

function send(ws: ServerWebSocket<SocketData>, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* swallow */
  }
}

function sendError(
  ws: ServerWebSocket<SocketData>,
  code: string,
  message: string,
): void {
  send(ws, { type: "ERROR", payload: { code, message } });
}
