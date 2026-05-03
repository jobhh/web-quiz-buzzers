# Phase 6 — Setup & Lobby Screens

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-05-phone-client-and-join-flow.md](phase-05-phone-client-and-join-flow.md)
- Next: [phase-07-round-mechanics.md](phase-07-round-mechanics.md)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: ~3h
- Host-side setup screen: detect Buzz dongle (button to grant WebHID), claim-a-slot interaction, name entry per buzz player, pack selection, "Start Game".

## Key Insights
- Buzz players have NO touchscreen — name entry needs alternative input
- Two name-entry options: (a) on-screen virtual keyboard navigated with the 4 colored buttons, (b) "send a phone to enter your name then sync to your buzz pad"
- **Decision**: ship option (a) for KISS — simple alphabet wheel: Y=prev letter, G=next letter, O=add letter, B=submit, RED=delete. ~30 seconds per name, fine for party setup.
- Claim flow: any unclaimed pad's button press triggers "claim slot" — LED lights up, name entry begins for that pad
- Pack selector: dropdown / list of loaded packs, default to first
- Phone players also visible in lobby with their entered names
- "Start Game" button enabled when ≥2 players claimed (combined buzz + phone) and a pack is selected

## Requirements
**Functional**
- Initial host screen: "Connect Buzz Dongle" button → calls `BuzzManager.requestDongle()`
- Once dongle connected, show 4 controller slots per dongle (with colored borders matching pad colors physically)
- Pressing big-red on any unclaimed slot → enters name entry mode for that slot, lights LED
- Name entry uses alphabet wheel (alphabet + space + backspace), driven by colored buttons
- Phone players appear automatically in their own list (joining via QR/URL)
- QR code displayed prominently with text "Scan to play on phone"
- Pack dropdown lists all loaded packs by name + description
- "Start Game" button enabled per logic above; clicking sends `START_GAME` action

**Non-functional**
- Lobby screen looks like an arcade attract screen (animated bg, neon)
- Name entry must be readable from across a room (large letters)

## Architecture

### Slot states
```
UNCLAIMED → (big-red press) → NAMING → (B button submit) → CLAIMED
                                  ↑________________________________|
                                       (RED button = leave/reset)
```

