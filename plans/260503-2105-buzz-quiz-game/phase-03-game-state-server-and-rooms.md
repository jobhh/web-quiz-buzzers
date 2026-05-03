# Phase 3 — Game State Server & Rooms

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-02-webhid-buzz-controller-layer.md](phase-02-webhid-buzz-controller-layer.md)
- Next: [phase-04-question-pack-system.md](phase-04-question-pack-system.md)

## Overview
- **Priority**: P1 (blocks 5/6/7/8)
- **Status**: pending
- **Effort**: ~4h
- Server-authoritative game state machine with room model. Typed WS message protocol with Zod runtime validation. Reconnect handling. State broadcast on every change.

## Key Insights
- Single source of truth: server holds `Map<roomCode, RoomState>`. Clients are dumb renderers.
- Discriminated union for all messages (action types). Both directions use the same envelope: `{ type: string, payload: any }`.
- Server validates inbound with Zod; outbound state is trusted (server-authored).
- Use `crypto.randomUUID()` for player IDs; store on client localStorage so reconnect can re-claim.
- Room codes: 4 uppercase letters (no I/O/0/1 to avoid confusion → 32 chars × 4 = 1M combos, plenty)
- Reconnect: client sends `RECONNECT` with stored `playerId` + `roomCode`; server re-attaches WS to existing player slot.
- Don't send full state on every change — but for KISS, do send full state at first; optimize to diffs only if perf demands. (Rooms are small, state JSON <5KB.)

## Requirements
**Functional**
- `POST` to `/api/rooms` (or first WS message `CREATE_ROOM`) creates new room, returns 4-letter code
- `JOIN_ROOM` message with `{ roomCode, playerName, deviceType: "phone"|"buzz" }` adds player
- For Buzz players, `playerId` is bound to `(dongleId, controllerSlot)` rather than network
- WS sends `STATE_UPDATE` to all clients in room on every state change
- Reconnect: client reuses `playerId` from localStorage, server reattaches WS handle
- Host distinction: first connection is host; only host can `START_GAME`, `NEXT_QUESTION`, `END_ROUND`
- All inbound messages validated with Zod schemas; invalid → drop + log

**Non-functional**
- State broadcast latency <20ms on LAN
- Room state survives WS drops/reconnects for 60 seconds before player auto-removed

## Architecture

### State machine
```
LOBBY → ROUND_INTRO → QUESTION_REVEAL → BUZZ_OPEN → ANSWER_LOCK → REVEAL → SCOREBOARD → (next round) → FINAL_WAGER → WINNER
```
(Transitions enforced server-side via reducer-style `dispatch(action) → newState`.)

### Message protocol (`shared/src/messages.ts`)

Inbound (client → server):
- `CREATE_ROOM` `{ hostName }`
- `JOIN_ROOM` `{ roomCode, playerName, deviceType, playerId? }` (playerId for reconnect)
- `RECONNECT` `{ roomCode, playerId }`
- `START_GAME` `{ packId }`
- `BUZZ` `{ playerId }` (during BUZZ_OPEN)
- `ANSWER` `{ playerId, choice: 0|1|2|3 }` (speed round / locked-in answer)
- `WAGER` `{ playerId, amount: number }`
- `NEXT_QUESTION`
- `LEAVE`

Outbound (server → client):
- `STATE_UPDATE` `{ state: GameState }`
- `ROOM_CREATED` `{ roomCode, playerId }`
- `JOIN_ACK` `{ playerId }`
- `ERROR` `{ code, message }`

### `GameState` shape (full)
```ts
type GameState = {
  roomCode: string
  hostId: string
  phase: 'LOBBY' | 'ROUND_INTRO' | 'QUESTION_REVEAL' | 'BUZZ_OPEN' | 'ANSWER_LOCK' | 'REVEAL' | 'SCOREBOARD' | 'FINAL_WAGER' | 'WINNER'
  players: Player[]
  packId?: string
  currentRound: 1 | 2 | 3 | 4  // 4 = final
  questionIndex: number
  currentQuestion?: QuestionPublic   // server strips `correct` until reveal
  buzzedPlayerId?: string             // who buzzed first (R1/R3)
  buzzWindowEndsAt?: number           // epoch ms
  lockedOutPlayerIds: string[]        // for steal mechanic
  speedRoundAnswers?: Record<string, { choice: number, timestamp: number }>
  wagers?: Record<string, number>
  lastReveal?: { correctIndex: number, scoreDeltas: Record<string, number> }
}
```

## Related Code Files

