import { motion } from "framer-motion";

interface Props {
  delta: number;
}

export function ScoreDeltaPopup({ delta }: Props) {
  if (delta === 0) return null;
  const positive = delta > 0;
  const big = Math.abs(delta) >= 200;
  return (
    <motion.span
      key={delta}
      initial={{ y: 18, opacity: 0, scale: 0.4, rotate: positive ? -25 : 25 }}
      animate={{
        y: -48,
        opacity: 1,
        scale: big ? 1.4 : 1.15,
        rotate: 0,
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.7,
        ease: [0.22, 1.5, 0.36, 1],
      }}
      className={`inline-block font-display text-2xl tabular-nums ${
        positive
          ? big
            ? "text-neon-gold text-glow-gold"
            : "text-neon-green"
          : "text-red-400"
      }`}
      style={{
        textShadow: positive
          ? "0 0 12px currentColor, 0 0 24px currentColor"
          : "0 0 8px currentColor",
      }}
    >
      {positive ? `+${delta}` : delta}
    </motion.span>
  );
}
