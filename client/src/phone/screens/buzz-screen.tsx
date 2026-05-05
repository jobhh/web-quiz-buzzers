import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { gameSession } from "@client/state/game-session";
import type { GameState, Player } from "@shared/game-state";
import { Shockwave, useReducedMotion } from "@client/anim";

interface Props {
  state: GameState;
  me: Player;
}

export function BuzzScreen({ state, me }: Props) {
  const [armed, setArmed] = useState(true);
  const [pressed, setPressed] = useState(false);
  const lockedOut = state.lockedOutPlayerIds.includes(me.id);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    setArmed(true);
    setPressed(false);
  }, [state.phase, state.questionIndex]);

  useEffect(() => {
    if (!btnRef.current || reduced) return;
    if (!armed) return;
    const tween = gsap.to(btnRef.current, {
      scale: 1.04,
      duration: 0.7,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
    return () => {
      tween.kill();
    };
  }, [armed, reduced]);

  const onTap = () => {
    if (!armed || lockedOut) return;
    setArmed(false);
    setPressed(true);
    if (btnRef.current) {
      gsap.killTweensOf(btnRef.current);
      gsap.fromTo(
        btnRef.current,
        { scale: 1.04 },
        { scale: 0.85, duration: 0.12, ease: "power2.in" },
      );
      gsap.to(btnRef.current, {
        scale: 1,
        duration: 0.6,
        delay: 0.12,
        ease: "elastic.out(1, 0.4)",
      });
    }
    if (navigator.vibrate) navigator.vibrate([60, 30, 90]);
    gameSession.send({ type: "BUZZ" });
  };

  if (lockedOut) {
    return (
      <div className="phone-root flex items-center justify-center bg-gradient-to-br from-gray-900 to-red-950 text-red-300 text-center px-6">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <h1 className="text-4xl font-display uppercase tracking-widest text-red-400 animate-chromatic-shake">
            Locked Out
          </h1>
          <p className="mt-4 opacity-80">You buzzed wrong — sit this one out.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="phone-root relative bg-black overflow-hidden">
      {armed && (
        <span className="absolute inset-8 rounded-full border-4 border-neon-pink animate-pulse-ring pointer-events-none" />
      )}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Shockwave active={pressed} color="#ff006e" size={500} rings={4} />
      </div>
      <button
        ref={btnRef}
        type="button"
        onClick={onTap}
        className={`phone-fullscreen-button uppercase tracking-widest text-7xl will-change-transform ${
          armed
            ? "bg-gradient-to-br from-pink-500 via-neon-pink to-rose-600 text-black"
            : "bg-gradient-to-br from-gray-700 to-gray-900 text-gray-400"
        }`}
        style={{
          boxShadow: armed
            ? "inset 0 -16px 0 rgba(0,0,0,0.25), 0 0 60px rgba(255,0,110,0.5)"
            : "inset 0 -8px 0 rgba(0,0,0,0.4)",
          textShadow: armed ? "0 4px 0 rgba(0,0,0,0.25), 0 0 24px #fff" : "none",
        }}
      >
        <motion.span
          animate={armed ? { scale: [1, 1.06, 1] } : {}}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut" }}
          className="inline-block font-display"
        >
          {armed ? "BUZZ" : "Buzzed!"}
        </motion.span>
      </button>
    </div>
  );
}
