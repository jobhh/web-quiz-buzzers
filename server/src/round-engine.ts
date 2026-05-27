// Round state-transition engine. Called from Room in response to player
// actions (BUZZ, ANSWER, WAGER, NEXT_QUESTION) and timer events.
//
// Each function takes the current GameState + room-private context (the
// pack's RoundQuestions) and returns either:
//   - { state, schedule?: { name, delayMs }, clear?: string[] }
// The Room is responsible for actually scheduling the timer.

import type {
  GameState,
  Player,
  QuestionPublic,
  RevealResult,
  RoundIndex,
  SpeedRoundAnswer,
} from "@shared/game-state";
import type { Question, RoundQuestions } from "@shared/pack-types";
import {
  BUZZ_ANSWER_WINDOW_MS,
  BUZZ_OPEN_IDLE_MS,
  FINAL_ANSWER_WINDOW_MS,
  FINAL_WAGER_WINDOW_MS,
  R2_WINDOW_MS,
  STEAL_ANSWER_WINDOW_MS,
  computeR2Score,
  paramsForRound,
} from "@shared/scoring";

export interface EngineResult {
  state: GameState;
  schedule?: { name: string; delayMs: number; event: TimerEvent };
  clear?: string[];
}

// Timer events the engine knows how to react to. The Room turns these into
// real setTimeout callbacks; on fire it calls handleTimerExpired().
export type TimerEvent =
  | "BUZZ_OPEN_IDLE"
  | "BUZZ_ANSWER_WINDOW"
  | "STEAL_ANSWER_WINDOW"
  | "R2_WINDOW"
  | "FINAL_WAGER_WINDOW"
  | "FINAL_ANSWER_WINDOW";

const ALL_TIMERS: string[] = [
  "BUZZ_OPEN_IDLE",
  "BUZZ_ANSWER_WINDOW",
  "STEAL_ANSWER_WINDOW",
  "R2_WINDOW",
  "FINAL_WAGER_WINDOW",
  "FINAL_ANSWER_WINDOW",
];

// === public API ============================================================

// Begins the next question of the current round, OR rolls into the next round.
// Called when host clicks NEXT_QUESTION from REVEAL/SCOREBOARD/ROUND_INTRO,
// and internally on START_GAME.
export function advanceFromIntroOrReveal(
  state: GameState,
  rounds: RoundQuestions,
): EngineResult {
  // ROUND_INTRO → first question of round (skip the old QUESTION_REVEAL gate;
  // BUZZ_OPEN now carries both the question reveal animation and the buzz race).
  if (state.phase === "ROUND_INTRO") {
    return enterQuestionAndOpen(state, rounds, /* questionIndex */ 0);
  }
  // SCOREBOARD → next round intro
  if (state.phase === "SCOREBOARD") {
    const nextRound = (state.currentRound + 1) as RoundIndex;
    if (nextRound > 4) {
      // Game over (shouldn't normally hit — final reveal goes straight to WINNER).
      return { state: { ...state, phase: "WINNER" }, clear: ALL_TIMERS };
    }
    return {
      state: {
        ...state,
        phase: "ROUND_INTRO",
        currentRound: nextRound,
        questionIndex: 0,
        currentQuestion: undefined,
        buzzedPlayerId: undefined,
        buzzWindowEndsAt: undefined,
        lockedOutPlayerIds: [],
        speedRoundAnswers: undefined,
        wagers: undefined,
        lastReveal: undefined,
      },
      clear: ALL_TIMERS,
    };
  }
  // REVEAL → next question, or round-end transition
  if (state.phase === "REVEAL") {
    const nextIndex = state.questionIndex + 1;
    const list = listForRound(rounds, state.currentRound);
    if (nextIndex < list.length) {
      // Final round: each question gets its own wager phase, not BUZZ_OPEN.
      if (state.currentRound === 4) {
        return enterFinalWager(state, rounds, nextIndex);
      }
      return enterQuestionAndOpen(state, rounds, nextIndex);
    }
    // End of this round. Final → WINNER. Otherwise → SCOREBOARD.
    if (state.currentRound === 4) {
      return { state: { ...state, phase: "WINNER" }, clear: ALL_TIMERS };
    }
    return {
      state: { ...state, phase: "SCOREBOARD", currentQuestion: undefined },
      clear: ALL_TIMERS,
    };
  }
  // From BUZZ_OPEN with no buzzes, host can force a reveal → no scoring.
  if (state.phase === "BUZZ_OPEN") {
    return enterReveal(state, rounds, null, null);
  }
  return { state };
}

