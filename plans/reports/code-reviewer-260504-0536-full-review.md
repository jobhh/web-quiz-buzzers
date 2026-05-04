# Code Review — Buzz Quiz (full pass)

**Verdict:** Solid bones, ship-blockers are all data-leaks via the broadcast `STATE_UPDATE`. Game-state machine is coherent. Fix the privacy leaks (wagers, speed-round answers, final question text shown pre-wager) and the type-safety holes around answer choices, then this is shippable.

## Scores
| Axis | Score |
|---|---|
| Code quality | 8/10 |
| KISS / YAGNI | 9/10 |
| Security | 4/10 (broadcast leaks confidential payloads) |
| Type safety | 7/10 |
| State machine correctness | 8/10 |

---

## Critical (must fix before shipping)

### C1. Speed-round answers leak via `STATE_UPDATE` broadcast
- **File:** `server/src/round-engine.ts:160-187`, `server/src/room.ts:151-164`
- **Issue:** During R2 `BUZZ_OPEN` and Final `ANSWER_LOCK`, every player's `{ choice, timestamp }` is written into `state.speedRoundAnswers` and re-broadcast to every socket via `room.broadcast()`. Any phone player can open devtools, see `STATE_UPDATE` payloads, and read other players' picks before locking in their own — defeats the entire speed/wager mechanic.
- **Fix:** Project `speedRoundAnswers` to a per-player view before sending. Either send only `{ playerId: hasAnswered }` for speed phases (booleans), or do per-socket `STATE_UPDATE` with a `mySpeedAnswer` field carved out and the rest reduced to `answeredPlayerIds: string[]`. Same shape for `wagers` (see C2). Build a `projectStateForPlayer(state, playerId)` helper and call it from `room.broadcast()`/`room.send()`.

### C2. Wagers leak in real time during `FINAL_WAGER`
- **File:** `server/src/round-engine.ts:198-209`, `client/src/host/screens/final-wager-screen.tsx:42`
- **Issue:** `state.wagers[playerId] = clamped` is broadcast on every wager. The host screen literally renders `Wager: ${w}` for everyone the moment they lock in. Other players see the number on the big screen and can chase / hedge.
- **Fix:** Either (a) project `wagers` to a `wageredPlayerIds: string[]` for non-host viewers (host-only `wagerAmounts`), or (b) hold wagers in a server-private map and only emit `wageredCount` until the question opens, then reveal all wagers post-answer. The host UI showing actual amounts while phones are still locking in is a design bug regardless.

### C3. Final question text broadcast before wagers are locked
- **File:** `server/src/round-engine.ts:490-516` (`enterFinalWager`)
- **Issue:** `enterFinalWager` immediately sets `currentQuestion: toPublic(rounds.final[0])` and broadcasts. A phone player can read `state.currentQuestion.text` (and `answers`) in devtools while wager screens are still up. Classic wager-round design hides the question until wagers are locked.
- **Fix:** Defer setting `currentQuestion` until `enterFinalQuestion` (after all wagers in). Until then send only the category, or omit it entirely.

### C4. `correct` field never exposed — but verify reveal projection
- **File:** `shared/src/game-state.ts:35-40` (`QuestionPublic`)
- **Status:** OK in current code — `toPublic()` strips `correct` (round-engine.ts:263-270), and the answer index only appears in `lastReveal.correctIndex`. Confirming as a positive observation, not a bug. But please **add a comment on `QuestionPublic`** explicitly forbidding adding a `correct` field, because the `Question`/`QuestionPublic` shapes are dangerously similar and one careless `...q` spread would leak it.

---

## High Priority

### H1. `ANSWER_BUTTON_TO_CHOICE` is `Record<number, number>` — type erases the literal
- **File:** `shared/src/buzz-constants.ts:28`, `client/src/host/host-client.tsx:131`
- **Issue:** Lookup type is `number`, callers cast back: `choice as 0 | 1 | 2 | 3`. The cast is a lie if a caller passes `buttonIndex === 0` (red), which yields `undefined`. Currently saved by an upstream `if (choice == null) return;` guard, but the cast is fragile.
- **Fix:** Re-type as a tuple/Map preserving literals:
  ```ts
  export const ANSWER_BUTTON_TO_CHOICE = {
    1: 0, 2: 1, 3: 2, 4: 3,
  } as const satisfies Record<ButtonIndex, 0|1|2|3 | undefined>;
  ```
  Then `ANSWER_BUTTON_TO_CHOICE[p.buttonIndex]` is typed `0|1|2|3|undefined`, no cast needed.

