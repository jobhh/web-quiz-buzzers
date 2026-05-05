import { useSettings } from "@client/lib/settings-context";

// Returns true when motion should be reduced — either the user toggled it in
// settings, or the OS-level prefers-reduced-motion media query is active.
// Used by GSAP-backed components to gate or shortcut their animations.
export function useReducedMotion(): boolean {
  const { reducedMotion } = useSettings();
  if (reducedMotion) return true;
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}
