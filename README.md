# Buzz Quiz

LAN-only Jackbox-style quiz party game with PlayStation Buzz controllers + phones. Retro neon gameshow aesthetic.

## Status

Phase 1 of 11 (foundation) — see `plans/260503-2105-buzz-quiz-game/plan.md`. Full README lands in phase 11.

## Quickstart (dev)

```bash
bun install
bun run dev
# open http://localhost:5173
```

The Bun WS server runs on :3000; Vite serves the client on :5173 and proxies `/ws` to Bun.

## Layout

- `server/` — Bun WS + room/game state (phases 1, 3)
- `client/` — Vite + React frontend, host & phone routes (phases 1, 5, 6, 8)
- `shared/` — TS types shared between server and client (phases 1, 3)
- `packs/` — JSON question packs (phase 4)
- `public/` — static assets: audio, media, fonts (phase 10)
- `plans/` — implementation plan + phase docs
- `docs/` — project docs (filled later)
