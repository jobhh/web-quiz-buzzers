# Phase 7 — Round Mechanics

## Context Links
- Plan: [plan.md](plan.md)
- Prev: [phase-06-setup-and-lobby-screens.md](phase-06-setup-and-lobby-screens.md)
- Next: [phase-08-game-screens-and-flow.md](phase-08-game-screens-and-flow.md)

## Overview
- **Priority**: P1 (core gameplay)
- **Status**: pending
- **Effort**: ~5h
- Implement all 4 round-type controllers as pure server-side logic. Lock-out + steal (R1, R3), simultaneous answers + time-weighted scoring (R2), wager (Final). Framework-agnostic, testable.

## Key Insights
- Each round controller is a function-pipeline operating on `GameState` returning state transitions + scheduled timers
- Timers are server-side `setTimeout` IDs stored on `Room` (clearable on phase exit); clients receive `*EndsAt` epoch for visual countdown
- Scoring is centralized in `shared/src/scoring.ts` (used by reducer)
- Steal mechanic: after wrong answer, re-open buzz with original buzzer in `lockedOutPlayerIds`, run shorter window
- Speed round: collect all answers, score = correctness × (timeRemaining / totalTime) × baseline
- Wager: collect wagers BEFORE showing question; correct → +wager, wrong → -wager
- All round controllers share a "next question" mechanism: when round questions exhausted, transition to SCOREBOARD then NEXT round

## Requirements

### R1 — Classic Buzz-In
- Phase order: ROUND_INTRO → QUESTION_REVEAL → BUZZ_OPEN → ANSWER_LOCK → REVEAL → (next Q or SCOREBOARD)
- BUZZ_OPEN: any player can BUZZ (buzz pad big-red OR phone tap). First valid BUZZ wins
- Server records `buzzedPlayerId`, sets 5s `buzzWindowEndsAt`, transitions to ANSWER_LOCK
- Buzzed player has 5s to ANSWER (choice 0-3); host advances reveal OR timer expires
- If correct: +100, transition REVEAL, light buzzer's LED green-equivalent (just LED on)
- If wrong: add to `lockedOutPlayerIds`, re-enter BUZZ_OPEN with 3s window for STEAL
  - Steal correct: +150 (50% bonus), -100 from original buzzer (or just no change to original — pick: -50 original, +150 stealer for KISS = clear consequences)
  - Steal wrong: -50 stealer
  - One steal attempt only; if no one buzzes during steal window OR steal wrong → REVEAL no further bonus

### R2 — Speed Round
- Phase order: ROUND_INTRO → QUESTION_REVEAL → BUZZ_OPEN (renamed conceptually to "ANSWERS_OPEN") → REVEAL
- 10-second window starts at QUESTION_REVEAL
- All players can ANSWER (choice 0-3) anytime during window
- Each ANSWER stamped with timestamp
- Score = correctness ? round(100 × (1 - elapsed/10000)) : 0 (linear decay; 100 if instant, 0 if used full time, only if correct; minimum 10 for late correct)
- All scores revealed simultaneously

### R3 — Picture/Audio Round
- Same as R1 mechanics but baseline 200pts, steal bonus 50% = 300, steal wrong -100
- Question media displayed prominently during QUESTION_REVEAL and BUZZ_OPEN
- Audio media auto-plays once on QUESTION_REVEAL entry; replay button available
- Media URL resolved via `/media/{packId}/...`

### Final Wager
- Phase order: FINAL_WAGER (collect wagers) → QUESTION_REVEAL → ANSWER_LOCK (everyone answers) → REVEAL → WINNER
- All players see "Wager 0%-100% of your current score" (slider on phone, alphabet wheel adapted to digits 0-100 for buzz players — OR: simpler: buzz players get 4 preset wager amounts on Y/G/O/B = 25%/50%/75%/100%)
- After all wagers collected, show question
- Each player picks 0-3 (10s window)
- Reveal: correct → score += wager, wrong → score -= wager
- Highest score wins

## Architecture

### Round controllers (pure functions)
- `shared/src/rounds/r1-classic.ts` — `handleR1Buzz`, `handleR1Answer`, `tickR1Timer`
- `shared/src/rounds/r2-speed.ts` — `handleR2Answer`, `tickR2Timer`, `computeR2Scores`
- `shared/src/rounds/r3-picture-audio.ts` — re-uses R1 logic with different baseline param
- `shared/src/rounds/final-wager.ts` — `handleWager`, `handleFinalAnswer`, `tickFinalTimer`
- `shared/src/scoring.ts` — `computeR1Score`, `computeR2Score`, `computeFinalScore`

### Reducer integration
- Reducer dispatches to round controllers based on `state.currentRound`
- Round controllers return `{ newState, sideEffects?: { setLed?: [...], scheduleTimer?: [...], clearTimer?: [...] } }`
- `Room` class executes side effects (so reducer stays pure-ish)

### Timers
- `Room.scheduleTimer(name, ms, callback)` stores ref; `clearTimer(name)` cancels
- On timer fire, `Room.dispatch({ type: 'TIMER_EXPIRED', name })`
- All timer-bound state changes go through reducer for consistency

## Related Code Files

