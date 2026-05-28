import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  const [shake, setShake] = useState(false);
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

  const letterIdxRef = useRef(letterIdx);
  letterIdxRef.current = letterIdx;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    let repeatTimer: ReturnType<typeof setTimeout> | null = null;
    let repeatInterval: ReturnType<typeof setInterval> | null = null;
    const clearRepeat = () => {
      if (repeatTimer) { clearTimeout(repeatTimer); repeatTimer = null; }
      if (repeatInterval) { clearInterval(repeatInterval); repeatInterval = null; }
    };
    const unsub = buzzManager.on((p, kind) => {
      if (p.dongleId !== dongleId || p.controllerIndex !== controllerIndex) return;
      if (kind === "release") { if (p.buttonIndex === 1 || p.buttonIndex === 2) clearRepeat(); return; }
      if (kind !== "press") return;
      handleButton(p.buttonIndex);
      if (p.buttonIndex === 1 || p.buttonIndex === 2) {
        clearRepeat();
        repeatTimer = setTimeout(() => {
          repeatInterval = setInterval(() => handleButton(p.buttonIndex), 80);
        }, 300);
      }
    });
    function handleButton(idx: ButtonIndex) {
      switch (idx) {
        case 0:
          if (nameRef.current.trim().length > 0) onSubmitRef.current(nameRef.current.trim());
          return;
        case 1:
          setLetterIdx((i) => (i + 1) % ALPHABET.length);
          return;
        case 2:
          setLetterIdx((i) => (i - 1 + ALPHABET.length) % ALPHABET.length);
          return;
        case 3:
          if (nameRef.current.length < 12) {
            setName((n) => n + ALPHABET[letterIdxRef.current]);
          } else {
            setShake(true);
            setTimeout(() => setShake(false), 400);
          }
          return;
        case 4:
          if (nameRef.current.length === 0) onCancelRef.current();
          else setName((n) => n.slice(0, -1));
          return;
      }
    }
    return () => { clearRepeat(); unsub(); };
  }, [dongleId, controllerIndex]);

  const prev = ALPHABET[(letterIdx - 1 + ALPHABET.length) % ALPHABET.length];
  const curr = ALPHABET[letterIdx];
  const next = ALPHABET[(letterIdx + 1) % ALPHABET.length];

  return (
    <div className="border-2 border-neon-pink rounded p-3 text-center bg-neon-dark/60 backdrop-blur-sm">
      <motion.div
        animate={shake ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="font-display text-2xl min-h-[4rem] tracking-widest flex justify-center items-center gap-0.5"
      >
        {/* Already-typed characters */}
        {name.split("").map((c, i) => (
          <span key={i} className="inline-block text-cyan-100">{visualize(c)}</span>
        ))}
        {/* Vertical scroll wheel at cursor */}
        <span className="inline-flex flex-col items-center leading-none mx-0.5">
          <span className="text-sm opacity-30">{visualize(prev)}</span>
          <span
            ref={currentRef}
            className="text-neon-pink text-3xl bg-neon-pink/10 px-1.5 rounded text-glow-pink"
          >
            {visualize(curr)}
          </span>
          <span className="text-sm opacity-30">{visualize(next)}</span>
        </span>
      </motion.div>
      <div className="text-[10px] uppercase tracking-widest opacity-80 mt-2 leading-relaxed flex flex-col items-center">
        <span className="text-red-400">R done</span>
        <span><span className="text-blue-400">B back</span> <span className="mx-1.5">·</span> <span className="text-orange-400">O next</span></span>
        <span><span className="text-green-400">G up</span> <span className="mx-1.5">·</span> <span className="text-yellow-400">Y down</span></span>
      </div>
    </div>
  );
}

function visualize(c: string): string {
  if (c === " ") return "␣";
  if (c === "_") return "_";
  return c;
}
