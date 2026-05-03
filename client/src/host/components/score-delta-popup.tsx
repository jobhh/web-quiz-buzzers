import { motion } from "framer-motion";

interface Props {
  delta: number;
}

export function ScoreDeltaPopup({ delta }: Props) {
  if (delta === 0) return null;
  const positive = delta > 0;
  return (
    <motion.span
      initial={{ y: 0, opacity: 0, scale: 0.8 }}
      animate={{ y: -40, opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`inline-block font-black text-2xl tabular-nums ${
        positive ? "text-green-400" : "text-red-400"
      }`}
    >
      {positive ? `+${delta}` : delta}
    </motion.span>
  );
}
