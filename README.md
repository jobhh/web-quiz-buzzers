# Buzz Quiz

A LAN-only Jackbox-style quiz party game. Plug in PlayStation Buzz USB
controllers (or just use phones), pick a question pack, and play four mixed
rounds — classic buzz-in, speed, picture/audio, and a final wager round.

Retro neon gameshow aesthetic. Self-hosted on your laptop. Phones join via QR.

## Quickstart

```bash
bun install
bun run dev        # dev mode (Vite on 5173, Bun on 3000)
# OR
bun run build && bun run start    # production (single port :3000)
```

Then open `http://localhost:5173` (dev) or `http://<your-LAN-IP>:3000` (prod)
in **Chrome or Edge** on the host machine. The server logs all reachable LAN
URLs at boot — point your TV / projector to that one and your phone players to
the QR code shown in the lobby.

## Requirements

- **Bun** ≥ 1.3 (`curl -fsSL https://bun.sh/install | bash`)
- **Chrome or Edge** on the host machine (WebHID is required for Buzz USB
  controllers — Firefox / Safari are not supported on the host)
- Optional: PlayStation Buzz USB dongle(s) — 1 dongle = 4 controllers, max 2
  dongles supported (8 buzz players + N phones)

## How to Play

1. **Host** opens `/host` (root) in Chrome/Edge on the host machine.
2. Plug in your Buzz USB dongle (or skip — phones-only is fine).
3. Click **Connect Buzz Dongle**, grant permission in the browser dialog.
4. **Phone players** scan the QR code shown in the lobby — opens `/play?room=XXXX`.
5. **Buzz players** press the big red button on an unclaimed slot to claim it,
   then enter their name with the 4 colored buttons (Y prev letter, G next,
   O add, B submit, RED del/cancel).
6. Pick a question pack from the dropdown.
7. Click **Start Game** when everyone's in.

## Round Format

| Round | Mechanic | Scoring |
|-------|----------|---------|
| 1 — Classic | First to buzz answers (5s window). Wrong → others can steal (3s, locked-out original). | +100 correct · steal: +150 to stealer / -50 to original · wrong steal: -50 |
| 2 — Speed | Everyone answers within 10s. Faster correct = more points. | 100 → 10 linear decay · wrong = 0 |
| 3 — Picture/Audio | Same as Round 1 with media; baseline doubled. | +200 correct · steal: +300 / -100 · wrong steal: -100 |
| Final — Wager | Each player bets 0–100% of their score before seeing the question, then everyone answers. | ±wager · scores clamped to ≥0 |

## Adding Question Packs

Drop a JSON file into `packs/`. Schema:

```json
{
  "name": "Pack Name",
  "description": "Short subtitle",
  "questions": [
    {
      "text": "Which planet is known as the Red Planet?",
      "answers": ["Venus", "Mars", "Jupiter", "Saturn"],
      "correct": 1,
      "category": "Science",
      "difficulty": 1,
      "media": null
    }
  ]
}
```

- `correct` is the **0-indexed** answer.
- `media` can be `null` or `{ "type": "image"|"audio", "src": "filename.png" }`.
  Source files live in `public/media/{packId}/{filename}`.
- Validation errors print clearly at server boot; broken packs are skipped, not fatal.

See [`docs/pack-authoring.md`](docs/pack-authoring.md) for more.

## Audio

**SFX work out of the box** — every sound effect (buzzer honk, ding, swoosh,
drumroll, tick, claim, button press) is synthesized in-browser via the Web
Audio API as a fallback when the matching MP3 isn't present. The game has
full audio feedback the moment you launch.

To upgrade with real samples, drop MP3s into `public/audio/sfx/` (overrides
the synth) and `public/audio/music/` (no synth fallback for music tracks).
See [`public/audio/CURATION.md`](public/audio/CURATION.md) for the expected
filenames + Pixabay search links.

## Settings

Click the gear button (top-left) to toggle scanlines, music volume, SFX
volume, and reduced-motion. Settings persist to localStorage.

## Troubleshooting

- **"WebHID not supported"** — open the host page in Chrome or Edge.
- **Phone can't connect** — confirm the QR URL uses your **LAN IP**, not
  `localhost`. Override detection with `HOST_IP=192.168.1.42 bun run dev`.
- **No audio on first load** — modern browsers block autoplay. Click anywhere
  on the host page once and the audio context unlocks.
- **Buzz controller not detected** — try unplugging/replugging the dongle. On
  Linux you may need a udev rule for `054C:0002` (see `docs/setup.md`).

## Credits

- Audio: [Pixabay](https://pixabay.com/sound-effects/) (royalty-free, no attribution required).
- Buzz HID layout reverse-engineered: [Lewis Cowles' gist](https://gist.github.com/Lewiscowles1986/eef220dac6f0549e4702393a7b9351f6).
- Design + implementation: see commit history.

## Layout

- `server/` — Bun WebSocket server, room/game state, pack loader
- `client/` — Vite + React frontend (host + phone routes)
- `shared/` — TS types + scoring shared between server and client
- `packs/` — JSON question packs
- `public/` — static assets: audio, media, fonts
- `plans/` — implementation plan + per-phase docs (development artifacts)
- `docs/` — developer + user docs