### H2. Reconnect leaks the same private data
- **File:** `server/src/message-router.ts:82-104`
- **Issue:** Even after C1/C2 are fixed, `RECONNECT` calls `room.broadcast()` (line 102), which still sends the full state to the reconnector. Once the projection helper exists, RECONNECT must use the per-player projection too. Right now it uses `broadcast()` which sends to *everyone* — a reconnect re-emits the whole state to all sockets unnecessarily.
- **Fix:** After `attachSocket`, call `room.send(player.id, projectedState)` rather than `broadcast()`. The other players' state hasn't changed; you only need to deliver a snapshot to the reconnector.

### H3. `WSClient` does not validate inbound messages
- **File:** `client/src/lib/ws-client.ts:38-46`
- **Issue:** Server messages are `JSON.parse`d and cast to `ServerMessage` — no schema check. The server is trusted, but a malformed broadcast could silently break the client. Lower priority because server is in-repo.
- **Fix (optional):** Mirror the Zod schema for server messages, fail soft with a console.warn on shape mismatch.

### H4. `useGameStateSnapshot` violates the Rules of Hooks (cosmetic but real)
- **File:** `client/src/host/host-client.tsx:99,146-149`
- **Status:** Already known. Rename to `getGameStateSnapshot` and remove the `import` placement at line 145 (imports below function bodies are legal but lint-hostile). Won't change behavior.

### H5. `LEAVE` mid-`ANSWER_LOCK` (R1/R3) leaves dangling `buzzedPlayerId`
- **File:** `server/src/reducer.ts:52-61`, `server/src/round-engine.ts:381-402`
- **Issue:** If the buzzer disconnects + grace expires during ANSWER_LOCK, `LEAVE` removes them from `state.players` but leaves `state.buzzedPlayerId` pointing at the dead id. `AnswerLockScreen` (line 15-16) does `players.find(...buzzedPlayerId)` → `undefined` → `return null`, blank screen until timer expires. Worse, `openSteal` (round-engine.ts:383) on `BUZZ_ANSWER_WINDOW` expiry will lock out the dead id; `lockedOutPlayerIds` accumulates phantoms across the question.
- **Fix:** In the `LEAVE` reducer, if `state.buzzedPlayerId === action.playerId`, clear `buzzedPlayerId` and (if phase is `ANSWER_LOCK`) call `openSteal` synthesized from the engine. Or simpler: scrub `buzzedPlayerId` and `lockedOutPlayerIds` of any IDs not in `players` whenever `players` shrinks.

### H6. `lobby-screen.tsx` join URL hard-codes port 3000
- **File:** `client/src/host/screens/lobby-screen.tsx:81-83`
- **Issue:** `joinUrl = `http://${lanIp}:3000/play?room=${state.roomCode}` — if the operator runs `PORT=8080`, the QR points at the wrong port and the LAN URL prints below it is also wrong.
- **Fix:** Use `location.port` (or fetch the actual port from `/api/server-info`). When `IS_PROD`, the host page is already served from the same Bun port, so `location.port` is correct.

### H7. `Bun.file('${DIST_DIR}${path}')` join is path-injection-safe but allows odd paths
- **File:** `server/src/index.ts:54-61`
- **Issue:** `path.includes("..")` rejects literal `..`, but does not normalize `/foo/./../etc`. `URL` parsing won't decode `%2E%2E` here because the URL was already parsed (`url.pathname` returns decoded percent-escapes). Spot-check: `new URL('http://x/%2e%2e/y').pathname` → `/../y` — and it would be blocked. OK. But `path = "//etc/passwd"` would resolve to `client/dist//etc/passwd`. Bun will read filesystem path `client/dist//etc/passwd` (no traversal up). Defensive but acceptable; consider `node:path.normalize` and a final `startsWith(DIST_DIR)` check.

---

## Medium Priority

### M1. `R2` `startedAt` calc is brittle
- **File:** `server/src/round-engine.ts:407` — `startedAt = (state.buzzWindowEndsAt ?? Date.now()) - R2_WINDOW_MS;`
- **Issue:** Assumes `buzzWindowEndsAt` was set exactly `R2_WINDOW_MS` ago. If `enterBuzzOpen` is ever called with a different window, calc breaks silently. Also, if event-loop lag pushes `Date.now() - startedAt > R2_WINDOW_MS`, score clamps to MIN — fine but masks the bug.
- **Fix:** Store `buzzWindowStartedAt` explicitly when entering `BUZZ_OPEN`, then `elapsed = ans.timestamp - state.buzzWindowStartedAt`.

