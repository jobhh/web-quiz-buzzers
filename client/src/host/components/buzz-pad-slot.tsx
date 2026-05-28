import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import type { Player } from "@shared/game-state";
import type { ControllerSlot } from "@client/hid/buzz-types";
import type { BuzzController } from "@client/hid/buzz-controller";
import { AlphabetWheel } from "./alphabet-wheel";
import { Shockwave } from "@client/anim/shockwave";

type SlotMode = "unclaimed" | "naming" | "claimed";

interface Props {
  dongle: BuzzController;
  controllerIndex: ControllerSlot;
  player: Player | null;
  isNaming: boolean;
  confirmingLeave?: boolean;
  onSubmitName: (name: string) => void;
  onCancelName: () => void;
}

const COLORS = ["bg-red-500", "bg-yellow-400", "bg-green-500", "bg-orange-500"];

export function BuzzPadSlot({
  dongle,
  controllerIndex,
  player,
  isNaming,
  confirmingLeave,
  onSubmitName,
  onCancelName,
}: Props) {
  const mode: SlotMode = player ? "claimed" : isNaming ? "naming" : "unclaimed";
  const accent = COLORS[controllerIndex];
  const lastModeRef = useRef<SlotMode>(mode);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mode === "naming") {
      let on = true;
      dongle.setLed(controllerIndex, true).catch(() => {});
      const interval = setInterval(() => {
        on = !on;
        dongle.setLed(controllerIndex, on).catch(() => {});
      }, 400);
      return () => { clearInterval(interval); dongle.setLed(controllerIndex, false).catch(() => {}); };
    }
    dongle.setLed(controllerIndex, mode === "claimed").catch(() => {});
  }, [dongle, controllerIndex, mode]);

  useEffect(() => {
    const prev = lastModeRef.current;
    if (cardRef.current && prev !== "claimed" && mode === "claimed") {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.85, rotate: -3 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.7,
          ease: "elastic.out(1, 0.4)",
          overwrite: "auto",
        },
      );
    }
    lastModeRef.current = mode;
  }, [mode]);

  return (
    <div
      ref={cardRef}
      className={`relative border-2 rounded p-3 transition-colors duration-300 overflow-visible ${
        mode === "claimed"
          ? "border-neon-cyan bg-cyan-950/40 shadow-neon-cyan"
          : mode === "naming"
          ? "border-neon-pink animate-rainbow-border"
          : "border-gray-700"
      }`}
    >
      <Shockwave
        active={mode === "claimed"}
        color="#00f5ff"
        size={120}
        rings={3}
      />
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <span className={`inline-block w-3 h-3 rounded-full ${accent}`} />
        <span className="font-display text-sm tracking-wider">
          Slot {controllerIndex + 1}
        </span>
      </div>
      {mode === "unclaimed" && (
        <p className="text-xs opacity-60 relative z-10">
          Press the big <span className="text-red-400 font-bold">RED</span> button to claim
        </p>
      )}
      {mode === "naming" && (
        <AlphabetWheel
          dongleId={dongle.dongleId}
          controllerIndex={controllerIndex}
          onSubmit={onSubmitName}
          onCancel={onCancelName}
        />
      )}
      <AnimatePresence>
        {mode === "claimed" && player && (
          <motion.div key={player.id}>
            <motion.p
              initial={{ y: 12, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 14 }}
              className="text-lg font-display tracking-wider text-cyan-100 relative z-10 truncate"
            >
              {player.name}
            </motion.p>
            {confirmingLeave && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs opacity-60 mt-1 relative z-10 animate-pulse"
              >
                Press the big <span className="text-red-400 font-bold">RED</span> button again to leave
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
