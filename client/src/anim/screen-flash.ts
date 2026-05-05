import gsap from "gsap";

let layerEl: HTMLDivElement | null = null;

function getLayer(): HTMLDivElement {
  if (layerEl && document.body.contains(layerEl)) return layerEl;
  const el = document.createElement("div");
  el.style.position = "fixed";
  el.style.inset = "0";
  el.style.pointerEvents = "none";
  el.style.zIndex = "9998";
  el.style.opacity = "0";
  el.style.mixBlendMode = "screen";
  document.body.appendChild(el);
  layerEl = el;
  return el;
}

export type FlashColor =
  | "white"
  | "pink"
  | "cyan"
  | "gold"
  | "green"
  | "red";

const COLOR_HEX: Record<FlashColor, string> = {
  white: "#ffffff",
  pink: "#ff006e",
  cyan: "#00f5ff",
  gold: "#ffd700",
  green: "#7CFC00",
  red: "#ff2a4a",
};

// Imperatively flashes a fullscreen color overlay. Cheap and non-blocking —
// uses a single shared layer + GSAP tween. Honors document `reduce-motion`
// class by clamping flash to a brief, low-opacity blink.
export function flashScreen(color: FlashColor = "white", strength = 0.55, durationOut = 0.55) {
  const reduced = document.documentElement.classList.contains("reduce-motion");
  const el = getLayer();
  el.style.background = COLOR_HEX[color];
  gsap.killTweensOf(el);
  gsap.set(el, { opacity: reduced ? Math.min(0.18, strength) : strength });
  gsap.to(el, {
    opacity: 0,
    duration: reduced ? 0.18 : durationOut,
    ease: "power3.out",
  });
}
