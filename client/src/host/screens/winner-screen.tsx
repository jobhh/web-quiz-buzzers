import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { gameSession } from "@client/state/game-session";
import { useConfetti } from "@client/lib/use-confetti";
import { useScreenShake } from "@client/lib/use-screen-shake";
import { PlayerAvatar } from "../components/player-avatar";
import {
  AnimatedBg,
  CountUp,
  MagneticButton,
  OrbitingRays,
  Shockwave,
  SlamIn,
  SplitText,
  flashScreen,
} from "@client/anim";

interface Props {
  state: GameState;
}

const PODIUM_LABELS = ["1st", "2nd", "3rd"];
const PODIUM_HEIGHTS = ["h-72", "h-56", "h-44"];
const PODIUM_BG = [
  "bg-gradient-to-b from-yellow-300 to-yellow-500",
  "bg-gradient-to-b from-cyan-200 to-cyan-400",
  "bg-gradient-to-b from-orange-300 to-orange-500",
];

export function WinnerScreen({ state }: Props) {
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top3 = ranked.slice(0, 3);
  const { storm, cannons } = useConfetti();
  const shake = useScreenShake();

  useEffect(() => {
    flashScreen("gold", 0.95, 1.0);
    shake("hard");
    storm();
    const t = setTimeout(() => cannons(), 1200);
    const t2 = setTimeout(() => cannons(), 2400);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [storm, cannons, shake]);

  return (
    <div className="min-h-screen text-cyan-100 px-8 py-6 flex flex-col items-center relative overflow-hidden">
      <AnimatedBg variant="rays" />
      <OrbitingRays
        size={1700}
        speed="slow"
        className="absolute -inset-1/4 m-auto opacity-50 pointer-events-none"
      />
      <OrbitingRays
        size={1100}
        speed="fast"
        className="absolute inset-0 m-auto opacity-30 pointer-events-none"
      />

      <SlamIn flash="gold" scaleFrom={4.5} durationIn={0.7}>
        <h1 className="text-8xl md:text-9xl font-display text-neon-gold tracking-widest mt-6 text-glow-gold animate-chromatic-shake">
          WINNER!
        </h1>
      </SlamIn>

      {ranked[0] && (
        <motion.p
          initial={{ y: 30, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="mt-3 text-4xl md:text-5xl font-display text-neon-gold text-glow-gold"
        >
          <SplitText
            text={ranked[0].name}
            stagger={0.08}
            duration={0.7}
            delay={0.8}
            ease="back.out(2.5)"
            animKey={ranked[0].id}
          />
        </motion.p>
      )}

      <div className="mt-12 flex items-end justify-center gap-6 w-full max-w-3xl relative z-10">
        {[1, 0, 2].map((podiumIdx) => {
          const player = top3[podiumIdx];
          if (!player) return <div key={podiumIdx} className="flex-1" />;
          const isWinner = podiumIdx === 0;
          return (
            <motion.div
              key={player.id}
              initial={{ y: 200, opacity: 0, rotateX: -45 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              transition={{
                duration: 0.7,
                delay: 1.0 + podiumIdx * 0.25,
                ease: [0.16, 1.4, 0.3, 1],
              }}
              className="flex-1 flex flex-col items-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="relative">
                {isWinner && <Shockwave active color="#ffd700" size={220} rings={4} />}
                <motion.div
                  animate={
                    isWinner
                      ? { y: [0, -10, 0] }
                      : { y: [0, -4, 0] }
                  }
                  transition={{
                    duration: isWinner ? 1.8 : 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <PlayerAvatar player={player} size="lg" highlight={isWinner} />
                </motion.div>
              </div>
              <p
                className={`mt-2 font-display tracking-wider truncate max-w-full text-center ${
                  isWinner ? "text-neon-gold text-2xl text-glow-gold" : ""
                }`}
              >
                {player.name}
              </p>
              <p
                className={`font-display tabular-nums ${
                  isWinner ? "text-neon-gold text-3xl text-glow-gold" : "text-yellow-300"
                }`}
              >
                <CountUp
                  value={player.score}
                  duration={1.4}
                  delay={1.2 + podiumIdx * 0.2}
                />
              </p>
              <div
                className={`${PODIUM_HEIGHTS[podiumIdx]} ${PODIUM_BG[podiumIdx]} relative w-full mt-2 rounded-t flex items-start justify-center pt-2 text-black font-display tracking-widest overflow-hidden ${
                  isWinner ? "shadow-neon-gold animate-bob" : ""
                }`}
              >
                <span className="relative z-10">{PODIUM_LABELS[podiumIdx]}</span>
                <span className="scan-sweep-bar animate-scan-sweep" />
              </div>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4, duration: 0.5 }}
        className="mt-10 relative"
      >
        <span className="absolute inset-0 rounded animate-pulse-ring border-2 border-neon-pink" />
        <MagneticButton
          onClick={() => gameSession.send({ type: "RESET_GAME" })}
          strength={0.45}
          className="relative px-8 py-4 bg-neon-pink text-black font-display uppercase tracking-[0.3em] rounded shadow-neon overflow-hidden"
        >
          <span className="relative z-10">Play Again</span>
          <span className="scan-sweep-bar animate-scan-sweep" />
        </MagneticButton>
      </motion.div>
    </div>
  );
}