### Buzz event handling on host
- `BuzzManager` events captured by lobby screen
- Single press dispatched into one of: claim-slot OR name-entry-input OR ignore (if game running)

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  BUZZ NIGHT                              ROOM: XKQF       │
│                                                            │
│  ┌─Buzz Players─────────┐    ┌─Phone Players───┐          │
│  │ [Y][G][O][B] (dongle1)│    │ 📱 Alice        │          │
│  │  ▢   ▢   ▢   ▢       │    │ 📱 Bob          │          │
│  │  Alice Bob ?   ?      │    └──────────────────┘          │
│  │ [Y][G][O][B] (dongle2)│                                 │
│  └────────────────────────┘   ┌─QR──────────┐              │
│                                 │ ▣▣▣▣▣ scan │              │
│  Pack: [Trivia ▼]             └──────────────┘              │
│                                                            │
│              [ START GAME ]                                │
└──────────────────────────────────────────────────────────┘
```

## Related Code Files

**Create**
- `client/src/host/HostClient.tsx` — root for `/host` route
- `client/src/host/screens/SetupScreen.tsx` — pre-lobby: connect dongle, scan instructions
- `client/src/host/screens/LobbyScreen.tsx` — main lobby with pad slots + phone list + QR + pack picker
- `client/src/host/components/BuzzPadSlot.tsx` — single slot (controller cell): unclaimed/naming/claimed states
- `client/src/host/components/AlphabetWheel.tsx` — letter selector driven by buzz events
- `client/src/host/components/QrCode.tsx` — wraps `qrcode` lib, renders SVG
- `client/src/host/components/PackPicker.tsx` — dropdown
- `client/src/host/lobby-controller.ts` — translates buzz events → state actions for lobby
- `server/src/api/packs.ts` — `GET /api/packs` returns list of available packs
- `server/src/api/qr.ts` — `GET /api/qr?room=XXXX` returns SVG QR (or do client-side with `qrcode` npm)

**Modify**
- `client/src/App.tsx` — route `/host` → `<HostClient />`
- `package.json` — add `qrcode`
- `server/src/reducer.ts` — add `CLAIM_SLOT` action `{ dongleId, slotIndex, playerName }`

## Implementation Steps
1. Install `qrcode`: `bun add qrcode @types/qrcode`
2. Create `server/src/api/packs.ts` returning `[{ id, name, description }]`. Wire into `Bun.serve` fetch handler.
3. Create `client/src/host/HostClient.tsx`: routes between SetupScreen (no dongle yet) → LobbyScreen (≥1 dongle). Auto-creates room on mount via WS `CREATE_ROOM`.
4. Create `SetupScreen.tsx`: big "Connect Buzz Dongle" button → `BuzzManager.requestDongle()`. After 1+ dongle attached, advance to LobbyScreen. Show "WebHID not supported" message in non-Chromium browsers.
5. Create `BuzzPadSlot.tsx`: shows colored frame matching pad position, displays state (UNCLAIMED ⓘ, NAMING with current letters, CLAIMED with name). LED control via prop.
6. Create `AlphabetWheel.tsx`: shows current alphabet position (large highlighted letter, smaller adjacent letters). Props: `onLetterAdd(c)`, `onSubmit()`, `onBackspace()`. Renders text accumulating below.
7. Create `lobby-controller.ts`: subscribes to `BuzzManager` events. State machine per slot. On big-red press of UNCLAIMED slot → set NAMING + light LED + create AlphabetWheel for that slot. On colored button press during NAMING → wheel actions (Y=prev, G=next, O=add, B=submit, RED=delete).
8. Create `QrCode.tsx`: receives URL string, calls `qrcode.toString(url, { type: 'svg' })`, renders inline SVG. URL format: `http://<lan-ip>:3000/play?room=XXXX`. (LAN IP comes from server via initial state — server detects on boot, includes in STATE_UPDATE.)
9. Create `PackPicker.tsx`: fetches `/api/packs`, dropdown, current selection stored in local state, on submit included in START_GAME action
10. Wire all into `LobbyScreen.tsx`. Display claimed buzz players in slot grid + phone players in side list. "Start Game" button bottom, disabled until prerequisites met.
11. Add `CLAIM_SLOT` reducer action: creates a new Player with `deviceType: 'buzz'`, `buzzBinding: { dongleId, slotIndex }`. Server tracks this so future BUZZ events from this binding map to this player.
12. Test end-to-end: connect dongle → claim 4 slots → enter names → 2 phones join → pick pack → start game (which transitions to phase 7 round 1 intro)

## Todo List
- [ ] Install qrcode dep
- [ ] Add `/api/packs` endpoint
- [ ] Build HostClient root + auto-create-room
- [ ] Build SetupScreen with WebHID gating
- [ ] Build BuzzPadSlot component (3 visual states)
- [ ] Build AlphabetWheel name-entry control
- [ ] Build QrCode component
- [ ] Build PackPicker
- [ ] Build lobby-controller event router
- [ ] Build LobbyScreen layout
- [ ] Add CLAIM_SLOT reducer action + binding map
- [ ] Pass LAN IP from server in initial state
- [ ] End-to-end manual test

## Success Criteria
- Host opens `/host`, clicks "Connect Buzz Dongle", picks dongle in WebHID dialog → lobby appears
- Pressing big-red on slot 0 lights LED, opens alphabet wheel
- Entering name "GG" via wheel + submit → slot becomes CLAIMED, name shows
- Phone player joins via QR → appears in phone list
- Selecting pack + clicking Start Game → screen transitions out of lobby (phase 7 picks up)

## Risk Assessment
- **R**: Alphabet wheel feels slow → **M**: skip-by-5 if user holds button (later if needed); for first version, single-step is fine for party mood
- **R**: WebHID denied in browser → **M**: clear fallback UI saying "Buzz support requires Chrome/Edge"
- **R**: LAN IP detection picks wrong interface (e.g., VPN) → **M**: server logs all candidate IPs at boot, host can override via env var if needed (`HOST_IP=192.168.1.42 bun run dev`)

## Security Considerations
- Sanitize entered names (length cap, allow only printable chars)
- `/api/packs` is unauthenticated but only returns pack metadata (no question content) — fine
- LAN IP exposure: this is the explicit goal; document in README

## Next Steps
- Phase 7 (round mechanics) takes over after START_GAME
- Phase 8 (screens) refines visual transitions out of lobby
