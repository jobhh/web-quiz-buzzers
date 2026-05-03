# Phase 4 — Question Pack System

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-03-game-state-server-and-rooms.md](phase-03-game-state-server-and-rooms.md)
- Next: [phase-05-phone-client-and-join-flow.md](phase-05-phone-client-and-join-flow.md)

## Overview
- **Priority**: P1 (gameplay needs questions)
- **Status**: pending
- **Effort**: ~3h
- JSON pack format with TS types + Zod runtime validator. Pack loader scanning `/packs`. 2 sample packs (general trivia + 90s neon) ~20 questions each. Media file convention.

## Key Insights
- Packs are static JSON loaded at server boot. Hot-reload not needed (KISS).
- Per locked design: `media: null | { type: 'image'|'audio', src: 'url-or-relative-path' }`. If `src` starts with `/` it's a path under `/public/media/`; otherwise treat as absolute URL (rare, requires internet — flag with warning since LAN-only).
- Zod gives both runtime validation AND derives the TS type — single source of truth.
- Pack ID = filename without `.json` extension. Stable, predictable.
- Validation errors must be loud and actionable (line/field info) — pack authors are humans editing JSON.

## Requirements
**Functional**
- Server scans `/packs/*.json` on boot
- Each file parsed + validated; failures logged with file path + Zod issue path
- Successfully loaded packs registered in `PackRegistry`, queryable by id
- `START_GAME` accepts a `packId` and resolves to questions
- 2 sample packs ship: `packs/general-trivia.json` (~20 mixed Q), `packs/90s-neon.json` (~20 Q themed: music, tech, pop culture, fashion of the 90s)
- Round-to-question mapping: pack contains a flat `questions[]`; the round controller (phase 7) decides how to slice (e.g., first 5 → R1, next 5 → R2, etc.) — pack does NOT pre-segment
- Media files live under `/public/media/{packId}/...` so packs are self-contained

**Non-functional**
- Pack load time <500ms even with 100 packs
- Media URLs resolved relative to client URL (so phone can fetch from host LAN)

## Architecture

### Pack JSON shape (locked)
```json
{
  "name": "Pack Name",
  "description": "...",
  "questions": [
    {
      "text": "...",
      "answers": ["A", "B", "C", "D"],
      "correct": 0,
      "category": "...",
      "difficulty": 1,
      "media": null
    }
  ]
}
```

### Round assignment (default mapping)
- 20 questions: 5 → R1 classic, 5 → R2 speed, 5 → R3 picture/audio (filter to questions with media), 5 → final wager pool (host picks one or random)
- If pack has fewer than 20: fill rounds proportionally; surface warning if R3 has 0 media-bearing questions
- This logic lives in pack loader (`assignToRounds(pack) => RoundQuestions`)

## Related Code Files

**Create**
- `shared/src/pack-types.ts` — Zod schema for `Pack`, `Question`, `Media`; export inferred TS type
- `server/src/pack-loader.ts` — `loadAllPacks(dir)`: scans, parses, validates, returns `Map<packId, Pack>`. Logs errors with formatted Zod issues.
- `server/src/pack-registry.ts` — singleton holding loaded packs; `getPack(id)`, `listPacks()`, `assignToRounds(packId) => RoundQuestions`
- `packs/general-trivia.json` — 20+ questions, varied categories
- `packs/90s-neon.json` — 20+ questions, 90s themed (music: NWA/Nirvana/Spice Girls, tech: Tamagotchi/Windows 95/Game Boy, fashion: scrunchies/JNCO/butterfly clips, etc.)
- `public/media/.gitkeep` — placeholder; sample packs use 2-3 media items each (image of e.g. cassette tape, audio clip of dial-up modem) — list URLs in pack and instructions to drop file

**Modify**
- `server/src/index.ts` — call `loadAllPacks` on boot, pass registry to RoomRegistry
- `server/src/reducer.ts` — `START_GAME` action looks up pack via registry, populates `roundQuestions` in state

