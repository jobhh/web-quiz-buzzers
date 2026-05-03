# Phase 8 — Game Screens & Flow

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-07-round-mechanics.md](phase-07-round-mechanics.md)
- Next: [phase-09-visual-style-system.md](phase-09-visual-style-system.md)

## Overview
- **Priority**: P1 (visible product)
- **Status**: pending
- **Effort**: ~5h
- Build all React host screens for game flow. State-driven (one screen per phase). Animated transitions via Framer Motion. Each screen ≤150 lines. Share common components.

## Key Insights
- Host screen is "the TV" — designed for sharing on a big monitor or projector
- Screens map 1:1 to GameState phases for predictability
- Use Framer Motion's `<AnimatePresence>` for exit/enter transitions between phases
- Avoid layout thrashing — fixed positioning + transforms only for animations (60fps budget: <16ms per frame, animations should run on compositor)
- Audio (phase 10) and visual style (phase 9) are independent — this phase focuses on layout + state binding

## Requirements

### Screen list (one component each)
1. `LobbyScreen` (phase 6) — already exists
2. `RoundIntroScreen` — big text "ROUND 1: BUZZ-IN", category overview, animated entrance, dwells 3s
3. `QuestionRevealScreen` — question text, 4 answers shown letter-coded, optional media. Dramatic reveal animation.
4. `BuzzInScreen` — same as QuestionReveal but with "BUZZ NOW" indicator + countdown bar (no countdown in classic, only in speed/wager)
5. `AnswerLockScreen` — buzzer's name highlighted, 5s ticking countdown, their portrait/icon front-and-center, drumroll feel
6. `RevealScreen` — correct answer highlighted, score deltas animate (e.g., "+100" floats up), screen shake if wrong, confetti if correct
7. `RoundScoreboardScreen` — bar chart / podium of players, ordered by score, 5s dwell
8. `FinalWagerScreen` — wager input UI per player; live "X of N players have wagered" counter
9. `WinnerScreen` — top 3 podium, gold/silver/bronze, confetti storm, replay button

### Common components
- `<PlayerAvatar player>` — colored circle with name + 🎮/📱 icon
- `<ScoreBadge player>` — pill with current score
- `<CountdownBar endsAt>` — animated timer bar
- `<MediaPlayer media>` — image or audio
- `<NeonHeading>`, `<NeonButton>` etc. — from phase 9 visual style

## Architecture

### Screen routing
- `HostClient` reads `state.phase` and `state.currentRound`, renders matching screen
- All screens receive `state: GameState` as prop
- Use `<AnimatePresence mode="wait">` so old screen exits before new enters

