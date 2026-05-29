import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gameSession } from "@client/state/game-session";
import { useGameState } from "@client/state/game-store";

export function ConnectionPill() {
  const [status, setStatus] = useState<"connected" | "disconnected">("disconnected");
  const state = useGameState();
  useEffect(() => gameSession.onStatus(setStatus), []);
  const connected = status === "connected";
  return (
    <motion.div
      initial={false}
      animate={
        connected
          ? { scale: 1, backgroundColor: "#7CFC00", color: "#000" }
          : { scale: [1, 1.08, 1], backgroundColor: "#ef4444", color: "#fff" }
      }
      transition={
        connected ? { duration: 0.3 } : { duration: 0.7, repeat: Infinity }
      }
      className="fixed top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-display tracking-[0.25em] z-50"
      aria-live="polite"
    >
      {connected ? "ONLINE" : "OFFLINE"}
      {state && <span className="ml-1 opacity-70">· {state.roomCode}</span>}
    </motion.div>
  );
}
