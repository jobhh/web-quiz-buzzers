import { useCallback } from "react";
import confetti from "canvas-confetti";

const NEON_COLORS = ["#FF006E", "#00F5FF", "#FFD700", "#FF7AC6", "#7CFC00"];

// Returns two functions: small burst for "correct" moments, big storm for the
// final winner reveal. Confetti runs on its own canvas and won't block React.
export function useConfetti() {
  const burst = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: NEON_COLORS,
    });
  }, []);

  const storm = useCallback(() => {
    const duration = 2500;
    const end = Date.now() + duration;
    const tick = () => {
      confetti({
        particleCount: 30,
        spread: 100,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: NEON_COLORS,
      });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, []);

  return { burst, storm };
}
