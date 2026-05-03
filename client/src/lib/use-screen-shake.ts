import { useCallback } from "react";

const CLASS = "animate-screen-shake";

// Returns a `shake()` callable that adds the screen-shake animation class to
// <body> for ~400ms. Idempotent — re-calling during a shake resets the timer.
export function useScreenShake() {
  return useCallback(() => {
    const body = document.body;
    body.classList.remove(CLASS);
    // Force reflow so re-adding the class restarts the animation.
    void body.offsetWidth;
    body.classList.add(CLASS);
    setTimeout(() => body.classList.remove(CLASS), 420);
  }, []);
}
