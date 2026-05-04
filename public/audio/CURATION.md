# Audio Asset Curation

The audio system has **built-in procedurally-synthesized SFX**, so the game
plays with full audio feedback out-of-the-box (Web Audio API). Drop in real
MP3s only when you want to upgrade the sound — the file-based assets take
priority over the synthesized fallback whenever they load successfully.

## What synth covers (works without any files)

The fallback in `client/src/audio/synthesized-sfx.ts` generates these SFX
on the fly:
- `honk` — wrong-answer square-wave honk with downward pitch sweep
- `ding` — correct-answer high sine ding
- `swoosh` — filtered-noise transition swoosh
- `drumroll` — pink-ish noise swell
- `tick` — short triangle blip
- `claim` — 2-note rising blip (slot claim)
- `buzzerPress` — arcade-button square + pitch drop

## What's NOT synthesized (drop MP3s for these)

Music tracks have no fallback (synthesized loops would be too obnoxious).
Without these files the game plays without background music — still very
much usable, just less atmospheric:

```
public/audio/music/
├── lobby-loop.mp3        # synthwave / chill loop, 60-90s
├── gameplay-loop.mp3     # upbeat retro / 80s arcade loop
├── tension-ticking.mp3   # suspense pulse loop, ~30s
└── win-fanfare.mp3       # 5-10s dramatic fanfare
```

## Recommended sources (royalty-free, no attribution required)

**Pixabay** — [pixabay.com/sound-effects](https://pixabay.com/sound-effects)
and [pixabay.com/music](https://pixabay.com/music). Search terms:

| Filename | Pixabay search |
|----------|----------------|
| lobby-loop.mp3 | [synthwave loop](https://pixabay.com/music/search/synthwave%20loop/) or [retro lobby](https://pixabay.com/music/search/retro%20lobby/) |
| gameplay-loop.mp3 | [retro game show](https://pixabay.com/music/search/retro%20game%20show/) or [80s arcade](https://pixabay.com/music/search/80s%20arcade/) |
| tension-ticking.mp3 | [tense ticking](https://pixabay.com/music/search/tense%20ticking/) or [suspense pulse](https://pixabay.com/music/search/suspense%20pulse/) |
| win-fanfare.mp3 | [victory fanfare](https://pixabay.com/sound-effects/search/victory%20fanfare/) |

To upgrade SFX too (optional — synth is fine), drop the matching named MP3s
into `public/audio/sfx/`:

| Filename | Pixabay search |
|----------|----------------|
| honk.mp3 | [wrong answer buzzer](https://pixabay.com/sound-effects/search/wrong%20answer%20buzzer/) |
| ding.mp3 | [correct answer ding](https://pixabay.com/sound-effects/search/correct%20answer%20ding/) |
| swoosh.mp3 | [swoosh transition](https://pixabay.com/sound-effects/search/swoosh%20transition/) |
| drumroll.mp3 | [drum roll short](https://pixabay.com/sound-effects/search/drum%20roll%20short/) |
| tick.mp3 | [clock tick](https://pixabay.com/sound-effects/search/clock%20tick/) |
| claim.mp3 | [ui select pop](https://pixabay.com/sound-effects/search/ui%20select%20pop/) |
| buzzer-press.mp3 | [arcade button](https://pixabay.com/sound-effects/search/arcade%20button/) |

Pixabay license is permissive (commercial + non-commercial, no attribution),
but listing source URLs here is good practice for redownload + credit.

## Layout

```
public/audio/
├── manifest.json           # paths reference the files below — already shipped
├── CURATION.md             # this file
├── music/
│   ├── lobby-loop.mp3
│   ├── gameplay-loop.mp3
│   ├── tension-ticking.mp3
│   └── win-fanfare.mp3
└── sfx/
    ├── honk.mp3            # optional — synthesized fallback exists
    ├── ding.mp3            # optional — synthesized fallback exists
    ├── swoosh.mp3          # optional — synthesized fallback exists
    ├── drumroll.mp3        # optional — synthesized fallback exists
    ├── tick.mp3            # optional — synthesized fallback exists
    ├── claim.mp3           # optional — synthesized fallback exists
    └── buzzer-press.mp3    # optional — synthesized fallback exists
```

Just refresh after dropping new files in. Each is lazy-loaded on first play.
A failed load is logged once and that SFX falls back to synth from then on.
