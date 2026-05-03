# Phase 1 — Foundation & Tooling

## Context Links
- Plan: [plan.md](plan.md)
- Next: [phase-02-webhid-buzz-controller-layer.md](phase-02-webhid-buzz-controller-layer.md)

## Overview
- **Priority**: P1 (blocks everything)
- **Status**: completed
- **Effort**: ~3h
- Set up greenfield repo: Bun + Vite + React 18 + TS + Tailwind, monorepo-ish dirs (`/server`, `/client`, `/shared`, `/packs`, `/public`), dev/build scripts, hello-world WS round-trip.

## Key Insights
- Bun ships built-in `Bun.serve` with native WebSocket — no `ws` lib needed
- Vite builds the client; Bun serves the dist/ + WS endpoint on same port (3000)
- Shared TS types live in `/shared`, imported by both server and client via path alias
- Use `tsconfig` paths + Vite alias for `@shared/*`, `@server/*`, `@client/*`
- Tailwind v3 (stable, well-supported); JIT mode default

## Requirements
**Functional**
- `bun run dev` → starts Bun server with HMR-served Vite client at `http://localhost:3000`
- `bun run build` → production bundle to `client/dist/`
- `bun run start` → serves built client + WS in production mode
- Hello-world: client connects to WS, sends `{type:"PING"}`, server replies `{type:"PONG"}`, client logs

**Non-functional**
- Cold start <2s
- Single-port deployment (3000)
- No global pip / global npm; all deps in package.json

## Architecture
- `Bun.serve({ port: 3000, fetch, websocket })` handles both static HTTP and WS upgrade
- In dev: Vite runs as subprocess on 5173, Bun proxies non-WS HTTP to it; OR run Vite directly and Bun only on 3000 for WS — pick the simpler: **Vite on 5173 in dev, proxies WS to Bun on 3000**. Production: Bun serves `client/dist/` static files directly.
- Decision: dev-time use 2 ports (Vite 5173, Bun 3000 with `vite.config.ts` `server.proxy: { '/ws': 'ws://localhost:3000' }`). Production: Bun serves all on 3000.

## Related Code Files

**Create**
- `package.json` — root, scripts, deps
- `bun.lockb` — generated
- `tsconfig.json` — root, references
- `tsconfig.server.json` — server-specific
- `tsconfig.client.json` — client-specific
- `vite.config.ts` — build config + alias + WS proxy
- `tailwind.config.ts` — theme placeholder (full theme in phase 9)
- `postcss.config.js`
- `.gitignore`
- `server/src/index.ts` — `Bun.serve` entrypoint
- `server/src/websocket-handler.ts` — WS upgrade + message routing skeleton
- `client/index.html` — Vite entry
- `client/src/main.tsx` — React mount
- `client/src/App.tsx` — root component
- `client/src/styles.css` — Tailwind directives
- `client/src/lib/ws-client.ts` — WS connection helper
- `shared/src/messages.ts` — `WSMessage` discriminated union (PING/PONG only for now)
- `packs/.gitkeep`
- `public/.gitkeep`
- `README.md` — minimal stub (filled in phase 11)
- `docs/.gitkeep`

## Implementation Steps
1. `bun init` in repo root, configure as workspace-style monorepo (single package.json with subpaths is fine — no real workspaces needed for KISS)
2. Add deps: `bun add react react-dom`, `bun add -d typescript @types/react @types/react-dom @types/bun vite @vitejs/plugin-react tailwindcss postcss autoprefixer`
3. Create `tsconfig.json` with base, then `tsconfig.server.json` (target ESNext, module ESNext, types: bun-types) and `tsconfig.client.json` (target ES2020, jsx: react-jsx, lib: DOM)
4. Configure path aliases in tsconfig + `vite.config.ts`: `@shared` → `shared/src`, `@client` → `client/src`, `@server` → `server/src`
5. Init Tailwind: `bunx tailwindcss init -p`, point content to `client/**/*.{ts,tsx}`, leave theme empty for now
6. Write `server/src/index.ts`: `Bun.serve` with fetch handler + websocket handler, log LAN IP on boot using `os.networkInterfaces()`
7. Write `server/src/websocket-handler.ts`: handle `open`, `message` (parse JSON, route by `type`), `close`. PING → PONG
8. Write `client/src/lib/ws-client.ts`: typed WS wrapper, auto-reconnect, callback registry by message type
9. Write `client/src/App.tsx`: connect on mount, send PING, render "Connected: yes/no" + last message
10. Add npm scripts: `dev` (parallel: `bun --watch server/src/index.ts` + `vite`), `build` (`vite build`), `start` (`bun server/src/index.ts NODE_ENV=production`)
11. Test: run `bun run dev`, visit `http://localhost:5173`, confirm PING/PONG roundtrip in console + UI
12. Create stub `README.md` with one-line description; will be expanded in phase 11

## Todo List
- [x] Init Bun project + install deps
- [x] Set up tsconfig (root, server, client)
- [x] Configure Vite + path aliases + WS proxy
- [x] Init Tailwind
- [x] Build Bun server skeleton with WS + LAN IP detection
- [x] Build typed WS client wrapper
- [x] Hello-world PING/PONG round-trip
- [x] Add dev/build/start scripts
- [x] Manual smoke test
- [x] Stub README + .gitignore + docs/ + packs/ + public/

## Success Criteria
- `bun run dev` works without errors
- Browser console shows PING sent → PONG received within 100ms
- LAN IP logged on server boot
- TypeScript compiles cleanly (`bun run build` succeeds)
- File structure matches target layout in plan.md

## Risk Assessment
- **R**: Bun + Vite proxy setup quirks → **M**: keep it simple, document the 2-port dev / 1-port prod split clearly
- **R**: Tailwind PostCSS config drift → **M**: use the official `bunx tailwindcss init -p` output unchanged
- **R**: Path alias not resolving in Bun runtime → **M**: ensure `tsconfig.server.json` has `baseUrl` + `paths`, Bun reads tsconfig paths natively

## Security Considerations
- No secrets in repo; `.env` in `.gitignore`
- `Bun.serve` only binds to `0.0.0.0:3000` — fine for LAN; document that this exposes the port to local network
- WS handler skeleton must JSON-parse safely (try/catch, drop invalid messages)

## Completion Notes

All 10 todo items completed. Code review flagged 5 issues (3 critical, 2 suggestions) and all were resolved:
- **C1** (server/src/websocket-handler.ts:24-30): Added null/non-object guard after JSON.parse to prevent DoS crash on invalid payloads. WS connection stays alive.
- **C2** (server/src/index.ts:31-45): Added path validation (`..`, NUL check) + asset 404 handling for SPA fallback; prevents traversal exploits and browser caching foot-guns.
- **C3** (client/src/App.tsx:56-61): Added client.close() in cleanup + stale-timer tracking (S1 fix) to prevent orphaned WSClient under React.StrictMode; App now listens for disconnect to reset UI state.
- **S1** (client/src/lib/ws-client.ts:36-82): Tracked reconnectTimer and guard connect() with closedByUser check to prevent stale reconnect after explicit close().
- **S6** (server/src/index.ts:21-22): Added one-line comment explaining data:undefined workaround for @types/bun strictness.

Tester report (tester-260503-2214-phase-01-foundation.md): all 11 checks pass (WS proxy caveat is CLI artifact, not code issue). Code review report (code-reviewer-260503-2214-phase-01-foundation.md): fixes applied; S2–S5, S7–S8 deferred to later phases per YAGNI.

## Next Steps
- Phase 2 (WebHID) depends on this being green
- Phase 3 (server state) builds on the WS skeleton
