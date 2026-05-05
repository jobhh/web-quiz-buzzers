import { useCallback } from "react";

type ShakeIntensity = "soft" | "normal" | "hard";

const DURATION_BY: Record<ShakeIntensity, number> = {
  soft: 320,
  normal: 580,
  hard: 700,
};

// Returns a `shake(intensity?)` callable that triggers the body keyframe
// shake. Honors document `reduce-motion` class — under reduced motion the
// shake is brief and barely visible.
export function useScreenShake() {
  return useCallback((intensity: ShakeIntensity = "normal") => {
    const reduced = document.documentElement.classList.contains("reduce-motion");
    const dur = reduced ? 200 : DURATION_BY[intensity];
    const body = document.body;
    body.classList.remove("animate-screen-shake");
    void body.offsetWidth;
    body.classList.add("animate-screen-shake");
    setTimeout(() => body.classList.remove("animate-screen-shake"), dur + 20);
  }, []);
}
