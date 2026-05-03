# Phase 10 — Audio System

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-09-visual-style-system.md](phase-09-visual-style-system.md)
- Next: [phase-11-polish-and-testing.md](phase-11-polish-and-testing.md)

## Overview
- **Priority**: P2 (huge feel impact, parallelizable with screens)
- **Status**: pending
- **Effort**: ~3h
- Howler-based AudioManager singleton. Cross-fade music tracks. SFX sprite for snappy effects. Per-player optional buzz-sound choice. Curate ~10-15 SFX + 4-5 music tracks from Pixabay.

## Key Insights
- Howler handles browser audio quirks (iOS autoplay restriction, crossfade)
- Music tracks: 4 contexts → lobby loop, gameplay loop, tense ticking (during answer window), win fanfare
- SFX: ~10 short clips → buzz-honk (wrong), ding (correct), swoosh (transitions), drumroll (reveal anticipation), tick (timer), buzzer-press (buzz-in), wager-up, wager-down, score-tally, claim-pad
- Sprite sheet: bundle SFX into one MP3 + JSON timing map (Howler supports this) → fewer HTTP requests, instant playback
- Volume controls live in SettingsContext (phase 9): musicVolume, sfxVolume
- Per-player buzz sound: 3-5 presets ("classic honk", "doorbell", "boop", "siren", "fart" for laughs); each player picks during name entry

## Requirements
**Functional**
- `AudioManager.playMusic(track, { fadeMs })` — switches current music, cross-fades
- `AudioManager.playSfx(name)` — fires SFX from sprite sheet
- `AudioManager.playPlayerBuzzSound(playerId)` — plays the chosen sound for player
- Music auto-resumes on user interaction (overcoming browser autoplay policy)
- Volume changes from SettingsContext apply live
- Audio assets manifest in `/public/audio/manifest.json` listing all files + sources

**Non-functional**
- SFX latency <50ms from trigger to audible
- Total audio asset size <5MB
- Crossfade duration 800ms (configurable)

## Architecture

### Audio file layout
```
/public/audio/
  manifest.json
  music/
    lobby-loop.mp3
    gameplay-loop.mp3
    tension-ticking.mp3
    win-fanfare.mp3
    intro-stinger.mp3
  sfx/
    sfx-sprite.mp3       # all SFX bundled
    sfx-sprite.json      # timing map for Howler sprite mode
  buzz-sounds/
    classic-honk.mp3
    doorbell.mp3
    boop.mp3
    siren.mp3
    fart.mp3
```

### Manifest format
```json
{
  "music": {
    "lobby": { "src": "/audio/music/lobby-loop.mp3", "loop": true, "source": "Pixabay/<creator>" },
    "gameplay": { "src": "/audio/music/gameplay-loop.mp3", "loop": true, "source": "..." }
    // ...
  },
  "sfx": {
    "sprite": "/audio/sfx/sfx-sprite.mp3",
    "map": "/audio/sfx/sfx-sprite.json"
  },
  "buzzSounds": [
    { "id": "classic-honk", "label": "Classic Honk", "src": "/audio/buzz-sounds/classic-honk.mp3" }
    // ...
  ]
}
```

### AudioManager singleton
```ts
class AudioManager {
  private currentMusic: Howl | null
  private sprite: Howl
  private buzzSounds: Map<string, Howl>
  playMusic(track: 'lobby'|'gameplay'|'tension'|'win'|'intro', opts?: { fadeMs?: number })
  playSfx(name: 'honk'|'ding'|'swoosh'|'drumroll'|...)
  playPlayerBuzzSound(soundId: string)
  setMusicVolume(v: 0..1)
  setSfxVolume(v: 0..1)
  unlock() // call on first user interaction
}
```

### Phase → audio mapping (consumed by host screens)
- LOBBY → music: lobby
- ROUND_INTRO → sfx: drumroll, music: gameplay
- QUESTION_REVEAL → sfx: swoosh
- BUZZ_OPEN → music: tension (loop, lower volume)
- ANSWER_LOCK → sfx: tick (fast tick loop)
- REVEAL (correct) → sfx: ding
- REVEAL (wrong) → sfx: honk
- SCOREBOARD → sfx: score-tally, music: gameplay
- WINNER → music: win-fanfare, sfx: drumroll then ding

## Related Code Files

**Create**
- `client/src/audio/audio-manager.ts` — singleton class
- `client/src/audio/use-audio.ts` — React hook returning manager + bound to SettingsContext volumes
- `client/src/audio/use-phase-audio.ts` — hook bound to GameState.phase, fires sfx/music transitions
- `client/src/audio/buzz-sound-picker.tsx` — small UI for selecting buzz sound during name entry
- `public/audio/manifest.json` — audio manifest
- `public/audio/CURATION.md` — list of curated assets with Pixabay URLs (for redownload/credit reference)