// Player action: BUZZ. Only valid in BUZZ_OPEN for R1/R3 (rounds with
// classic-mechanic). For R2, BUZZ is ignored (speed round uses ANSWER).
export function handleBuzz(state: GameState, playerId: string): EngineResult {
  if (state.phase !== "BUZZ_OPEN") return { state };
  if (state.currentRound === 2 || state.currentRound === 4) return { state };
  if (!state.players.some((p) => p.id === playerId)) return { state };
  if (state.lockedOutPlayerIds.includes(playerId)) return { state };
  if (state.buzzedPlayerId) return { state };
  // First valid buzz wins. Lock the question to this player; start answer timer.
  const isSteal = state.lockedOutPlayerIds.length > 0;
  const windowMs = isSteal ? STEAL_ANSWER_WINDOW_MS : BUZZ_ANSWER_WINDOW_MS;
  return {
    state: {
      ...state,
      phase: "ANSWER_LOCK",
      buzzedPlayerId: playerId,
      buzzWindowEndsAt: Date.now() + windowMs,
    },
    clear: ["BUZZ_OPEN_IDLE"],
    schedule: {
      name: isSteal ? "STEAL_ANSWER_WINDOW" : "BUZZ_ANSWER_WINDOW",
      delayMs: windowMs,
      event: isSteal ? "STEAL_ANSWER_WINDOW" : "BUZZ_ANSWER_WINDOW",
    },
  };
}

// Player action: ANSWER. Behavior depends on phase + round.
export function handleAnswer(
  state: GameState,
  rounds: RoundQuestions,
  playerId: string,
  choice: 0 | 1 | 2 | 3,
): EngineResult {
  // R1/R3 ANSWER_LOCK: only the buzzer can answer.
  if (state.phase === "ANSWER_LOCK" && (state.currentRound === 1 || state.currentRound === 3)) {
    if (state.buzzedPlayerId !== playerId) return { state };
    return resolveBuzzAnswer(state, rounds, playerId, choice);
  }
  // R2 BUZZ_OPEN: anyone can answer at most once.
  if (state.phase === "BUZZ_OPEN" && state.currentRound === 2) {
    const prior = state.speedRoundAnswers?.[playerId];
    if (prior) return { state };
    const ts = Date.now();
    const next: Record<string, SpeedRoundAnswer> = {
      ...(state.speedRoundAnswers ?? {}),
      [playerId]: { choice, timestamp: ts },
    };
    const allAnswered = state.players.every((p) => next[p.id] != null);
    if (allAnswered) {
      return resolveSpeedRound(
        { ...state, speedRoundAnswers: next },
        rounds,
      );
    }
    return { state: { ...state, speedRoundAnswers: next } };
  }
  // Final ANSWER_LOCK: collect from each player.
  if (state.phase === "ANSWER_LOCK" && state.currentRound === 4) {
    const prior = state.speedRoundAnswers?.[playerId];
    if (prior) return { state };
    const ts = Date.now();
    const next: Record<string, SpeedRoundAnswer> = {
      ...(state.speedRoundAnswers ?? {}),
      [playerId]: { choice, timestamp: ts },
    };
    const allAnswered = state.players.every((p) => next[p.id] != null);
    if (allAnswered) {
      return resolveFinalAnswer({ ...state, speedRoundAnswers: next }, rounds);
    }
    return { state: { ...state, speedRoundAnswers: next } };
  }
  return { state };
}

