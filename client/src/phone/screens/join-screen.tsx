import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import { AnimatedBg, MagneticButton, SplitText } from "@client/anim";

interface Props {
  initialRoomCode: string;
  errorMessage: string | null;
}

export function JoinScreen({ initialRoomCode, errorMessage }: Props) {
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const canSubmit = roomCode.length === 4 && name.trim().length > 0 && !submitted;

  useEffect(() => {
    if (errorMessage) setSubmitted(false);
  }, [errorMessage]);

  const onJoin = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    gameSession.send({
      type: "JOIN_ROOM",
      payload: { roomCode, playerName: name.trim(), deviceType: "phone" },
    });
  };

  return (
    <div className="phone-root relative flex flex-col items-stretch justify-center px-6 py-8 bg-black text-cyan-200 overflow-hidden">
      <AnimatedBg variant="grid" />

      <motion.h1
        initial={{ scale: 2.4, opacity: 0, y: -40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1.4, 0.3, 1] }}
        className="text-7xl font-display text-center tracking-widest text-neon-pink animate-neon-flicker mb-2"
      >
        <SplitText text="BUZZ" stagger={0.08} duration={0.7} />
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs uppercase opacity-70 mb-8 tracking-[0.5em] font-display"
      >
        phone player
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <label className="text-xs uppercase opacity-70 mt-2 font-display tracking-widest">
          Room Code
        </label>
        <input
          className="w-full bg-black border-2 border-neon-cyan/60 rounded text-3xl font-display text-center py-3 mt-1 uppercase tracking-[0.4em] text-glow-cyan focus:border-neon-pink focus:outline-none transition-colors"
          placeholder="XXXX"
          value={roomCode}
          maxLength={4}
          autoCapitalize="characters"
          autoCorrect="off"
          disabled={submitted}
          onChange={(e) =>
            setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85, duration: 0.5 }}
      >
        <label className="text-xs uppercase opacity-70 mt-5 font-display tracking-widest block">
          Your Name
        </label>
        <input
          className="w-full bg-black border-2 border-neon-cyan/60 rounded text-2xl py-3 px-3 mt-1 focus:border-neon-pink focus:outline-none transition-colors"
          placeholder="Player 1"
          value={name}
          maxLength={12}
          disabled={submitted}
          onChange={(e) => setName(e.target.value)}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="relative mt-8"
      >
        {canSubmit && (
          <span className="absolute -inset-1 rounded animate-pulse-ring border-2 border-neon-pink pointer-events-none" />
        )}
        <MagneticButton
          onClick={onJoin}
          disabled={!canSubmit}
          strength={0.25}
          className={`relative w-full ${
            canSubmit
              ? "bg-neon-pink text-black shadow-neon"
              : "bg-gray-700 text-gray-400"
          } text-xl font-display py-5 rounded uppercase tracking-[0.3em] overflow-hidden`}
        >
          <span className="relative z-10">{submitted ? "Joining…" : "Join Game"}</span>
          {canSubmit && <span className="scan-sweep-bar animate-scan-sweep" />}
        </MagneticButton>
      </motion.div>

      {errorMessage && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: [-10, 10, -8, 8, 0] }}
          className="mt-4 text-red-400 text-sm text-center"
        >
          {errorMessage}
        </motion.p>
      )}
    </div>
  );
}
