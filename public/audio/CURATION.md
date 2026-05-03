# Audio Asset Curation

The audio system is fully wired and will silently no-op when files are missing.
To complete the experience, drop MP3s into the directory layout below. All
suggested searches are on **Pixabay** (royalty-free, no attribution required).

## Layout

```
public/audio/
├── manifest.json          # already shipped — paths reference the files below
├── music/
│   ├── lobby-loop.mp3       # search: "synthwave loop chill" or "retro lobby" — 60-90s, loopable
│   ├── gameplay-loop.mp3    # search: "retro game show" / "80s arcade" — upbeat
│   ├── tension-ticking.mp3  # search: "tense ticking" / "suspense pulse" — ~30s loop
│   └── win-fanfare.mp3      # search: "victory fanfare" — 5-10s, dramatic
└── sfx/
    ├── honk.mp3             # search: "wrong answer buzzer" / "game show buzzer"
    ├── ding.mp3             # search: "correct answer ding" / "bell ding"
    ├── swoosh.mp3           # search: "swoosh transition"
    ├── drumroll.mp3         # search: "drum roll short"
    ├── tick.mp3             # search: "clock tick" (single tick, will loop)
    ├── claim.mp3            # search: "soft pop" / "ui select"
    └── buzzer-press.mp3     # search: "arcade button"
```

Total budget: keep each MP3 under ~512KB (mono, 96-128kbps is plenty for SFX).
Music tracks 1-3MB each is fine.

## After dropping files in

Just refresh — `AudioManager` lazy-loads each file on first play. Missing files
are caught silently and logged; the rest of the app keeps working.

If you replace a file with a different name, update `manifest.json` to match.

## Pixabay license

Pixabay tracks are free for commercial + non-commercial use, no attribution
required. Listing source URLs here is just a courtesy + redownload aid.
