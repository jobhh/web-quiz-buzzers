import { useCallback } from "react";
import confetti from "canvas-confetti";

const NEON_COLORS = ["#FF006E", "#00F5FF", "#FFD700", "#FF7AC6", "#7CFC00"];

// Confetti hooks tuned for the quiz: a small `burst` for any positive moment,
// a side-cannon `cannons` for a bigger correct-answer punch, and a
// multi-second `storm` for the winner reveal.
export function useConfetti() {
  const burst = useCallback(() => {
    confetti({
      particleCount: 90,
      spread: 75,
      startVelocity: 45,
      origin: { y: 0.65 },
      colors: NEON_COLORS,
      ticks: 220,
    });
  }, []);

  const cannons = useCallback(() => {
    confetti({
      particleCount: 120,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.85 },
      colors: NEON_COLORS,
    });
    confetti({
      particleCount: 120,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.85 },
      colors: NEON_COLORS,
    });
  }, []);

  const storm = useCallback(() => {
    const duration = 3500;
    const end = Date.now() + duration;
    const tick = () => {
      confetti({
        particleCount: 36,
        spread: 110,
        startVelocity: 55,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: NEON_COLORS,
        ticks: 260,
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
    confetti({ particleCount: 200, angle: 60, spread: 80, origin: { x: 0, y: 0.85 }, colors: NEON_COLORS });
    confetti({ particleCount: 200, angle: 120, spread: 80, origin: { x: 1, y: 0.85 }, colors: NEON_COLORS });
  }, []);

  return { burst, cannons, storm };
}
