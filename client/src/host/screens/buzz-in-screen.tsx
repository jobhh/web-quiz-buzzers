import { motion } from "framer-motion";
import type { GameState, Player } from "@shared/game-state";
import { MediaPlayer } from "../components/media-player";
import { CountdownBar } from "../components/countdown-bar";
import { PlayerAvatar } from "../components/player-avatar";
import { R2_WINDOW_MS, BUZZ_OPEN_IDLE_MS } from "@shared/scoring";
import { AnimatedBg, ScanSweep, SplitText } from "@client/anim";

const COLORS = [
  "bg-blue-500 text-white",
  "bg-orange-500 text-black",
  "bg-green-500 text-black",
  "bg-yellow-400 text-black",
];
const ACCENT_RING = [
  "shadow-[0_0_30px_rgba(59,130,246,0.6)]",
  "shadow-[0_0_30px_rgba(249,115,22,0.6)]",
  "shadow-[0_0_30px_rgba(34,197,94,0.6)]",
  "shadow-[0_0_30px_rgba(250,204,21,0.6)]",
];

interface Props {
  state: GameState;
}

export function BuzzInScreen({ state }: Props) {
  const q = state.currentQuestion;
  if (!q) return null;
  const isSpeed = state.currentRound === 2;
  const isSteal = state.lockedOutPlayerIds.length > 0;
  const totalMs = isSpeed ? R2_WINDOW_MS : BUZZ_OPEN_IDLE_MS;
  const animKey = `${state.currentRound}-${state.questionIndex}`;

  return (
    <div className="min-h-screen text-cyan-100 flex flex-col px-8 py-6 relative">
      <AnimatedBg variant={isSteal ? "danger" : isSpeed ? "spotlight" : "grid"} />

      <header className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-80 font-display">
        <span>Round {state.currentRound} · Q{state.questionIndex + 1}</span>
        <span>{q.category}</span>
      </header>

      <div className="flex justify-center mt-4 p-4">
        <motion.span
          animate={{
            scale: [1, 1.18, 1],
            rotate: [-1, 2, -1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
          className={`inline-block text-4xl md:text-5xl font-black font-display text-neon-pink drop-shadow-[0_0_20px_currentColor]`}
        >
          {isSpeed ? "ANSWER NOW!" : isSteal ? "STEAL OPEN!" : "BUZZ IN!"}
        </motion.span>
      </div>

      {/* Question + media: centered vertical block. */}
      <div className="flex-1 flex flex-col items-center justify-center text-center min-h-0 py-6">
        <motion.h1
          initial={{ y: 24, opacity: 0, scale: 0.94 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-display max-w-5xl mx-auto leading-tight text-glow-cyan"
        >
          <SplitText
            text={q.text}
            mode="words"
            stagger={0.06}
            duration={0.55}
            ease="back.out(1.6)"
            animKey={animKey}
            from={{ y: 26, opacity: 0, rotate: -3 }}
          />
        </motion.h1>
        {q.media && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0, rotate: -2 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: "backOut" }}
            className="mt-6 flex justify-center"
          >
            <MediaPlayer media={q.media} packId={state.packId} />
          </motion.div>
        )}
      </div>

      {/* Answers anchored under the question. */}
      <div className="grid grid-cols-2 gap-4">
        {q.answers.map((a, i) => {
          const isWrong = state.wrongAnswers?.includes(i) ?? false;
          return (
            <motion.div
              key={i}
              initial={{ y: 60, opacity: 0, rotateX: -45, scale: 0.9 }}
              animate={
                isWrong
                  ? { y: 0, opacity: 0.35, rotateX: 0, scale: 0.92, filter: "saturate(0.2) brightness(0.6)" }
                  : { y: 0, opacity: 1, rotateX: 0, scale: 1 }
              }
              transition={{
                duration: 0.55,
                delay: 0.5 + i * 0.14,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              whileHover={isWrong ? {} : { scale: 1.03, rotate: 0.5 }}
              className={`${COLORS[i]} ${isWrong ? "" : ACCENT_RING[i]} relative rounded-lg p-5 flex items-center gap-4 text-2xl font-display overflow-hidden`}
            >
              {!isWrong && <ScanSweep />}
              <span className="text-5xl opacity-70 font-black drop-shadow">
                {String.fromCharCode(65 + i)}
              </span>
              <span className={`leading-tight relative z-10 ${isWrong ? "line-through" : ""}`}>{a}</span>
              {isWrong && (
                <span className="ml-auto text-4xl opacity-70">✗</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Speed round: live submission status under the answers. */}
      {isSpeed && (
        <SpeedSubmissionStatus state={state} />
      )}

      {state.buzzWindowEndsAt && (
        <div className="mt-4 px-12">
          <CountdownBar endsAt={state.buzzWindowEndsAt} totalMs={totalMs} />
        </div>
      )}
    </div>
  );
}

// Per-player answered/waiting indicator for the Speed round (R2). Hides
// the chosen answer to keep it private until reveal — only shows that the
// player has submitted.
function SpeedSubmissionStatus({ state }: { state: GameState }) {
  const answers = state.speedRoundAnswers ?? {};
  const answered = state.players.filter((p) => answers[p.id] != null).length;
  const total = state.players.length;
  return (
    <div className="mt-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest opacity-70 font-display">
          Submissions
        </p>
        <p className="text-sm font-display tabular-nums">
          <span className="text-neon-cyan">{answered}</span> / {total}
        </p>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {state.players.map((p) => (
          <PlayerStatusPill key={p.id} player={p} answered={answers[p.id] != null} />
        ))}
      </ul>
    </div>
  );
}

function PlayerStatusPill({ player, answered }: { player: Player; answered: boolean }) {
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
      <span className="font-display text-sm tracking-wider truncate flex-1">
        {player.name}
      </span>
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
