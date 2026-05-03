import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";

const ROUND_TITLES: Record<number, { title: string; subtitle: string }> = {
  1: { title: "Round 1", subtitle: "Classic Buzz-In" },
  2: { title: "Round 2", subtitle: "Speed Round" },
  3: { title: "Round 3", subtitle: "Picture & Audio" },
  4: { title: "Final", subtitle: "Wager It All" },
};

interface Props {
  state: GameState;
}

export function RoundIntroScreen({ state }: Props) {
  const { title, subtitle } = ROUND_TITLES[state.currentRound] ?? {
    title: "Round",
    subtitle: "",
  };
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
      <motion.h1
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-[12vw] font-black tracking-widest text-pink-400 leading-none"
      >
        {title.toUpperCase()}
      </motion.h1>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        className="mt-2 text-3xl tracking-widest text-cyan-300 uppercase"
      >
        {subtitle}
      </motion.p>
    </div>
  );
}
