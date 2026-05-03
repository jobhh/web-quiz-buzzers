# Phase 1 Code Review — Foundation & Tooling

**Verdict:** Solid minimal scaffold. Two real bugs (UI state stale on disconnect, JSON.parse null crash) and one path-traversal smell to fix before phase 2; everything else is polish.

## Scores (1-10)

| Dimension     | Score | Notes |
|---------------|-------|-------|
| Code quality  | 8     | Clean, small files, no premature abstraction. |
| KISS / YAGNI  | 9     | No speculative layers. WSClient is the only abstraction and it earns its keep. |
| Security      | 6     | LAN-only context excuses a lot, but path-traversal in `handleHttp` and `null`-after-parse should be hardened. |
| Type safety   | 8     | Discriminated union is correct. One forced `as { type: string }` cast is acceptable. `data: undefined` upgrade workaround is the right tradeoff. |

---

## Critical Issues (fix before Phase 2)

### C1. `routeMessage` crashes on `JSON.parse("null")` / non-object payloads
**File:** `server/src/websocket-handler.ts:11-17`

`JSON.parse` accepts `"null"`, `"42"`, `'"hi"'`, `"[]"` — all valid JSON, none are objects. `routeMessage(ws, null)` then reads `msg.type` and throws an uncaught exception inside the WS message handler. Bun will tear down that socket; depending on framing this is a trivial DoS vector even on LAN.

**Fix:** after `JSON.parse`, guard:
```ts
if (typeof msg !== "object" || msg === null || typeof (msg as any).type !== "string") {
  console.warn("[ws] dropping non-message payload");
  return;
}
```
Then the existing exhaustive switch holds.

### C2. Path traversal / SPA fallback in `handleHttp`
**File:** `server/src/index.ts:31-35`

`Bun.file(\`${DIST_DIR}${url.pathname}\`)` concatenates a user-controlled string to a base directory. `new URL` normalizes most `..` segments, but URL-encoded variants (`%2e%2e%2f`) and edge cases (Windows paths, NUL bytes) can slip through depending on Bun's `Bun.file` resolution semantics. Even on LAN this is the kind of thing that ages badly when the project later gets exposed via a tunnel/preview.

**Fix:** keep it KISS — reject anything that isn't an alphanumeric/`-_./` asset path, and reject `..`:
```ts
if (path.includes("..") || path.includes("\0")) {
  return new Response("bad path", { status: 400 });
}
```
Also: the SPA fallback returns `index.html` with status 200 for *any* missing path — including `/assets/missing.js`. Asset misses should be 404 (browsers caching `text/html` as JS is a familiar foot-gun). Cheap fix:
```ts
if (path.startsWith("/assets/")) return new Response("not found", { status: 404 });
```

### C3. `App.tsx` never resets `connected` on disconnect; `WSClient` never closed on unmount
**File:** `client/src/App.tsx:10-33`

Two related bugs:
1. Once a PONG arrives, `connected` is `true` forever. Pull the network cable: UI lies. Either listen for an explicit `disconnected` event from `WSClient` (cleanest — add an `onStatusChange` callback or watch `readyState` periodically), or set `connected = false` if no PONG within e.g. 5s.
2. The cleanup function does `off()` (handler unsubscribe) but never `client.close()`. Under `React.StrictMode` the effect runs twice in dev, leaving an orphaned `WSClient` whose internal reconnect chain keeps running indefinitely. Add `client.close()` to the cleanup.

```ts
return () => {
  off();
  clearTimeout(seed);
  clearInterval(interval);
  client.close();   // <-- missing
};
```

---

## Suggestions (non-blocking)

### S1. WSClient: stale-timer / stacked-socket race
**File:** `client/src/lib/ws-client.ts:36-46`

`close` handler schedules `setTimeout(() => this.connect(), delay)`. If `close()` is called by the user *between* schedule and fire, `closedByUser` is set — but the timer still runs and calls `connect()`, which clears `closedByUser` (`this.closedByUser = false` on line 21). Net effect: explicit `close()` followed quickly by a stale reconnect timer reopens the socket against user intent.

