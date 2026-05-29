import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { AnimatedBg, CountUp, OrbitingRays, SlamIn, SplitText } from "@client/anim";

interface Props {
  state: GameState;
}

const PODIUM_LABELS = ["1st", "2nd", "3rd"];
const PODIUM_HEIGHTS = ["h-40", "h-28", "h-20"];
const PODIUM_BG = [
  "bg-gradient-to-b from-yellow-300 to-yellow-500",
  "bg-gradient-to-b from-cyan-200 to-cyan-400",
  "bg-gradient-to-b from-orange-300 to-orange-500",
];

export function PhoneWinnerScreen({ state }: Props) {
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top3 = ranked.slice(0, 3);

  return (
    <div className="phone-root flex flex-col items-center text-cyan-100 px-4 py-6 relative overflow-hidden">
      <AnimatedBg variant="rays" />
      <OrbitingRays
        size={800}
        speed="slow"
        className="absolute -inset-1/4 m-auto opacity-40 pointer-events-none"
      />

      <SlamIn flash="gold" scaleFrom={4} durationIn={0.7}>
        <h1 className="text-5xl font-display text-neon-gold tracking-wider text-glow-gold animate-chromatic-shake">
          WINNER!
        </h1>
      </SlamIn>

      {ranked[0] && (
        <motion.p
          initial={{ y: 20, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          className="mt-2 text-2xl font-display text-neon-gold text-glow-gold"
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

      <div className="mt-8 flex items-end justify-center gap-3 w-full relative z-10">
        {[1, 0, 2].map((podiumIdx) => {
          const player = top3[podiumIdx];
          if (!player) return <div key={podiumIdx} className="flex-1" />;
          const isWinner = podiumIdx === 0;
          return (
            <motion.div
              key={player.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.7,
                delay: 1.0 + podiumIdx * 0.25,
                ease: [0.16, 1.4, 0.3, 1],
              }}
              className="flex-1 flex flex-col items-center"
            >
              <motion.div
                animate={isWinner ? { y: [0, -6, 0] } : { y: [0, -3, 0] }}
                transition={{ duration: isWinner ? 1.8 : 2.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display text-lg ${
                  isWinner ? "bg-neon-gold text-black" : "bg-cyan-700 text-cyan-100"
                }`}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
              </motion.div>
              <p className={`mt-1 font-display tracking-wider text-sm truncate max-w-full text-center ${
                isWinner ? "text-neon-gold" : ""
              }`}>
                {player.name}
              </p>
              <p className={`font-display tabular-nums ${isWinner ? "text-neon-gold text-xl" : "text-sm"}`}>
                <CountUp value={player.score} duration={1.4} delay={1.2 + podiumIdx * 0.2} />
              </p>
              <div className={`${PODIUM_HEIGHTS[podiumIdx]} ${PODIUM_BG[podiumIdx]} w-full mt-1 rounded-t flex items-start justify-center pt-1 text-black font-display text-sm tracking-widest overflow-hidden ${
                isWinner ? "animate-bob" : ""
              }`}>
                {PODIUM_LABELS[podiumIdx]}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