**Create**
- `shared/src/messages.ts` — discriminated union types for all messages
- `shared/src/messages-zod.ts` — Zod schemas matching the types (use `z.discriminatedUnion`)
- `shared/src/game-state.ts` — `GameState`, `Player`, `QuestionPublic` types
- `shared/src/room-code.ts` — `generateRoomCode()` excluding ambiguous chars
- `server/src/rooms.ts` — `RoomRegistry` class: create/get/delete rooms, prune empty rooms
- `server/src/room.ts` — `Room` class: holds state + WS handles map, broadcasts on change
- `server/src/reducer.ts` — pure `reduce(state, action) => newState`; framework-agnostic, easy to test
- `server/src/message-router.ts` — validates inbound via Zod, calls reducer, broadcasts new state
- `client/src/lib/ws-client.ts` — extend phase-1 stub with typed message dispatcher + state subscriber
- `client/src/state/game-store.ts` — Zustand or simple `useSyncExternalStore` holding latest GameState

**Modify**
- `server/src/websocket-handler.ts` — replace PING/PONG with router dispatch
- `package.json` — add `zod`

## Implementation Steps
1. Add Zod: `bun add zod`
2. Create `shared/src/game-state.ts` with full type definitions for `GameState`, `Player`, `QuestionPublic`
3. Create `shared/src/messages.ts` with discriminated union types
4. Create `shared/src/messages-zod.ts` mirroring as Zod schemas; export `parseClientMessage(unknown) => ClientMessage | null`
5. Create `shared/src/room-code.ts` with `generateRoomCode()` (4 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`)
6. Create `server/src/reducer.ts` with `reduce(state, action) => state` — initially handles JOIN_ROOM, LEAVE, START_GAME (transition LOBBY→ROUND_INTRO)
7. Create `server/src/room.ts` — `Room` class: `addPlayer`, `removePlayer`, `dispatch(action)` calls reducer + broadcasts, `attachSocket(playerId, ws)` for reconnect
8. Create `server/src/rooms.ts` — `RoomRegistry` singleton: `createRoom`, `getRoom(code)`, prune timer to GC empty rooms
9. Rewrite `server/src/websocket-handler.ts`: on `message`, parse with Zod, look up player's room, call `room.dispatch(action)`. On `close`, mark player disconnected (don't remove for 60s).
10. Create `client/src/state/game-store.ts` — minimal store holding `GameState | null`, updated on `STATE_UPDATE` messages
11. Update `client/src/lib/ws-client.ts` — typed `send(msg: ClientMessage)`, `subscribeState(cb)`, auto-reconnect with stored playerId
12. Smoke test: open 2 browser tabs, both join same room, verify both receive STATE_UPDATE on join
13. Test reconnect: kill one tab, reopen → verify same player slot reclaimed within 60s

## Todo List
- [ ] Add Zod dep
- [ ] Define GameState + Player types
- [ ] Define ClientMessage + ServerMessage discriminated unions
- [ ] Define Zod schemas for inbound messages
- [ ] Implement room code generator
- [ ] Implement pure reducer (start with JOIN/LEAVE/START_GAME)
- [ ] Implement Room class (state + sockets + broadcast)
- [ ] Implement RoomRegistry
- [ ] Wire WS handler to router → reducer → broadcast
- [ ] Build typed WS client + game store
- [ ] Smoke test: 2 tabs join same room
- [ ] Test reconnect with stored playerId
- [ ] Test invalid message dropped + logged

## Success Criteria
- 2 browser tabs can join the same room and see each other in `players` array
- Refreshing a tab reclaims the same player slot via stored localStorage `playerId`
- Sending malformed JSON to WS does not crash server
- Sending valid message with wrong type returns `ERROR` to sender only
- State updates broadcast within 20ms on LAN

## Risk Assessment
- **R**: Reducer becomes spaghetti as round logic grows → **M**: keep reducer thin (state transitions only); push round-specific scoring into pure helpers in phase 7
- **R**: WS reconnect storms (browser refresh loop) → **M**: short backoff (1s, 2s, 4s capped at 5s) on client side
- **R**: Player ID guessing/spoofing → **M**: cryptographically random UUIDs; LAN-only context makes this low-risk

## Security Considerations
- All inbound messages validated via Zod — drop unknown shapes
- Don't expose `correct` answer index in `QuestionPublic` until phase = REVEAL
- Don't trust client-sent `playerId` for new joins (server assigns)
- For RECONNECT, accept client-provided playerId only if it matches an existing disconnected player in that room

## Next Steps
- Phase 4 (packs) feeds question content into START_GAME
- Phase 5 (phone client) sends JOIN_ROOM
- Phase 7 (round mechanics) extends the reducer with round logic
