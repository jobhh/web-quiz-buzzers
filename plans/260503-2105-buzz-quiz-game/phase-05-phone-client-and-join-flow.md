# Phase 5 — Phone Client & Join Flow

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-04-question-pack-system.md](phase-04-question-pack-system.md)
- Next: [phase-06-setup-and-lobby-screens.md](phase-06-setup-and-lobby-screens.md)

## Overview
- **Priority**: P1 (one of two input modes)
- **Status**: pending
- **Effort**: ~3h
- Mobile-responsive phone client. Join via QR → name entry → big tap-to-buzz button + 4 answer buttons. Reconnect on socket drop. Prevent iOS double-tap zoom.

## Key Insights
- Same React app serves both host and phone — distinguished by URL path: `/host` vs `/play` (or `/?room=XXXX` triggers phone mode)
- Phone-specific concerns: viewport meta tag (no zoom, no double-tap), `touch-action: manipulation`, big touch targets (min 44px Apple HIG, we'll go bigger)
- iOS Safari: `100vh` is broken (excludes browser chrome). Use `100dvh` (dynamic viewport) or JS workaround
- Phones must reconnect cleanly — wifi can drop
- Network latency to phone ~50ms typical LAN — phone "buzz" has handicap vs hardware Buzz (~5ms). This is acknowledged design tradeoff; don't try to compensate (would feel wrong)
- QR code generated server-side (in lobby screen), embeds `http://<lan-ip>:3000/play?room=XXXX`

## Requirements
**Functional**
- URL `http://<lan-ip>:3000/play?room=XXXX` opens phone client
- Name entry screen → submit → joins room as `deviceType: 'phone'`
- Lobby waiting screen: shows "waiting for host to start"
- During gameplay, screen reflects current phase:
  - `BUZZ_OPEN` → giant red BUZZ button fills screen, tap → send `BUZZ` action
  - After locked: 4 answer buttons (A/B/C/D, big, color-coded matching Buzz colors yellow/green/orange/blue)
  - Speed round: same 4 answer buttons, no buzz step
  - Wager: numeric input + slider for portion of score
- Connection status pill in top-right (green = connected, yellow = reconnecting, red = lost)
- Persist `playerId` in localStorage; reconnect resumes seamlessly

**Non-functional**
- Buzz tap → server receives within 80ms on LAN wifi
- Works on iOS Safari 14+ and Chrome Android 90+
- No double-tap zoom, no scroll, no pull-to-refresh interfering
- Touch target ≥ 60px

## Architecture

- New routes (use Wouter or simple manual router via `URLSearchParams`/`window.location.pathname`):
  - `/` (host root, redirects to `/host`)
  - `/host` (host screens — built in phase 6/8)
  - `/play?room=XXXX` (phone client)
- Phone client is its own component tree: `<PhoneClient />` reads game state from same `gameStore`, renders phone-appropriate screen per `state.phase`
- All UI components reuse from phase 9 visual style system

## Related Code Files

**Create**
- `client/src/router.ts` — minimal route resolution (no react-router needed for 3 routes)
- `client/src/phone/PhoneClient.tsx` — root phone component, switches subscreens by phase
- `client/src/phone/screens/JoinScreen.tsx` — name entry
- `client/src/phone/screens/WaitingScreen.tsx` — lobby/intermission
- `client/src/phone/screens/BuzzScreen.tsx` — full-screen buzz button
- `client/src/phone/screens/AnswerScreen.tsx` — 4-button answer pad (used by speed + locked-in answer)
- `client/src/phone/screens/WagerScreen.tsx` — wager input
- `client/src/phone/components/ConnectionPill.tsx` — top-right status indicator
- `client/src/phone/use-prevent-zoom.ts` — hook adding `touch-action`, `user-scalable=no` meta, and event listeners
- `client/src/phone/phone-styles.css` — small mobile-specific tweaks

**Modify**
- `client/index.html` — add viewport meta `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover`
- `client/src/App.tsx` — route to `<PhoneClient />` if `pathname === '/play'`
- `client/src/lib/ws-client.ts` — confirm reconnect-with-playerId logic works for phone

## Implementation Steps
1. Update `client/index.html` viewport meta + add `apple-mobile-web-app-capable` for iOS standalone-mode niceties
2. Create `client/src/router.ts`: `getCurrentRoute() => 'host' | 'phone' | 'home'` based on pathname/query
3. Create `client/src/phone/use-prevent-zoom.ts`: useEffect that prevents `gesturestart`, double-tap zoom (track `touchend` timestamps and `preventDefault` if <300ms apart on same target)
4. Create `client/src/phone/components/ConnectionPill.tsx`: subscribes to ws-client connection state, shows pill
5. Create `client/src/phone/screens/JoinScreen.tsx`: form with name input (max 20 chars), submit → `wsClient.send({ type: 'JOIN_ROOM', payload: { roomCode, playerName, deviceType: 'phone' } })`. On JOIN_ACK, store playerId in localStorage.
6. Create `WaitingScreen.tsx`: shows "Waiting for host to start..." + list of players in room
7. Create `BuzzScreen.tsx`: full-screen button, `position: fixed; inset: 0`. On tap → send BUZZ. Disable after first tap (prevent double-fire). Show locked-out state visually if player is in `lockedOutPlayerIds`.
8. Create `AnswerScreen.tsx`: 2x2 grid of large color-coded buttons matching Buzz colors. On tap → send ANSWER. Show locked-in state after submit.
9. Create `WagerScreen.tsx`: shows current score, slider 0-100% of score, confirm button → send WAGER
10. Create `PhoneClient.tsx`: subscribes to gameStore, switches subscreen based on `state.phase` and player's role state (e.g., if player is `buzzedPlayerId`, show "answer locked, waiting for host" screen)
11. Add `client/src/phone/phone-styles.css` with `body { overscroll-behavior: none; touch-action: manipulation; }` and `.phone-fullscreen { height: 100dvh; height: 100vh; }`
12. Wire route in `App.tsx`: if route is `phone`, render `<PhoneClient />`
13. Test on actual iOS Safari (or DevTools mobile emulation): no zoom, no scroll, buzz button is responsive
14. Test reconnect: kill wifi briefly, reconnect, confirm same player slot reclaimed

## Todo List
- [ ] Update index.html viewport meta
- [ ] Build minimal router
- [ ] Build prevent-zoom hook
- [ ] Build ConnectionPill component
- [ ] Build JoinScreen
- [ ] Build WaitingScreen
- [ ] Build BuzzScreen (full-screen tap target)
- [ ] Build AnswerScreen (color-coded 2x2 grid)
- [ ] Build WagerScreen (slider + confirm)
- [ ] Build PhoneClient root component (phase routing)
- [ ] Add phone-styles.css
- [ ] Wire `/play` route
- [ ] Test on iOS Safari
- [ ] Test on Chrome Android
- [ ] Test wifi-drop reconnect

## Success Criteria
- Visiting `http://<lan-ip>:3000/play?room=XXXX` on phone shows join screen
- After joining, phone updates in real-time as host advances game phases
- Buzz button covers >80% of viewport, latency <80ms tap-to-server on LAN
- iOS double-tap doesn't zoom; no scroll bars
- Wifi drop + reconnect preserves player identity

## Risk Assessment
- **R**: iOS Safari `100vh` viewport bug → **M**: use `100dvh` with `100vh` fallback; tested on iPhone in step 13
- **R**: Touch event lag on older Android → **M**: pointer events + `touch-action: manipulation` should suffice; if sluggish, debug with DevTools remote
- **R**: Phone player rage-buzzes → server rate-limit BUZZ to one per BUZZ_OPEN window (already enforced by phase logic)

## Security Considerations
- Sanitize displayed player names (XSS) — use React's auto-escaping (don't use `dangerouslySetInnerHTML`)
- Limit name length server-side too (Zod max 20)
- LocalStorage `playerId` is per-origin per-device — fine for LAN context

## Next Steps
- Phase 6 (lobby) renders QR code pointing to `/play?room=XXXX`
- Phase 8 (screens) refines transitions; phone screens follow same animation patterns
