# Phase 11 — Polish & Testing

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-10-audio-system.md](phase-10-audio-system.md)

## Overview
- **Priority**: P1 (ship-readiness)
- **Status**: pending
- **Effort**: ~4h
- End-to-end manual test plan, multi-controller stress test, mobile responsiveness QA, edge case handling, README, packaging scripts.

## Key Insights
- This phase is QA + docs + final polish, NOT new features
- Catch bugs from prior phases now: edge cases that don't surface in single-player local tests
- Real party stress: 8 players, 16 phones, dropped wifi, unplugged dongle
- Documentation is a feature — bad README = nobody plays

## Requirements

### Manual test plan checklist (must pass all)
1. **Cold start**: `bun run dev` → host opens `/host`, sees "connect dongle" → connects → lobby
2. **Single player**: 1 buzz player + 1 phone, full game R1-R3-Final, no errors
3. **Max load**: 8 buzz (2 dongles) + 8 phones, full game, all scores tracked
4. **Simultaneous buzz**: 4 players smash buzzers within 5ms — first one (per server timestamp) wins, others see "X got there first"
5. **Steal mechanic**: player A buzzes wrong, player B steals correct → +50% to B, -100 to A
6. **Speed round timing**: player answers at t=0 → 100pts, at t=5s → ~50pts, at t=10s (window expired) → 0pts
7. **Disconnect mid-question**: phone player closes tab during BUZZ_OPEN → game continues, player marked disconnected, reconnect within 60s reclaims slot
8. **Dongle unplug mid-game**: USB unplugged → game continues with phone players, host gets warning "Buzz dongle disconnected"
9. **Wifi drop**: phone wifi disabled briefly → reconnect, score preserved
10. **iOS Safari**: phone client works on iOS 14+ Safari (test in real device or BrowserStack)
11. **Chrome Android**: phone client works on recent Chrome Android
12. **Background tab**: phone tab backgrounded mid-game → comes back, state syncs correctly (resync via WS reconnect)
13. **Pack switch**: end game, return to lobby, pick different pack, start new game — no leftover state
14. **Two simultaneous rooms**: open 2 host tabs (rare but possible) — independent rooms with different codes work without bleeding

### Edge cases (test + handle gracefully)
- Empty pack (0 questions) — pack loader rejects, won't appear in dropdown
- All players answer simultaneously in speed round — all timestamps recorded, no race
- Player buzzes during ANSWER_LOCK (after first buzz already accepted) — server rejects, no state change
- Final wager > current score — server clamps to score
- WebHID denied/unavailable — host can still run phone-only game

### README sections
- Title + tagline + screenshot
- Quick start (3 steps)
- Requirements (Bun, Chrome/Edge for host, plus Buzz dongle)
- How to run
- Controllers explained (Buzz layout, phone QR)
- Adding custom packs
- Adding custom audio
- Settings panel options
- Troubleshooting (WebHID, audio autoplay, LAN IP detection)
- Credits (audio source — Pixabay)

## Architecture
- No new architecture — this is polish on existing
- Add minimal `tests/e2e/` directory for any scripted Playwright tests if time allows (stretch)

## Related Code Files

**Create**
- `README.md` — full README replacing phase-1 stub
- `docs/setup.md` — detailed setup guide (linked from README)
- `docs/pack-authoring.md` — how to write a custom pack JSON
- `docs/codebase-summary.md` — for future maintainers
- `docs/system-architecture.md` — sequence diagram of WS protocol + state machine
- `docs/development-roadmap.md` — current state + future ideas (per orchestration rule)
- `docs/project-changelog.md` — initial entry "v1.0.0 — initial release"
- `tests/e2e/full-game.test.ts` — (stretch) Playwright script that simulates a full game

**Modify**
- `package.json` — add `start` script (`NODE_ENV=production bun server/src/index.ts`), update `description`, `keywords`, `version: 1.0.0`
- `server/src/index.ts` — better startup banner with ASCII art + LAN URL printed in cyan

## Implementation Steps
1. Run through full manual test plan; log all bugs found
2. Fix all P1 bugs (game-breaking) and P2 bugs (UX-bad)
3. Add disconnect/reconnect resilience checks where missing (e.g., 60s grace timer for mid-game disconnect)
4. Add dongle-unplug detection: WebHID `disconnect` event → `BuzzManager` removes controller, host UI shows toast
5. Add settings panel UI (small gear button in host) exposing scanlines toggle, music/sfx volumes, reduced-motion toggle
6. Write `README.md` per spec
7. Write `docs/pack-authoring.md` with full schema example + tips for media
8. Write `docs/setup.md` with platform-specific notes (Linux udev rules for HID, Windows driver, macOS permissions)
9. Write `docs/codebase-summary.md` (high-level dir tree + which file does what)
10. Write `docs/system-architecture.md` with one sequence diagram (WS message flow during a buzz)
11. Polish startup banner: server logs ASCII "BUZZ NIGHT" + room URL on boot
12. (Stretch) Write Playwright e2e script automating a full game with 2 phones, run as `bun test:e2e`
13. Final regression run of test plan
14. Tag v1.0.0 in package.json, write changelog entry

## Todo List
- [ ] Run full manual test plan, log bugs
- [ ] Fix P1 + P2 bugs
- [ ] Add 60s disconnect grace timer
- [ ] Add dongle-unplug detection + toast
- [ ] Build settings panel UI
- [ ] Write README.md
- [ ] Write docs/pack-authoring.md
- [ ] Write docs/setup.md (per-OS notes)
- [ ] Write docs/codebase-summary.md
- [ ] Write docs/system-architecture.md (with sequence diagram)
- [ ] Polish server startup banner
- [ ] (Stretch) Playwright e2e script
- [ ] Final regression run
- [ ] Tag v1.0.0 + changelog

## Success Criteria
- All 14 manual test cases pass
- All edge cases handled without crashes
- README enables a fresh user to set up and play within 5 min
- 8 buzz + 8 phone stress test runs through full game without dropping events or de-syncing
- Mobile QA on iOS Safari + Chrome Android passes
- Project builds + starts cleanly via `bun run start`

## Risk Assessment
- **R**: Real-device iOS testing requires hardware → **M**: use BrowserStack or Xcode simulator if no iPhone available
- **R**: Two-dongle stress test reveals bit layout assumption was wrong for second dongle → **M**: verify in step 1; both dongles use same VID/PID + report format, should be identical
- **R**: Audio autoplay policy edge case on iOS Safari → **M**: ensure unlock() fires on every meaningful user gesture; document in README troubleshooting
- **R**: LAN IP detection picks Docker bridge IP on dev machine → **M**: log all interfaces, allow `HOST_IP=...` env var override

## Security Considerations
- Final security review: ensure no internal state leaked in WS broadcasts (e.g., correct answer index never sent before REVEAL)
- README explicitly states LAN-only intended use; no public internet hosting recommended
- Document that anyone on local network can join room with code (party game; intentional)

## Next Steps
- Ship v1.0.0
- Post-launch: gather playtest feedback, plan v1.1 (more pack authoring tools, custom themes, replay export)
