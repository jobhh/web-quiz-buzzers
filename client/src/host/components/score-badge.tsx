import { CountUp } from "@client/anim";

interface Props {
  score: number;
}

export function ScoreBadge({ score }: Props) {
  return (
    <span className="inline-block px-3 py-0.5 rounded-full bg-neon-gold text-black font-display text-sm tabular-nums shadow-neon-gold">
      <CountUp value={score} duration={0.45} />
    </span>
  );
}