**Modify**
- `client/src/host/HostClient.tsx` — call `audioManager.unlock()` on first user click + use `usePhaseAudio()`
- `client/src/phone/PhoneClient.tsx` — also unlock + handle limited audio (e.g., buzz feedback when locked-in)
- `client/src/lib/settings-context.tsx` — wire music/sfx volume to AudioManager
- `package.json` — add `howler @types/howler`

## Asset Curation (manual step)
Search Pixabay for these (no attribution required for Pixabay license):

**Music** (4-5 tracks, loopable preferred):
- Lobby loop: "synthwave loop chill" → grab a 60-90s loopable track
- Gameplay loop: "retro game show" or "80s arcade" → upbeat
- Tension ticking: "tense ticking" or "suspense pulse" → slow build, ~30s loopable
- Win fanfare: "victory fanfare" → 5-10s, dramatic
- Optional intro stinger: "neon intro" → 3-5s

**SFX** (~10 clips, all <2s each):
- buzz-honk: search "wrong answer buzzer" or "game show buzzer"
- ding: search "correct answer ding" or "bell ding"
- swoosh: search "swoosh transition"
- drumroll: search "drum roll short"
- tick: search "clock tick" — single tick, will loop in code
- claim-pad: search "soft pop" or "ui select"
- score-tally: search "coin tally" or "points score"
- wager-up / wager-down: search "ui slider" — pick 2 short beeps
- buzzer-press: search "arcade button"

**Buzz sounds** (5 presets, ~1s each):
- Classic honk, doorbell ding-dong, cartoon boop, siren wail, comedic fart (all from Pixabay)

Total estimated download: ~3-4MB.

After curation, build SFX sprite using `audiosprite` CLI tool or manually concatenate + write JSON timing.

## Implementation Steps
1. Install: `bun add howler && bun add -d @types/howler`
2. **Curation step** (manual ~30 min): search Pixabay for tracks per spec, download to `/public/audio/`, fill `manifest.json` with file paths + source URLs in `CURATION.md`
3. Build SFX sprite: install `audiosprite` (`npm i -g audiosprite` OR use online tool), feed all SFX files, get `sfx-sprite.mp3` + Howler-compatible JSON. Save into `/public/audio/sfx/`
4. Build `audio-manager.ts`: singleton class with methods per spec. Howl instances lazy-loaded. `unlock()` plays a silent buffer to unlock audio context.
5. Build `use-audio.ts` hook: returns AudioManager instance, subscribes to SettingsContext volumes, applies via setters
6. Build `use-phase-audio.ts` hook: takes GameState, on phase change dispatches appropriate music/sfx (table-driven)
7. Build `buzz-sound-picker.tsx`: small list of 5 sound presets, click to preview, on select stores `playerSoundId` in player state (extend `Player` type with optional `buzzSoundId`)
8. Wire `audioManager.unlock()` into both HostClient and PhoneClient on first user gesture
9. Wire `usePhaseAudio()` in HostClient to react to game state changes
10. Settings UI tweak: add music/sfx volume sliders to SettingsContext panel
11. Test: full game playthrough, confirm music transitions and SFX fire at right moments

## Todo List
- [ ] Install howler
- [ ] Curate audio assets from Pixabay (~30 min manual)
- [ ] Build SFX sprite (audiosprite tool)
- [ ] Write audio manifest.json + CURATION.md
- [ ] Implement AudioManager singleton
- [ ] Implement useAudio hook
- [ ] Implement usePhaseAudio hook (table-driven phase mapping)
- [ ] Build BuzzSoundPicker component
- [ ] Extend Player type with buzzSoundId
- [ ] Wire unlock() into HostClient + PhoneClient
- [ ] Wire phase-audio into HostClient
- [ ] Add volume sliders to settings UI
- [ ] Full-game audio playthrough test

## Success Criteria
- Music plays on lobby load (after first user click — autoplay unlock)
- SFX fire within 50ms of phase transition
- Cross-fade between gameplay loop and tension ticking is smooth
- Volume sliders work live (no re-fetch)
- Per-player buzz sounds play distinctly when each player buzzes
- Total audio asset bundle <5MB

## Risk Assessment
- **R**: Browser autoplay policy blocks initial music → **M**: AudioManager.unlock() called on first interaction (host's "Connect Dongle" click suffices for host, "Submit name" for phone)
- **R**: Pixabay search yields lousy candidates → **M**: have backup sources (Mixkit, Uppbeat); document picks in CURATION.md so they can be swapped
- **R**: Audiosprite tool unavailable → **M**: load each SFX as standalone Howl (no sprite); slightly slower first-load but functionally equivalent

## Security Considerations
- Audio files served from `/public/audio/` — same-origin, no CORS issues
- No user-uploaded audio (YAGNI for now)
- Pixabay license: free for commercial + non-commercial use, no attribution required, but we credit anyway in CURATION.md

## Next Steps
- Phase 11 polish includes audio QA on iOS/Android
- Audio toggle for low-spec hosts (built into settings)