// Player action: WAGER. Only valid in FINAL_WAGER phase.
export function handleWager(
  state: GameState,
  playerId: string,
  amount: number,
): EngineResult {
  if (state.phase !== "FINAL_WAGER") return { state };
  if (state.wagers && state.wagers[playerId] != null) return { state };
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { state };
  // Clamp 0..score to defend against a malicious client.
  const clamped = Math.max(0, Math.min(amount, player.score));
  const wagers = { ...(state.wagers ?? {}), [playerId]: clamped };
  const allWagered = state.players.every((p) => wagers[p.id] != null);
  if (!allWagered) return { state: { ...state, wagers } };
  // Everyone wagered — open the question for answering.
  return enterFinalQuestion({ ...state, wagers });
}

// Server-fired event: a scheduled timer reached its deadline.
export function handleTimerExpired(
  state: GameState,
  rounds: RoundQuestions,
  event: TimerEvent,
): EngineResult {
  switch (event) {
    case "BUZZ_OPEN_IDLE":
      // No one buzzed in time → reveal with no scoring.
      if (state.phase !== "BUZZ_OPEN") return { state };
      return enterReveal(state, rounds, null, null);
    case "BUZZ_ANSWER_WINDOW":
      // Buzzer didn't answer in time → counts as wrong (can be stolen).
      if (state.phase !== "ANSWER_LOCK") return { state };
      if (state.currentRound !== 1 && state.currentRound !== 3) return { state };
      return openSteal(state);
    case "STEAL_ANSWER_WINDOW":
      // Stealer didn't answer in time → reveal, no further changes.
      if (state.phase !== "ANSWER_LOCK") return { state };
      return enterReveal(state, rounds, null, null);
    case "R2_WINDOW":
      // Speed round window over → score whoever answered.
      if (state.phase !== "BUZZ_OPEN" || state.currentRound !== 2) return { state };
      return resolveSpeedRound(state, rounds);
    case "FINAL_WAGER_WINDOW":
      // Auto-zero any wagers not submitted, then proceed.
      if (state.phase !== "FINAL_WAGER") return { state };
      return autoCompleteFinalWagers(state);
    case "FINAL_ANSWER_WINDOW":
      // Auto-resolve final answers (any non-answers counted as 'no answer' → wrong).
      if (state.phase !== "ANSWER_LOCK" || state.currentRound !== 4) return { state };
      return resolveFinalAnswer(state, rounds);
  }
}

// === internal helpers ======================================================

function listForRound(rounds: RoundQuestions, round: RoundIndex): Question[] {
  if (round === 1) return rounds.r1;
  if (round === 2) return rounds.r2;
  if (round === 3) return rounds.r3;
  return rounds.final;
}

function getCurrentQuestion(
  state: GameState,
  rounds: RoundQuestions,
): Question | null {
  const list = listForRound(rounds, state.currentRound);
  return list[state.questionIndex] ?? null;
}

function toPublic(q: Question): QuestionPublic {
  return {
    text: q.text,
    answers: q.answers,
    category: q.category,
    media: q.media ?? null,
  };
}

// Populates the next question AND opens the buzz window in a single phase.
// The host screen handles "reveal" animation entirely client-side via
// staggered Framer Motion entrances; meanwhile buzzes are immediately valid.
function enterQuestionAndOpen(
  state: GameState,
  rounds: RoundQuestions,
  questionIndex: number,
): EngineResult {
  const list = listForRound(rounds, state.currentRound);
  const q = list[questionIndex];
  if (!q) {
    // Fall through to round end if asked for a non-existent question.
    if (state.currentRound === 4) {
      return { state: { ...state, phase: "WINNER" }, clear: ALL_TIMERS };
    }
    return {
      state: { ...state, phase: "SCOREBOARD", currentQuestion: undefined },
      clear: ALL_TIMERS,
    };
  }

  const isSpeed = state.currentRound === 2;
  const windowMs = isSpeed ? R2_WINDOW_MS : BUZZ_OPEN_IDLE_MS;
  const timerName = isSpeed ? "R2_WINDOW" : "BUZZ_OPEN_IDLE";
  const timerEvent = timerName;

  return {
    state: {
      ...state,
      phase: "BUZZ_OPEN",
      questionIndex,
      currentQuestion: toPublic(q),
      buzzedPlayerId: undefined,
      lockedOutPlayerIds: [],
      speedRoundAnswers: undefined,
      lastReveal: undefined,
      wrongAnswers: undefined,
      buzzWindowEndsAt: Date.now() + windowMs,
    },
    clear: ALL_TIMERS,
    schedule: { name: timerName, delayMs: windowMs, event: timerEvent },
  };
}