**Create**
- `shared/src/rounds/r1-classic.ts`
- `shared/src/rounds/r2-speed.ts`
- `shared/src/rounds/r3-picture-audio.ts`
- `shared/src/rounds/final-wager.ts`
- `shared/src/scoring.ts`
- `shared/src/round-types.ts` — common types (`RoundConfig`, `RoundResult`, `SideEffect`)
- `server/src/timer-manager.ts` — small wrapper for timers per room
- `tests/rounds/r1-classic.test.ts` — unit tests for buzz/answer/steal flow
- `tests/rounds/r2-speed.test.ts` — unit tests for time-weighted scoring
- `tests/rounds/final-wager.test.ts` — unit tests for wager flow
- `tests/scoring.test.ts` — unit tests for scoring math

**Modify**
- `server/src/reducer.ts` — delegate to round controllers based on phase + round
- `shared/src/messages.ts` — add `TIMER_EXPIRED` internal action
- `server/src/room.ts` — wire side effects (LED control via WebHID is host-side; server emits a `LED_HINT` message as part of state and host BuzzManager listens)

## Implementation Steps
1. Create `shared/src/round-types.ts` with `SideEffect` discriminated union: `LED`, `SCHEDULE_TIMER`, `CLEAR_TIMER`, `PLAY_SOUND`
2. Create `shared/src/scoring.ts` with pure scoring functions, fully unit-tested
3. Create `shared/src/rounds/r1-classic.ts`:
   - `handleBuzz(state, playerId) → { newState, sideEffects }`: validate phase, validate player not locked out, set buzzedPlayerId, schedule 5s timer, LED on for buzzer
   - `handleAnswer(state, playerId, choice) → ...`: validate buzzedPlayerId === playerId, compute score delta, transition to REVEAL or open steal
   - `handleTimerExpired(state, name) → ...`: handle `R1_BUZZ_WINDOW` (auto-reveal as wrong if no answer) or `R1_STEAL_WINDOW` (REVEAL no steal)
4. Create `shared/src/rounds/r2-speed.ts`:
   - `handleAnswer(state, playerId, choice) → newState` (just records, doesn't transition)
   - `handleTimerExpired(state, 'R2_QUESTION_TIMER') → ...`: computes scores via `scoring.ts`, transitions to REVEAL
5. Create `shared/src/rounds/r3-picture-audio.ts`: imports r1 logic with `{ baseline: 200, stealBonus: 1.5, stealPenalty: -100 }` config
6. Create `shared/src/rounds/final-wager.ts`:
   - `handleWager(state, playerId, amount) → ...`: validate 0 ≤ amount ≤ playerScore; record; if all players wagered, transition to QUESTION_REVEAL
   - `handleAnswer(state, playerId, choice) → ...`: record; if all answered or timer expires, REVEAL
   - `handleTimerExpired(state, 'FINAL_WAGER_TIMER') → ...`: auto-reveal
7. Refactor `server/src/reducer.ts` to delegate based on `state.phase` + `state.currentRound`. Keep reducer thin: validate action shape, look up round controller, apply.
8. Create `server/src/timer-manager.ts`: per-room `Map<name, NodeJS.Timeout>`, methods schedule/clear/clearAll
9. Modify `server/src/room.ts` to execute side effects: `LED_HINT` events broadcast in state to host (host's BuzzManager applies them); `SCHEDULE_TIMER`/`CLEAR_TIMER` go to TimerManager
10. Write unit tests for each round controller covering happy paths + edge cases (e.g., player buzzes after lock-out, double answer attempt, all players score 0)
11. Manual integration test: run a full 4-round game with 2 buzz + 2 phone players, confirm scoring + transitions work

## Todo List
- [ ] Define round-types + SideEffect union
- [ ] Implement scoring functions + tests
- [ ] Implement R1 classic buzz-in logic
- [ ] Implement R1 steal mechanic
- [ ] Implement R2 speed round logic
- [ ] Implement R3 picture/audio (config-based reuse of R1)
- [ ] Implement final wager logic
- [ ] Build server-side timer manager
- [ ] Refactor reducer to delegate to round controllers
- [ ] Wire side effects (LED hints, timers) in Room
- [ ] Unit tests for all 4 rounds
- [ ] End-to-end integration test (full 4-round playthrough)

## Success Criteria
- All 4 rounds execute end-to-end without state corruption
- Scoring math matches spec (validated by unit tests)
- Steal mechanic: original buzzer locked out from steal, steal bonus/penalty applied
- Speed round: faster correct answers score higher; wrong answers score 0
- Wager round: scores can go to 0 but not negative on final (clamp)
- LED hints surface to host correctly (e.g., buzzer's LED lights when they buzz)

## Risk Assessment
- **R**: Reducer + side effects pattern gets twisty → **M**: keep side effects as plain data, executor is dumb; round controllers stay testable in isolation
- **R**: Timer race conditions (timer fires after phase already changed) → **M**: timer callbacks check current phase before dispatching; stale timers no-op
- **R**: Scoring math feels "off" in playtest → **M**: easy to tune via constants in `scoring.ts`; document defaults

## Security Considerations
- Server-side validation of all actions (player can't buzz if not in BUZZ_OPEN, can't answer outside ANSWER_LOCK, can't wager more than score)
- No client-trusted timestamps; server stamps all timing
- Phone latency means phones lose buzz races to hardware Buzz pads — accepted design tradeoff (don't compensate)

## Next Steps
- Phase 8 (screens) renders states produced by these controllers
- Phase 10 (audio) hooks into PLAY_SOUND side effects
