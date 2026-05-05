import type { GameState, Player } from "@shared/game-state";
import type { ValidatedClientMessage } from "@shared/messages-zod";

// Reducer action: a validated client message plus the playerId resolved
// from the WebSocket. Round-specific actions (BUZZ, ANSWER, WAGER) are
// stubbed in phase 3; phase 7 fills in their state transitions.
export type Action = ValidatedClientMessage & { playerId: string };

export function initialState(roomCode: string, hostId: string): GameState {
  return {
    roomCode,
    hostId,
    phase: "LOBBY",
    players: [],
    currentRound: 1,
    questionIndex: 0,
    lockedOutPlayerIds: [],
  };
}

export function reduce(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "JOIN_ROOM": {
      // Idempotent: ignore if player already in the room.
      if (state.players.some((p) => p.id === action.playerId)) return state;

      const bs = action.payload.buzzSlot;
      if (
        bs &&
        state.players.some(
          (p) =>
            p.buzzSlot?.dongleId === bs.dongleId &&
            p.buzzSlot?.controllerIndex === bs.controllerIndex,
        )
      ) {
        // Slot collision should have been caught by router; defensive no-op.
        return state;
      }

      const player: Player = {
        id: action.playerId,
        name: action.payload.playerName,
        deviceType: action.payload.deviceType,
        buzzSlot: bs,
        score: 0,
        connected: true,
        joinedAt: Date.now(),
      };
      return { ...state, players: [...state.players, player] };
    }

    case "LEAVE": {
      const players = state.players.filter((p) => p.id !== action.playerId);
      // If the host leaves and others remain, hand off hosting to the next
      // longest-connected player (KISS). If everyone leaves, room becomes empty.
      let hostId = state.hostId;
      if (action.playerId === state.hostId && players.length > 0) {
        hostId = players[0].id;
      }
      // Clear all dangling references to the leaving player so the
      // round-engine and screens don't try to render or steal-from a ghost.
      const buzzedPlayerId =
        state.buzzedPlayerId === action.playerId ? undefined : state.buzzedPlayerId;
      const lockedOutPlayerIds = state.lockedOutPlayerIds.filter(
        (id) => id !== action.playerId,
      );
      let speedRoundAnswers = state.speedRoundAnswers;
      if (speedRoundAnswers && action.playerId in speedRoundAnswers) {
        const next = { ...speedRoundAnswers };
        delete next[action.playerId];
        speedRoundAnswers = next;
      }
      let wagers = state.wagers;
      if (wagers && action.playerId in wagers) {
        const next = { ...wagers };
        delete next[action.playerId];
        wagers = next;
      }
      return {
        ...state,
        players,
        hostId,
        buzzedPlayerId,
        lockedOutPlayerIds,
        speedRoundAnswers,
        wagers,
      };
    }

    case "START_GAME": {
      if (action.playerId !== state.hostId) return state;
      if (state.phase !== "LOBBY") return state;
      return {
        ...state,
        phase: "ROUND_INTRO",
        packId: action.payload.packId,
        startedAt: Date.now(),
      };
    }

    // Round-specific actions land in phase 7. For now they are accepted but
    // do not modify state — keeps the protocol surface stable so phase 5/6
    // clients can wire UI without breaking.
    case "BUZZ":
    case "ANSWER":
    case "WAGER":
    case "NEXT_QUESTION":
    case "RESET_GAME":
      return state;

    case "PING":
    case "CREATE_ROOM":
    case "RECONNECT":
      // Handled at the router level, not in the reducer.
      return state;

    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}