**Fix:** track and clear the timer:
```ts
private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
// in close handler:
this.reconnectTimer = setTimeout(...);
// in close():
if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
this.reconnectTimer = null;
```
Also guard `connect()` with `if (this.closedByUser) return;` at the top.

### S2. WSClient: no jitter, no max-attempt cap
1s → 2s → 4s … 30s is fine for one client. With 16 phones reconnecting after a server restart, they all retry in lockstep. Add ±25% jitter:
```ts
const delay = this.reconnectDelayMs * (0.75 + Math.random() * 0.5);
```
Not worth doing now; flag for phase 5 (phone client).

### S3. `Number(process.env.PORT ?? 3000)` produces NaN on garbage input
**File:** `server/src/index.ts:4`

If someone exports `PORT=""` or `PORT=abc`, you bind to NaN. Bun.serve will pick a random port and the boot log already shows `server.port ?? PORT` — so the displayed port is correct, but a typo silently disables the expected port. Validate or use `Number.isInteger`.

### S4. `pingsSent` increments even when WS is not OPEN
**File:** `client/src/App.tsx:24-27`

`client.send` silently no-ops if not OPEN, but `setPingsSent((n) => n + 1)` still runs. Counter overstates traffic during outage. Either move increment into a `WSClient.send` return value (`send(): boolean`), or only increment on PONG receipt. Cosmetic, but you'll trip on it during phase 2 hardware testing.

### S5. `websocketHandler.open` ignores `ws` param
**File:** `server/src/websocket-handler.ts:5`

Not an error (no `noUnusedParameters`), but rename to `_ws` for intent. Trivial.

### S6. `server.upgrade(req, { data: undefined })` workaround
You called this out — agreed it's the cleanest fix. Alternatives all worse:
- `as Parameters<typeof server.upgrade>[1]` — adds noise.
- Module augmentation of `@types/bun` — too much for phase 1.
- Skip the second arg with `as any` — strictly worse.
Keep `{ data: undefined }`. Add a one-line comment so the next reader doesn't "fix" it:
```ts
// @types/bun marks `data` required; pass undefined to satisfy it. Real per-socket data lands in phase 3.
```

### S7. Vite alias missing `@server`
**File:** `vite.config.ts:8-13`

`tsconfig.json` declares `@server/*` but vite config omits it. Today the client never imports from `@server` so it works, but a stray import will compile under `tsc` and explode at bundle time. Either remove `@server` from tsconfig paths (client should never reach into server), or add a runtime alias that fails loudly. Recommend removing `@server` from the **client** tsconfig (`tsconfig.client.json` doesn't extend paths anyway since they're inherited — narrow them).

### S8. No max WS payload limit
Bun's default per-message limit is large. For phase 1 fine; when phase 4 introduces question-pack uploads or phase 7 buzzer floods, set `maxPayloadLength` on `Bun.serve({ websocket: { ... } })`. Note for later.

---

## Positive Observations

- File sizes well under the 200-line guideline; modules have one clear job.
- Discriminated-union message type with exhaustive switch is exactly right.
- `WSClient` is genuinely minimal — no event-emitter library, no RxJS, no schema validator. Earns its keep.
- TS strict mode + `isolatedModules` + bundler resolution: correct modern setup.
- Reconnect backoff resets on `open`, not on `connect()` call — the right place.
- `.gitignore` covers `.env*`, `dist`, IDE dirs. Good.
- `getLanIps()` is the right amount of code; no `address`/`ip` dependency.
- Tailwind config scoped to `client/` only — no accidental scanning of `server/`.

---

## Unresolved Questions

1. Is the SPA fallback intended to mask asset 404s, or is that an oversight? (See C2.)
2. Phase 5 will introduce per-socket `data` (player id, room id). When that happens, the `data: undefined` workaround will be replaced naturally — confirm the plan still expects this in phase 3, not phase 5.
3. Should `WSClient` expose connection state (`onStatusChange`) now, or wait until phase 5 when the phone client genuinely needs reconnect UX? Current scaffold needs it for C3.1; minimal version: a second handler set for status events.
