import { useState } from "react";
import { motion } from "framer-motion";
import { buzzManager } from "@client/hid/buzz-manager";
import { AnimatedBg, MagneticButton, SplitText } from "@client/anim";

interface Props {
  onContinue: () => void;
}

// Pre-lobby: prompts host to grant WebHID and connect at least one Buzz dongle.
// Continues to LobbyScreen once 1+ dongles are attached, OR allows skipping
// (phone-only games are valid).
export function SetupScreen({ onContinue }: Props) {
  const [error, setError] = useState<string | null>(null);
  const supported = buzzManager.isSupported();

  const onConnectDongle = async () => {
    setError(null);
    try {
      const c = await buzzManager.requestDongle();
      if (c) onContinue();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="min-h-screen p-10 font-mono flex flex-col items-center justify-center text-center relative">
      <AnimatedBg variant="grid" />
      <h1 className="text-7xl md:text-8xl font-display tracking-widest text-neon-pink animate-neon-flicker">
        <SplitText text="BUZZ QUIZ" stagger={0.06} duration={0.9} ease="back.out(2.4)" />
      </h1>
      <p className="mt-3 text-sm opacity-60 uppercase tracking-[0.5em] text-neon-cyan">
        host setup
      </p>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
        className="mt-12 max-w-xl space-y-6"
      >
        {supported ? (
          <>
            <p className="text-cyan-200">
              Plug in a PlayStation Buzz USB dongle (one dongle = 4 controllers),
              then click below to grant browser access.
            </p>
            <div className="relative inline-block">
              <span className="absolute inset-0 rounded animate-pulse-ring border-2 border-neon-cyan" />
              <MagneticButton
                onClick={onConnectDongle}
                strength={0.5}
                className="relative z-10 px-10 py-5 bg-neon-cyan text-black font-display uppercase tracking-[0.25em] rounded text-xl shadow-neon-cyan overflow-hidden"
              >
                <span className="relative z-10">Connect Buzz Dongle</span>
                <span className="scan-sweep-bar animate-scan-sweep" />
              </MagneticButton>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <p className="text-xs opacity-60 text-cyan-200">
              No buzzers? You can play with phones only —{" "}
              <button type="button" onClick={onContinue} className="underline text-neon-pink">
                skip to lobby
              </button>
              .
            </p>
          </>
        ) : (
          <>
            <p className="text-red-400">
              WebHID is not supported in this browser. Buzz controllers require Chrome or Edge.
            </p>
            <MagneticButton
              onClick={onContinue}
              className="px-6 py-3 bg-cyan-700 text-black font-bold rounded"
            >
              Continue with phones only
            </MagneticButton>
          </>
        )}
      </motion.div>
    </div>
  );
}
