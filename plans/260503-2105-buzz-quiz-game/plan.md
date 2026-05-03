---
title: "Buzz Quiz Game — Local LAN Jackbox-style party game"
description: "Self-hosted Bun+React quiz game with PlayStation Buzz controllers + phones, neon retro aesthetic, mixed round formats."
status: pending
priority: P2
effort: ~40h
branch: main
tags: [game, websockets, webhid, react, bun, party-game]
created: 2026-05-03
---

# Buzz Quiz Game

## Mission

Build a self-hosted, LAN-only Jackbox-style quiz party game. Host runs Bun server on their PC, plugs in PlayStation Buzz USB dongle(s), opens host browser tab. Players join via QR/phone OR claim a Buzz controller. Mixed round formats (classic buzz-in, speed, picture/audio, wager). Retro neon gameshow aesthetic, full audio/visual polish.

## Locked Design (do NOT relitigate)

- **Stack**: Bun (server + WS), Vite + React 18 + TS, Tailwind, Framer Motion, Howler, canvas-confetti, Zod for runtime validation
- **Architecture**: Server-authoritative state; clients send actions, receive state diffs via WS. Buzz HID handled in host browser tab via WebHID API
- **Buzz HID**: VID 0x054C / PID 0x0002. 6-byte input report (state diff required for simultaneous presses). 8-byte output report for LEDs
- **Rounds**: R1 classic buzz-in (lock+steal), R2 speed (simultaneous + time-weighted), R3 picture/audio (classic mech, 200pt), Final wager
- **Player cap**: 8 buzz (2 dongles) + phones, hard cap 16 total
- **Aesthetic**: Hot pink #FF006E, cyan #00F5FF, gold #FFD700, black bg. Bungee + Space Grotesk fonts. Scanlines, glow, screen shake, confetti
- **Pack format**: JSON files in `/packs/`, schema with media support (image/audio)
- **No auth**: LAN-only, room code suffices

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Foundation & Tooling](phase-01-foundation-and-tooling.md) | ✓ completed | ~3h |
| 2 | [WebHID Buzz Controller Layer](phase-02-webhid-buzz-controller-layer.md) | ☐ pending | ~4h |
| 3 | [Game State Server & Rooms](phase-03-game-state-server-and-rooms.md) | ☐ pending | ~4h |
| 4 | [Question Pack System](phase-04-question-pack-system.md) | ☐ pending | ~3h |
| 5 | [Phone Client & Join Flow](phase-05-phone-client-and-join-flow.md) | ☐ pending | ~3h |
| 6 | [Setup & Lobby Screens](phase-06-setup-and-lobby-screens.md) | ☐ pending | ~3h |
| 7 | [Round Mechanics](phase-07-round-mechanics.md) | ☐ pending | ~5h |
| 8 | [Game Screens & Flow](phase-08-game-screens-and-flow.md) | ☐ pending | ~5h |
| 9 | [Visual Style System](phase-09-visual-style-system.md) | ☐ pending | ~3h |
| 10 | [Audio System](phase-10-audio-system.md) | ☐ pending | ~3h |
| 11 | [Polish & Testing](phase-11-polish-and-testing.md) | ☐ pending | ~4h |

## Key Dependencies

- Phase 1 unblocks all others
- Phase 3 (server state) blocks 5, 6, 7, 8
- Phase 2 (HID) blocks 6 (claim controller in lobby)
- Phase 4 (packs) blocks 6, 7
- Phase 7 (round mechanics) blocks 8 (screens consume state)
- Phase 9 + 10 are largely independent — can run parallel mid-build
- Phase 11 last (requires all others)

## Success Criteria

- Host runs `bun run dev`, sees LAN URL + room code, opens host tab in Chrome
- Up to 8 Buzz players claim slots via physical buzzer press; controllers' LEDs confirm
- Up to N phone players scan QR, enter name, see big buzz button
- Game runs through all 4 round types end-to-end with correct scoring
- Audio + visuals match neon gameshow aesthetic, animations hit 60fps
- 2 sample packs ship and load without errors
- Manual test plan in phase-11 passes
- README explains setup in <5 steps

## Repo Layout (target)

```
/server         Bun server (WS, room mgmt, pack loader)
/client         Vite + React frontend (host + phone share build)
/shared         TS types + game logic shared between server/client
/packs          JSON question packs
/public         Static assets (fonts, audio sprites, media)
/plans          This planning artifacts dir
/docs           Project docs (created in phase 1)
```

## Out of Scope (YAGNI)

- Internet hosting / cloud deployment
- User accounts / persistent profiles
- In-app pack editor (edit JSON files directly)
- Spectator mode
- Replay / recording
- Mobile app native shells
- i18n
