import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameState, Player } from "@shared/game-state";
import { PlayerAvatar } from "../components/player-avatar";
import { CountdownBar } from "../components/countdown-bar";
import {
  BUZZ_ANSWER_WINDOW_MS,
  STEAL_ANSWER_WINDOW_MS,
  FINAL_ANSWER_WINDOW_MS,
} from "@shared/scoring";
import { AnimatedBg, Shockwave, SplitText, flashScreen } from "@client/anim";
import { useScreenShake } from "@client/lib/use-screen-shake";

interface Props {
  state: GameState;
}

const FINAL_COLORS = [
  "bg-blue-500 text-white",
  "bg-orange-500 text-black",
  "bg-green-500 text-black",
  "bg-yellow-400 text-black",
];

const FINAL_ACCENT_RING = [
  "shadow-[0_0_30px_rgba(59,130,246,0.6)]",
  "shadow-[0_0_30px_rgba(249,115,22,0.6)]",
  "shadow-[0_0_30px_rgba(34,197,94,0.6)]",
  "shadow-[0_0_30px_rgba(250,204,21,0.6)]",
];

export function AnswerLockScreen({ state }: Props) {
  const isFinal = state.currentRound === 4;
  if (isFinal) return <FinalAnswerLock state={state} />;

  const buzzer = state.players.find((p) => p.id === state.buzzedPlayerId);
  const shake = useScreenShake();

  useEffect(() => {
    if (!buzzer) return;
    flashScreen("pink", 0.9, 0.5);
    shake("hard");
  }, [buzzer?.id, shake]);

  if (!buzzer) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6 relative">
        <AnimatedBg variant="grid" />
        <div>
          <h1 className="text-3xl font-display text-neon-pink mb-2">Buzzer left</h1>
          <p className="text-cyan-300 opacity-80">
            Tap <span className="font-bold">Next</span> to skip this question.
          </p>
        </div>
      </div>
    );
  }
  const isSteal = state.lockedOutPlayerIds.length > 0;
  const totalMs = isSteal ? STEAL_ANSWER_WINDOW_MS : BUZZ_ANSWER_WINDOW_MS;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
      <AnimatedBg variant="spotlight" />

      <p className="text-xs uppercase tracking-widest opacity-80 mb-3 font-display">
        {isSteal ? "Steal Answer" : "First Buzz"}
      </p>

      <div className="relative">
        <Shockwave active color={isSteal ? "#ff2a4a" : "#ff006e"} size={400} rings={4} />
        <Shockwave active color="#ffd700" size={280} rings={2} />

        <motion.div
          initial={{ scale: 0.2, opacity: 0, rotate: -25 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1.4, 0.3, 1] }}
          className="relative z-10 ring-pulse rounded-full"
        >
          <PlayerAvatar player={buzzer} size="lg" highlight />
        </motion.div>
      </div>

      <motion.h1
        initial={{ y: 40, opacity: 0, scale: 0.6 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className={`mt-6 text-7xl md:text-8xl font-display tracking-wider text-glow-pink animate-chromatic-shake`}
      >
        <SplitText
          text={buzzer.name.toUpperCase()}
          stagger={0.05}
          duration={0.5}
          delay={0.2}
          ease="back.out(2.6)"
          animKey={buzzer.id}
        />
      </motion.h1>
      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7 }}
        className="mt-4 text-neon-cyan uppercase tracking-[0.4em] text-sm font-display"
      >
        Pick your answer
      </motion.p>
      {state.buzzWindowEndsAt && (
        <div className="mt-8 w-96">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={totalMs} />
        </div>
      )}
    </div>
  );
}

function FinalAnswerLock({ state }: { state: GameState }) {
  const answers = state.speedRoundAnswers ?? {};
  const answered = state.players.filter((p) => answers[p.id] != null).length;
  const total = state.players.length;
  const q = state.currentQuestion;
  return (
    <div className="min-h-screen text-cyan-100 flex flex-col px-8 py-6 relative">
      <AnimatedBg variant="danger" />

      <header className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-80 font-display">
        <span>Round {state.currentRound} · Q{state.questionIndex + 1}</span>
        <span>{q?.category}</span>
      </header>

      <div className="flex justify-center mt-4 p-4">
        <motion.span
          animate={{
            scale: [1, 1.18, 1],
            rotate: [-1, 2, -1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block text-4xl md:text-5xl font-black font-display text-neon-gold drop-shadow-[0_0_20px_currentColor]"
        >
          FINAL — ANSWER!
        </motion.span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0 py-4">
        <motion.h1
          initial={{ scale: 0.6, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "backOut" }}
          className="text-5xl md:text-7xl font-display text-neon-gold max-w-4xl text-glow-gold leading-tight"
        >
          {q?.text}
        </motion.h1>
      </div>

      {q && (
        <div className="grid grid-cols-2 gap-4">
          {q.answers.map((a, i) => (
            <motion.div
              key={i}
              initial={{ y: 60, opacity: 0, rotateX: -45, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, rotateX: 0, scale: 1 }}
              transition={{
                duration: 0.55,
                delay: 0.5 + i * 0.14,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              className={`${FINAL_COLORS[i]} ${FINAL_ACCENT_RING[i]} rounded-lg p-5 flex items-center gap-4 text-2xl font-display overflow-hidden`}
            >
              <span className="text-5xl opacity-70 font-black drop-shadow">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="leading-tight">{a}</span>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <ul className="flex gap-2 flex-wrap">
          {state.players.map((p) => (
            <PlayerStatusPill
              key={p.id}
              player={p}
              answered={answers[p.id] != null}
              wager={state.wagers?.[p.id]}
            />
          ))}
        </ul>
        <span className="text-xl text-neon-cyan font-display tabular-nums">
          <span className="text-neon-gold">{answered}</span>/{total}
        </span>
      </div>

      {state.buzzWindowEndsAt && (
        <div className="mt-3 px-12">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={FINAL_ANSWER_WINDOW_MS} />
        </div>
      )}
    </div>
  );
}

function PlayerStatusPill({
  player,
  answered,
  wager,
}: {
  player: Player;
  answered: boolean;
  wager?: number;
}) {
  return (
    <motion.li
      layout
      animate={
        answered
          ? { scale: [1, 1.08, 1], borderColor: "#7CFC00" }
          : { borderColor: "rgba(0,245,255,0.3)" }
      }
      transition={{ duration: 0.4 }}
      className={`flex items-center gap-2 px-2 py-1.5 rounded border-2 transition-colors ${
        answered
          ? "bg-green-950/40 shadow-[0_0_18px_rgba(124,252,0,0.45)]"
          : "bg-cyan-950/30"
      }`}
    >
      <PlayerAvatar player={player} size="sm" />
      <div className="flex-1 min-w-0">
        <span className="font-display text-sm tracking-wider truncate block">
          {player.name}
        </span>
        {wager != null && (
          <span className="text-xs text-neon-gold opacity-80 tabular-nums">⚡{wager}</span>
        )}
      </div>
      <span
        className={`text-lg font-display ${
          answered ? "text-neon-green" : "opacity-30"
        }`}
        aria-label={answered ? "answered" : "waiting"}
      >
        {answered ? "✓" : "…"}
      </span>
    </motion.li>
  );
}