function resolveBuzzAnswer(
  state: GameState,
  rounds: RoundQuestions,
  playerId: string,
  choice: 0 | 1 | 2 | 3,
): EngineResult {
  const q = getCurrentQuestion(state, rounds);
  if (!q) return { state };
  const params = paramsForRound(state.currentRound);
  if (!params) return { state };
  const correct = choice === q.correct;
  const isSteal = state.lockedOutPlayerIds.length > 0;

  const deltas: Record<string, number> = {};
  for (const p of state.players) deltas[p.id] = 0;

  if (correct) {
    if (isSteal) {
      const stealReward = Math.round(params.baseline * params.stealMultiplier);
      deltas[playerId] = stealReward;
      // Penalize the original buzzer (the one currently in lockedOutPlayerIds[0]).
      const originalId = state.lockedOutPlayerIds[0];
      if (originalId && originalId !== playerId) {
        deltas[originalId] = -params.originalPenaltyOnSteal;
      }
    } else {
      deltas[playerId] = params.baseline;
    }
    return enterReveal(state, rounds, q.correct, deltas, {
      buzzedPlayerId: playerId,
      buzzedAnswer: choice,
      buzzedCorrect: true,
    });
  }

  // Wrong answer.
  if (isSteal) {
    // Steal wrong: penalize the stealer, no further attempts.
    deltas[playerId] = -params.stealWrongPenalty;
    return enterReveal(state, rounds, q.correct, deltas, {
      buzzedPlayerId: playerId,
      buzzedAnswer: choice,
      buzzedCorrect: false,
    });
  }
  // Original buzzer wrong: open steal window for everyone else.
  const wrongAnswers = [...(state.wrongAnswers ?? []), choice];
  return openSteal({ ...state, wrongAnswers });
}

function openSteal(state: GameState): EngineResult {
  // Lock out the player who just buzzed (or who was holding the lock on timeout).
  const originalId = state.buzzedPlayerId ?? state.lockedOutPlayerIds[0];
  const lockedOut = originalId
    ? Array.from(new Set([...state.lockedOutPlayerIds, originalId]))
    : state.lockedOutPlayerIds;
  return {
    state: {
      ...state,
      phase: "BUZZ_OPEN",
      buzzedPlayerId: undefined,
      lockedOutPlayerIds: lockedOut,
      buzzWindowEndsAt: Date.now() + BUZZ_OPEN_IDLE_MS,
    },
    clear: ["BUZZ_ANSWER_WINDOW"],
    schedule: {
      name: "BUZZ_OPEN_IDLE",
      delayMs: BUZZ_OPEN_IDLE_MS,
      event: "BUZZ_OPEN_IDLE",
    },
  };
}

function resolveSpeedRound(state: GameState, rounds: RoundQuestions): EngineResult {
  const q = getCurrentQuestion(state, rounds);
  if (!q) return { state };
  const startedAt = (state.buzzWindowEndsAt ?? Date.now()) - R2_WINDOW_MS;
  const deltas: Record<string, number> = {};
  for (const p of state.players) {
    const ans = state.speedRoundAnswers?.[p.id];
    if (!ans) {
      deltas[p.id] = 0;
      continue;
    }
    const elapsed = ans.timestamp - startedAt;
    deltas[p.id] = computeR2Score(ans.choice === q.correct, elapsed);
  }
  return enterReveal(state, rounds, q.correct, deltas);
}

