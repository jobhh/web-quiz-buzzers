import { useEffect } from "react";
import { motion } from "framer-motion";
import type { GameState } from "@shared/game-state";
import { useConfetti } from "@client/lib/use-confetti";
import { PlayerAvatar } from "../components/player-avatar";

interface Props {
  state: GameState;
}

const PODIUM_LABELS = ["1st", "2nd", "3rd"];
const PODIUM_HEIGHTS = ["h-72", "h-56", "h-44"];
const PODIUM_BG = ["bg-yellow-400", "bg-cyan-300", "bg-orange-400"];

export function WinnerScreen({ state }: Props) {
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const top3 = ranked.slice(0, 3);
  const { storm } = useConfetti();

  useEffect(() => {
    storm();
  }, [storm]);

  return (
    <div className="min-h-screen bg-black text-cyan-100 px-8 py-6 flex flex-col items-center">
      <motion.h1
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "backOut" }}
        className="text-7xl md:text-8xl font-black text-pink-400 tracking-widest mt-8"
      >
        WINNER!
      </motion.h1>
      {ranked[0] && (
        <p className="mt-2 text-3xl text-yellow-300 font-black">{ranked[0].name}</p>
      )}
      <div className="mt-12 flex items-end justify-center gap-6 w-full max-w-3xl">
        {[1, 0, 2].map((podiumIdx) => {
          const player = top3[podiumIdx];
          if (!player) return <div key={podiumIdx} className="flex-1" />;
          return (
            <motion.div
              key={player.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 + podiumIdx * 0.2 }}
              className="flex-1 flex flex-col items-center"
            >
              <PlayerAvatar player={player} size="lg" highlight={podiumIdx === 0} />
              <p className="mt-2 font-black truncate max-w-full text-center">{player.name}</p>
              <p className="text-yellow-300 font-black tabular-nums">{player.score}</p>
              <div
                className={`${PODIUM_HEIGHTS[podiumIdx]} ${PODIUM_BG[podiumIdx]} w-full mt-2 rounded-t flex items-start justify-center pt-2 text-black font-black`}
              >
                {PODIUM_LABELS[podiumIdx]}
              </div>
            </motion.div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => location.reload()}
        className="mt-10 px-6 py-3 bg-pink-500 text-black font-black uppercase tracking-wider rounded"
      >
        Play Again
      </button>
    </div>
  );
}
