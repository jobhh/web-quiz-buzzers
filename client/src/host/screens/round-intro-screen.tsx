import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { AnimatedBg, OrbitingRays, SlamIn, SplitText, flashScreen } from "@client/anim";
import { useScreenShake } from "@client/lib/use-screen-shake";

const ROUND_TITLES: Record<number, { title: string; subtitle: string; accent: string; bg: "grid" | "rays" | "spotlight" | "danger" }> = {
  1: { title: "Round 1", subtitle: "Classic Buzz-In", accent: "text-neon-pink", bg: "grid" },
  2: { title: "Round 2", subtitle: "Speed Round", accent: "text-neon-cyan", bg: "spotlight" },
  3: { title: "Round 3", subtitle: "Picture & Audio", accent: "text-neon-gold", bg: "grid" },
  4: { title: "Final", subtitle: "Wager It All", accent: "text-neon-gold", bg: "danger" },
};

interface Props {
  state: GameState;
}

export function RoundIntroScreen({ state }: Props) {
  const { title, subtitle, accent, bg } = ROUND_TITLES[state.currentRound] ?? {
    title: "Round",
    subtitle: "",
    accent: "text-neon-pink",
    bg: "grid" as const,
  };
  const shake = useScreenShake();

  useEffect(() => {
    flashScreen(state.currentRound === 4 ? "gold" : "white", 0.7, 0.7);
    shake("hard");
  }, [state.currentRound, shake]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
      <AnimatedBg variant={bg} />
      {state.currentRound === 4 && (
        <>
          <OrbitingRays
            size={1400}
            speed="slow"
            className="absolute inset-0 m-auto opacity-50"
          />
          <OrbitingRays
            size={900}
            speed="fast"
            className="absolute inset-0 m-auto opacity-40"
          />
        </>
      )}

      <motion.div
        initial={{ scaleX: 1.4, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-40 bg-gradient-to-r from-transparent via-neon-pink/30 to-transparent pointer-events-none"
      />

      <SlamIn flash={state.currentRound === 4 ? "gold" : "white"} animKey={state.currentRound}>
        <h1
          className={`text-[14vw] font-display tracking-widest leading-none ${accent} ${
            state.currentRound === 4 ? "animate-chromatic-shake text-glow-gold" : "text-glow-pink"
          }`}
        >
          {title.toUpperCase()}
        </h1>
      </SlamIn>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6, ease: "backOut" }}
        className="mt-2"
      >
        <p className="text-3xl md:text-4xl tracking-[0.3em] uppercase text-neon-cyan text-glow-cyan font-display">
          <SplitText
            text={subtitle}
            stagger={0.04}
            duration={0.6}
            delay={0.6}
            ease="back.out(2)"
            animKey={`${state.currentRound}-sub`}
          />
        </p>
      </motion.div>
    </div>
  );
}