function resolveFinalAnswer(state: GameState, rounds: RoundQuestions): EngineResult {
  const q = getCurrentQuestion(state, rounds);
  if (!q) return { state };
  const deltas: Record<string, number> = {};
  for (const p of state.players) {
    const ans = state.speedRoundAnswers?.[p.id];
    const wager = state.wagers?.[p.id] ?? 0;
    if (!ans) {
      deltas[p.id] = -wager; // no answer = treat as wrong
      continue;
    }
    deltas[p.id] = ans.choice === q.correct ? wager : -wager;
  }
  return enterReveal(state, rounds, q.correct, deltas);
}

function enterReveal(
  state: GameState,
  rounds: RoundQuestions,
  correctIndex: number | null,
  deltas: Record<string, number> | null,
  extra?: Partial<RevealResult>,
): EngineResult {
  const safeDeltas: Record<string, number> = deltas ?? {};
  // Always resolve the correct answer so the reveal screen can highlight it.
  const resolvedCorrect = correctIndex ?? getCurrentQuestion(state, rounds)?.correct ?? -1;
  // Apply deltas to player scores. Final round clamps at 0 (no negative scores).
  const isFinal = state.currentRound === 4;
  const players: Player[] = state.players.map((p) => {
    const d = safeDeltas[p.id] ?? 0;
    let next = p.score + d;
    if (isFinal && next < 0) next = 0;
    return { ...p, score: next };
  });
  const reveal: RevealResult = {
    correctIndex: resolvedCorrect,
    scoreDeltas: safeDeltas,
    ...extra,
  };
  // Resolve current question to see if we should fall through to next phase later.
  void rounds;
  return {
    state: {
      ...state,
      phase: "REVEAL",
      players,
      lastReveal: reveal,
      buzzedPlayerId: extra?.buzzedPlayerId ?? state.buzzedPlayerId,
    },
    clear: ALL_TIMERS,
  };
}

function enterFinalQuestion(state: GameState): EngineResult {
  return {
    state: {
      ...state,
      phase: "ANSWER_LOCK",
      speedRoundAnswers: {},
      buzzWindowEndsAt: Date.now() + FINAL_ANSWER_WINDOW_MS,
    },
    clear: ALL_TIMERS,
    schedule: {
      name: "FINAL_ANSWER_WINDOW",
      delayMs: FINAL_ANSWER_WINDOW_MS,
      event: "FINAL_ANSWER_WINDOW",
    },
  };
}

// FINAL_WAGER entry. Used for both R3→R4 transition and per-question wagers
// inside R4. Each final question gets a fresh wager round.
export function enterFinalWager(
  state: GameState,
  rounds: RoundQuestions,
  index: number = 0,
): EngineResult {
  const q = rounds.final[index];
  if (!q) {
    return { state: { ...state, phase: "WINNER" }, clear: ALL_TIMERS };
  }
  return {
    state: {
      ...state,
      phase: "FINAL_WAGER",
      currentRound: 4,
      questionIndex: index,
      currentQuestion: toPublic(q),
      wagers: {},
      speedRoundAnswers: {},
      lockedOutPlayerIds: [],
      buzzedPlayerId: undefined,
      buzzWindowEndsAt: Date.now() + FINAL_WAGER_WINDOW_MS,
      lastReveal: undefined,
    },
    clear: ALL_TIMERS,
    schedule: {
      name: "FINAL_WAGER_WINDOW",
      delayMs: FINAL_WAGER_WINDOW_MS,
      event: "FINAL_WAGER_WINDOW",
    },
  };
}

function autoCompleteFinalWagers(state: GameState): EngineResult {
  const wagers = { ...(state.wagers ?? {}) };
  for (const p of state.players) {
    if (wagers[p.id] == null) wagers[p.id] = 0;
  }
  return enterFinalQuestion({ ...state, wagers });
}