### M2. Host detection conflates `deviceType: "phone"` with actual host
- **File:** `server/src/message-router.ts:38-39` — `CREATE_ROOM` sets host's `deviceType: "phone"` regardless of source.
- **Issue:** Lobby filters `state.players.filter((p) => p.deviceType === "phone")` (lobby-screen.tsx:78) — the host appears in the phone-players list. Cosmetic but confusing.
- **Fix:** Add `deviceType: "host"` (and update the Zod enum + filters), or filter out `state.hostId` from the phone list in the lobby.

### M3. `enterReveal` loses precise `buzzedAnswer` for steal-wrong path
- **File:** `server/src/round-engine.ts:367-378`
- **Issue:** On wrong steal, `buzzedPlayerId` and `buzzedAnswer` are recorded as the *stealer's* values. The original buzzer's wrong answer is lost — the reveal can't show "X buzzed and picked B (wrong); Y stole and picked C (wrong)." If you don't care, fine; if you do, store both.
- **Fix:** Add `originalBuzzerId/originalBuzzerAnswer` fields to `RevealResult` for steal scenarios.

### M4. `STATE_UPDATE` re-broadcast on every change is fine, but JSON-stringifying once and sending in a loop is good — already done. Confirming: `room.broadcast()` stringifies once. ✓

### M5. `R2` `handleAnswer` does not enforce that question phase has a current question
- **File:** `server/src/round-engine.ts:157-172`
- **Issue:** `state.currentQuestion` could be undefined if called from a weird state. `resolveSpeedRound` would call `getCurrentQuestion` which returns null → `return { state }`. Safe, but the answer was already recorded into `speedRoundAnswers`. Dead-data accumulation in odd phase.
- **Fix:** Early return if `getCurrentQuestion(state, rounds)` is null.

### M6. WebHID LED state divergence on dongle re-attach
- **File:** `client/src/hid/buzz-controller.ts:23` — `ledState` initialized to all-false on every controller construction.
- **Issue:** If the previous session left LEDs on (host crashed mid-game), the dongle hardware retains the LED state across page reload. Reconstructing with `ledState[i] = false` in software but no `flushLeds()` means the local state lies until something writes again.
- **Fix:** Call `clearAllLeds()` in `attach()` after open. Costs one HID write at boot, eliminates divergence.

### M7. `MediaPlayer` allows arbitrary `/`-rooted paths from pack JSON
- **File:** `shared/src/pack-types.ts:14-19`, `client/src/host/components/media-player.tsx:11-15`
- **Issue:** Zod `MediaSchema` blocks `..` but allows `src: "/api/server-info"` or `src: "/anything"`. `mediaUrl` returns it verbatim → `<img src="/anything">`. Pack JSONs are operator-controlled, so low risk, but a malicious pack could embed tracking pixels or leak via referer. Block leading `/` (or restrict to `/media/`) at the schema level.

### M8. AlphabetWheel relies on JS function hoisting inside `useEffect`
- **File:** `client/src/host/components/alphabet-wheel.tsx:23-50`
- **Issue:** `function handleButton` declared after `return`. Works (hoisted) but lint-hostile, and `letterIdx` captured in closure means stale reads after the next press if React batches. Currently safe because each press triggers the handler with the latest captured `letterIdx` (effect re-runs on `letterIdx` dep). But declaring `handleButton` after `return` is a code smell.
- **Fix:** Move `handleButton` above the `return` or inline it.

### M9. `gameSession.send(msg as never)` defeats type checking
- **File:** `client/src/state/game-session.ts:45`
- **Issue:** `as never` silences the mismatch between `ClientMessage` and `WSMessage`. They're shape-compatible, but `as never` is a type-safety smoke alarm.
- **Fix:** Make `WSClient.send` generic over `T` or accept `ClientMessage` directly (it already does in the typedef — line 60). Just call `this.ws?.send(msg)`.

---

## Suggestions (nice-to-have)

