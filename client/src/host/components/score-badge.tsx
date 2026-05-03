import { motion } from "framer-motion";

interface Props {
  score: number;
}

// Animated score pill. Number changes use a quick scale pop for emphasis.
export function ScoreBadge({ score }: Props) {
  return (
    <motion.span
      key={score}
      initial={{ scale: 1.4, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="inline-block px-3 py-0.5 rounded-full bg-yellow-300 text-black font-black text-sm tabular-nums"
    >
      {score}
    </motion.span>
  );
}