## Implementation Steps
1. Create `shared/src/pack-types.ts`:
   - `MediaSchema = z.object({ type: z.enum(['image','audio']), src: z.string().min(1) }).nullable()`
   - `QuestionSchema = z.object({ text: z.string().min(1), answers: z.array(z.string().min(1)).length(4), correct: z.number().int().min(0).max(3), category: z.string(), difficulty: z.number().int().min(1).max(3), media: MediaSchema })`
   - `PackSchema = z.object({ name: z.string(), description: z.string(), questions: z.array(QuestionSchema).min(1) })`
   - `export type Pack = z.infer<typeof PackSchema>`
2. Create `server/src/pack-loader.ts`:
   - `async loadAllPacks(dir: string): Promise<Map<string, Pack>>`
   - Use `Bun.file` + `readdir` to enumerate `*.json`
   - Parse + `PackSchema.safeParse`; on failure, log file path + formatted issues from `result.error.issues`
   - Pack id = filename stem
3. Create `server/src/pack-registry.ts`: holds Map, exposes `getPack`, `listPacks`, `assignToRounds(pack) => { r1: Q[], r2: Q[], r3: Q[], final: Q[] }`. Algorithm: shuffle stable-by-id (deterministic for replays in same session), then slice; for r3 prefer media-bearing questions; warn if none.
4. Create `packs/general-trivia.json` — 25 questions across history, science, geography, sports, food. Variety in difficulty 1-3. Mix: 22 with `media: null`, 3 with images (placeholder src like `/media/general-trivia/world-map.png`).
5. Create `packs/90s-neon.json` — 25 90s-themed questions:
   - Music (5): grunge, hip-hop, britpop, pop divas, electronic
   - Tech (5): Game Boy, Tamagotchi, Windows 95, dial-up, Y2K
   - Pop culture (5): TV shows (Friends, X-Files), films, video games (Sonic vs Mario)
   - Fashion (5): scrunchies, frosted tips, JNCO jeans, etc.
   - Mixed (5): include 3 with media (image of arcade flyer, audio of dial-up sound, image of slap bracelet)
6. Modify `server/src/index.ts`: on boot, `const packs = await loadAllPacks('./packs'); console.log(\`Loaded \${packs.size} packs\`); pass into RoomRegistry`
7. Modify `server/src/reducer.ts`: `START_GAME` reads `packId`, calls `packRegistry.assignToRounds(packId)`, stores resulting question lists in state, transitions to `ROUND_INTRO`
8. Test: place a deliberately broken pack file (`broken.json` with missing `correct`), confirm clear error log, confirm other packs still load
9. Test: start a game, confirm `currentQuestion` populated correctly per round

## Todo List
- [ ] Define Zod schema for Pack/Question/Media
- [ ] Build pack loader with clear error reporting
- [ ] Build pack registry with `assignToRounds`
- [ ] Author `general-trivia.json` (~25 Q)
- [ ] Author `90s-neon.json` (~25 Q with media items)
- [ ] Drop placeholder media files in `/public/media/{packId}/`
- [ ] Wire pack registry into server boot
- [ ] Wire `START_GAME` to load questions
- [ ] Test broken pack handling
- [ ] Test full pack-to-round flow

## Success Criteria
- Both sample packs load without warnings
- Deliberately broken pack reports clear actionable error, doesn't crash server
- `START_GAME` populates state with correct questions for each round
- Media URLs resolve correctly when phone fetches from host LAN

## Risk Assessment
- **R**: Pack authors hand-edit JSON, frequent typos → **M**: clear Zod errors with field path; consider publishing a JSON schema file later for editor support (not in scope now)
- **R**: Media files missing/broken paths → **M**: pack loader could optionally check file existence (skip for now — trust author, surface 404 in UI)
- **R**: Sample pack media files take real time to source → **M**: use placeholder/free-license media; document in pack README that content is illustrative

## Security Considerations
- Question text rendered as HTML must be sanitized (phase 8 concern); Pack JSON itself is trusted (host provides)
- `JSON.parse` is safe (no eval)
- Don't allow pack `media.src` to escape `/public/media/` — validate path doesn't contain `..` (Zod regex check)
- LAN-only — pack files come from host's own filesystem

## Next Steps
- Phase 6 (lobby) shows pack selector
- Phase 7 (round mechanics) consumes `roundQuestions`
- Phase 8 (screens) renders `currentQuestion` + media
