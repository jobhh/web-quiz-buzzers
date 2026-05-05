import { useEffect } from "react";
import { useSettings } from "@client/lib/settings-context";

// Mirrors the user's "reduce motion" preference onto <html> as a class so CSS
// can disable decorative animations without each component reading settings.
export function ReducedMotionClass() {
  const { reducedMotion } = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) root.classList.add("reduce-motion");
    else root.classList.remove("reduce-motion");
  }, [reducedMotion]);
  return null;
}