### Animation budget
- ≤3 simultaneously animated elements per screen
- Use `transform` + `opacity` only (avoid `width`/`height`/`top`/`left` animations)
- Particles/confetti via `canvas-confetti` (offloaded to canvas, doesn't block React)

### State derivation
- Some derived UI state (e.g., "which player just buzzed") read from `state.buzzedPlayerId` lookup
- No client-side state machines — all phase from server

## Related Code Files

**Create**
- `client/src/host/screens/RoundIntroScreen.tsx`
- `client/src/host/screens/QuestionRevealScreen.tsx`
- `client/src/host/screens/BuzzInScreen.tsx`
- `client/src/host/screens/AnswerLockScreen.tsx`
- `client/src/host/screens/RevealScreen.tsx`
- `client/src/host/screens/RoundScoreboardScreen.tsx`
- `client/src/host/screens/FinalWagerScreen.tsx`
- `client/src/host/screens/WinnerScreen.tsx`
- `client/src/host/components/PlayerAvatar.tsx`
- `client/src/host/components/ScoreBadge.tsx`
- `client/src/host/components/CountdownBar.tsx`
- `client/src/host/components/MediaPlayer.tsx`
- `client/src/host/components/ScoreDeltaPopup.tsx` — floats `+100` upward on reveal
- `client/src/lib/use-confetti.ts` — wraps canvas-confetti for win/correct moments
- `client/src/host/screen-router.tsx` — picks screen by phase

**Modify**
- `client/src/host/HostClient.tsx` — replace single LobbyScreen render with `<ScreenRouter state />`
- `package.json` — add `framer-motion`, `canvas-confetti`

## Implementation Steps
1. Install: `bun add framer-motion canvas-confetti && bun add -d @types/canvas-confetti`
2. Build common components first:
   - `PlayerAvatar.tsx` (~40 LOC): circle with player initials, deviceType icon, color from a 16-color palette indexed by playerId hash
   - `ScoreBadge.tsx` (~30 LOC): pill with animated number (Framer Motion `useSpring`)
   - `CountdownBar.tsx` (~40 LOC): receives `endsAt`, animates width 100→0 via Framer's `motion.div` `animate={{width: 0}} transition={{duration: msRemaining/1000, ease: 'linear'}}`
   - `MediaPlayer.tsx` (~50 LOC): if image, renders `<img>`; if audio, renders custom controls + auto-play once
3. Build screens in dependency order:
   - `RoundIntroScreen` (~80 LOC): full-screen `<NeonHeading>` "ROUND N", subtitle, animated wipe-in
   - `QuestionRevealScreen` (~120 LOC): question text top-center, 4 answer cards in 2x2 grid, `<MediaPlayer>` if media. Stagger-reveal animation.
   - `BuzzInScreen` (~100 LOC): same as QuestionReveal + "BUZZ" indicator + (if speed round) countdown bar
   - `AnswerLockScreen` (~90 LOC): buzzed player avatar centered + animated, name big, 5s countdown bar, "Answer locked in..." status when answered
   - `RevealScreen` (~140 LOC): highlights correct answer card with glow animation, dims wrong, renders `<ScoreDeltaPopup>` per player, screen shake hook on wrong
   - `RoundScoreboardScreen` (~100 LOC): horizontal bar chart of scores, animated bar growth, sorted desc
   - `FinalWagerScreen` (~120 LOC): grid of player cards each showing their wager state ("Wagering..." / "Locked: 50%"), counter "3/4 wagered"
   - `WinnerScreen` (~120 LOC): podium 1st/2nd/3rd, confetti via `useConfetti` on mount, "Play Again" button
4. Build `screen-router.tsx`: switch on `state.phase`, default to LobbyScreen, use `<AnimatePresence mode="wait">` wrapper. Each screen wrapped in `motion.div` with key={state.phase + state.questionIndex}
5. Build `useConfetti` hook calling `canvas-confetti` with neon colors
6. Add screen-shake hook (`use-screen-shake.ts`): on call, applies brief CSS class with shake animation to body
7. Wire into `HostClient.tsx`
8. Manual test: run a full game, verify all screens render, transitions feel smooth at 60fps (Chrome DevTools Perf)

## Todo List
- [ ] Install framer-motion + canvas-confetti
- [ ] Build PlayerAvatar
- [ ] Build ScoreBadge
- [ ] Build CountdownBar
- [ ] Build MediaPlayer
- [ ] Build ScoreDeltaPopup
- [ ] Build RoundIntroScreen
- [ ] Build QuestionRevealScreen
- [ ] Build BuzzInScreen
- [ ] Build AnswerLockScreen
- [ ] Build RevealScreen with screen shake + confetti hooks
- [ ] Build RoundScoreboardScreen
- [ ] Build FinalWagerScreen
- [ ] Build WinnerScreen with podium + confetti storm
- [ ] Build screen-router with AnimatePresence
- [ ] Wire into HostClient
- [ ] Perf check: 60fps on transitions

## Success Criteria
- Every game phase has a corresponding screen rendered correctly
- Transitions between phases are visually smooth (no jank)
- Chrome DevTools "Performance" panel shows ≥55fps avg during animations
- Confetti fires on REVEAL (correct) and WINNER
- Screen shake fires on REVEAL (wrong)
- Each screen file ≤150 LOC

## Risk Assessment
- **R**: Framer Motion bundle bloat → **M**: import only what's used (`motion`, `AnimatePresence`); modern bundle is ~50KB acceptable for a desktop host
- **R**: Animations stutter on slow host CPU → **M**: keep transforms only; if persists, add `prefers-reduced-motion` toggle in settings (optional)
- **R**: Confetti-on-every-correct gets annoying → **M**: tone down to 50 particles per correct, full storm only on WINNER

## Security Considerations
- Question text rendered via React JSX (auto-escaped) — no `dangerouslySetInnerHTML`
- Media `src` attribute is set from validated pack data; no user-supplied URLs
- Player names sanitized at entry (phase 5/6) and React-escaped here

## Next Steps
- Phase 9 (visual style) provides theme tokens used by these screens
- Phase 10 (audio) syncs with screen transitions
- Phase 11 perf-tests transitions
