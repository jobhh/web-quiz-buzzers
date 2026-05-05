import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import { buzzManager } from "@client/hid/buzz-manager";
import type { ButtonIndex, ControllerSlot } from "@client/hid/buzz-types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ _-";

interface Props {
  dongleId: number;
  controllerIndex: ControllerSlot;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

// Buzz-controller-driven name entry.
// Yellow (1) = previous letter, Green (2) = next letter,
// Orange (3) = add letter, Blue (4) = submit, Red (0) = backspace.
export function AlphabetWheel({ dongleId, controllerIndex, onSubmit, onCancel }: Props) {
  const [letterIdx, setLetterIdx] = useState(0);
  const [name, setName] = useState("");
  const nameRef = useRef(name);
  nameRef.current = name;
  const currentRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (currentRef.current) {
      gsap.fromTo(
        currentRef.current,
        { scale: 1.4, rotateY: -45, opacity: 0.4 },
        {
          scale: 1,
          rotateY: 0,
          opacity: 1,
          duration: 0.35,
          ease: "back.out(2)",
          overwrite: "auto",
        },
      );
    }
  }, [letterIdx]);

  useEffect(() => {
    return buzzManager.on((p, kind) => {
      if (kind !== "press") return;
      if (p.dongleId !== dongleId || p.controllerIndex !== controllerIndex) return;
      handleButton(p.buttonIndex);
    });
    function handleButton(idx: ButtonIndex) {
      switch (idx) {
        case 0:
          if (nameRef.current.length === 0) onCancel();
          else setName((n) => n.slice(0, -1));
          return;
        case 1:
          setLetterIdx((i) => (i - 1 + ALPHABET.length) % ALPHABET.length);
          return;
        case 2:
          setLetterIdx((i) => (i + 1) % ALPHABET.length);
          return;
        case 3:
          if (nameRef.current.length < 20) {
            setName((n) => n + ALPHABET[letterIdx]);
          }
          return;
        case 4:
          if (nameRef.current.trim().length > 0) onSubmit(nameRef.current.trim());
          return;
      }
    }
  }, [dongleId, controllerIndex, letterIdx, onSubmit, onCancel]);

  const prev = ALPHABET[(letterIdx - 1 + ALPHABET.length) % ALPHABET.length];
  const curr = ALPHABET[letterIdx];
  const next = ALPHABET[(letterIdx + 1) % ALPHABET.length];

  return (
    <div className="border-2 border-neon-pink rounded p-3 text-center bg-neon-dark/60 backdrop-blur-sm">
      <div className="font-display text-2xl mb-2 min-h-[2rem] tracking-widest flex justify-center items-center gap-0.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {(name || "_").split("").map((c, i) => (
            <motion.span
              key={`${i}-${c}`}
              initial={{ y: -16, opacity: 0, scale: 0.6 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="inline-block text-cyan-100"
            >
              {c}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <div
        className="flex items-center justify-center gap-3 text-3xl font-display"
        style={{ perspective: 600 }}
      >
        <span className="opacity-30">{visualize(prev)}</span>
        <span
          ref={currentRef}
          className="text-neon-pink text-5xl bg-neon-pink/10 px-3 rounded text-glow-pink inline-block"
        >
          {visualize(curr)}
        </span>
        <span className="opacity-30">{visualize(next)}</span>
      </div>
      <div className="text-[10px] uppercase tracking-widest opacity-60 mt-2 leading-tight">
        Y prev · G next · O add · B submit · RED del/cancel
      </div>
    </div>
  );
}

function visualize(c: string): string {
  if (c === " ") return "␣";
  if (c === "_") return "_";
  return c;
}
