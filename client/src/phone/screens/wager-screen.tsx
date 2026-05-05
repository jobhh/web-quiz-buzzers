import { useState } from "react";
import { motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";
import { AnimatedBg, CountUp, MagneticButton } from "@client/anim";

interface Props {
  state: GameState;
  me: Player;
}

export function WagerScreen({ me }: Props) {
  const max = Math.max(0, me.score);
  const [amount, setAmount] = useState(Math.floor(max / 2));
  const [submitted, setSubmitted] = useState(false);

  const onConfirm = () => {
    if (submitted) return;
    setSubmitted(true);
    if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    gameSession.send({ type: "WAGER", payload: { amount } });
  };

  return (
    <div className="phone-root relative flex flex-col items-center justify-center px-6 bg-black text-cyan-100 overflow-hidden">
      <AnimatedBg variant="danger" />
      <motion.p
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-xs uppercase opacity-80 tracking-[0.4em] font-display animate-chromatic-shake text-neon-gold"
      >
        Final wager
      </motion.p>
      <motion.p
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-1 text-sm opacity-90"
      >
        Score:{" "}
        <span className="font-display tabular-nums text-neon-cyan">{me.score}</span>
      </motion.p>
      <div className="mt-8 w-full max-w-sm">
        <p className="text-center text-7xl font-display text-neon-gold text-glow-gold tabular-nums">
          <CountUp value={amount} duration={0.25} />
        </p>
        <input
          type="range"
          min={0}
          max={max}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={submitted}
          className="w-full mt-4 accent-pink-500"
          style={{ height: 32 }}
        />
        <div className="flex justify-between mt-3 gap-2">
          {[25, 50, 75, 100].map((pct) => (
            <motion.button
              key={pct}
              type="button"
              disabled={submitted}
              whileTap={{ scale: 0.92 }}
              onClick={() => setAmount(Math.floor((max * pct) / 100))}
              className="flex-1 bg-cyan-800 disabled:opacity-40 text-cyan-100 text-xs py-3 rounded font-display tracking-widest active:bg-cyan-700"
            >
              {pct}%
            </motion.button>
          ))}
        </div>
      </div>
      <div className="relative mt-10">
        {!submitted && (
          <span className="absolute inset-0 rounded animate-pulse-ring border-2 border-neon-gold pointer-events-none" />
        )}
        <MagneticButton
          onClick={onConfirm}
          disabled={submitted}
          strength={0.3}
          className={`relative px-10 py-5 ${
            submitted
              ? "bg-green-600 text-black"
              : "bg-neon-pink text-black shadow-neon"
          } font-display uppercase tracking-[0.3em] rounded text-xl overflow-hidden`}
        >
          <span className="relative z-10">{submitted ? "Locked ✓" : "Lock In"}</span>
          {!submitted && <span className="scan-sweep-bar animate-scan-sweep" />}
        </MagneticButton>
      </div>
    </div>
  );
}