- `client/src/lib/ws-client.ts:37` — decode `e.data` once via `String()`; if server ever sends Blob (it won't from Bun) this would silently break. Add a `if (typeof e.data !== "string") return;` guard.
- `server/src/timer-manager.ts` — `name: string` allows typos. Use a `TimerName` literal type unified with `TimerEvent` from round-engine.
- `server/src/round-engine.ts:45-52` — `ALL_TIMERS` is duplicated from `TimerEvent`. `Object.keys` of a const map, or `satisfies readonly TimerEvent[]`, prevents drift.
- `client/src/audio/audio-manager.ts:77-78` — `setTimeout(() => prev.stop(prevId), fadeMs + 50)` not tracked; if a phase-change happens during a fade, multiple stops queue. Harmless but inelegant.
- `server/src/index.ts:9` — `Number(process.env.PORT ?? 3000)` returns `NaN` for non-numeric. Fail loudly: `Number.isFinite(port) || throw`.
- `client/src/router.ts:8` — `?debug=hid` route is publicly reachable in production. Gate it on `IS_PROD === false` or remove from the prod bundle.
- `client/src/host/screens/winner-screen.tsx:64` — `location.reload()` is a hard refresh; the room/state evaporates. If the host wants a real "play again", send a `RESET_GAME` message.
- `client/src/state/game-session.ts:115` — also clear stored on `GAME_IN_PROGRESS` (a stale stored playerId for a finished room will hit this, not PLAYER_NOT_FOUND).
- `server/src/room.ts:151-164` — when no sockets connected, `broadcast()` is a no-op iterating empty map. Fine. But the `JSON.stringify` still runs. Skip if `sockets.size === 0`.
- `client/src/host/components/qr-code.tsx:30` — `dangerouslySetInnerHTML` with `qrcode` library output is safe (the lib produces SVG, no untrusted text), but worth a comment explaining why it's not XSS.
- `shared/src/messages-zod.ts:8` — `emptyPayload = z.object({}).optional()` is fine but `.passthrough()` would reject only on truly invalid types; consider `.strict()` if you want to refuse unknown fields.
- `client/src/host/host-client.tsx:131` — `choice as 0|1|2|3` cast can be eliminated once H1 is fixed.

---

## Edge cases discovered while reading

- **R1/R3 `BUZZ_OPEN` host-skip transitions to REVEAL with no scoring** — confirmed working (round-engine.ts:111-114), but the host button label says "Skip Question" only for R1/R3 (host-controls.tsx:34). For R2, the host has no skip. If R2 stalls (network drop on every phone), only the timer can resolve it. Acceptable.
- **`SCOREBOARD` after round 3 → `enterFinalWager`** is the only path that sets `currentRound = 4` (via `enterFinalWager`). If a host somehow ends up in `REVEAL` of round 3 and clicks NEXT, `advanceFromIntroOrReveal` with `nextIndex >= list.length` and `currentRound === 3` falls into the `SCOREBOARD` branch, then second NEXT goes to `enterFinalWager`. Two clicks instead of one. Intentional pacing? — maybe, but worth a comment.
- **Final round can have 0 questions** if pack has < 9 questions (4×2 + 1). `enterFinalWager` handles this with `if (!q) phase: WINNER`. Empty `final` array is allowed by `RoundQuestions` interface. Good defense.
- **`isEmpty()` returns true only when both `players` and `sockets` are empty.** During disconnect grace, `players.length > 0` but `sockets.size` could be 0. GC won't prune. After RECONNECT_GRACE_MS the LEAVE reducer drops the player. Eventually garbage-collected. Fine.
- **No handling for `JSON.stringify` cycles** in state — none should occur (plain objects), but if `lastReveal` ever held something circular, broadcast would throw. `try/catch` around `ws.send` swallows it. Acceptable.

---

## Positive observations

- Zod schema on the server message boundary, with a path-traversal `.refine` on media `src` — exactly right.
- `currentQuestion: QuestionPublic` projection that strips `correct` is the right architectural call.
- `TimerManager` is small, focused, and correctly clears before re-scheduling — no timer leaks in the steady-state engine.
- `RECONNECT_GRACE_MS = 60_000` with auto-LEAVE on grace expiry — clean reconnect semantics.
- `paramsForRound()` + `computeR2Score()` keep all scoring math out of the engine — easy to unit-test.
- `room.broadcast()` stringifies once, sends N times — performant.
- `setLeds()`/`flushLeds()` consolidated into a single output report — avoids per-LED USB chatter.
- Server-authoritative timers + `buzzWindowEndsAt` epoch-ms for client UI countdowns — correct division of trust.
- `static file` SPA fallback only triggers for extension-less paths — prevents serving `index.html` as JS.
- `RoomRegistry` GC loop with `isEmpty()` check — no lingering rooms.

---

## Unresolved questions

1. Is the final-wager question text supposed to be visible to phones via state-broadcast, or only to the host? (Affects C3 fix scope.)
2. After a wrong steal, should phones see *both* the original wrong answer and the stealer's wrong answer in the reveal? (Affects M3.)
3. If the host disconnects and a buzz-player is auto-promoted to host (`reducer.ts:58`), how does that player drive the host UI from a phone? Or is host-handoff actually nonsensical and should be disabled?
4. Is the `?debug=hid` route intended to ship in production, or strip in vite build?
5. Final round currently runs *all* questions in `rounds.final` (up to 3). Is this intended, or should it be exactly one final?
