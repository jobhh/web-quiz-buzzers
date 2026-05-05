import type { Config } from "tailwindcss";

// Retro neon gameshow theme. Hot pink + cyan + gold + dark plum bg.
// Display font: Bungee (loaded via Google Fonts in index.html).
// Body font: Space Grotesk.
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: {
          pink: "#FF006E",
          cyan: "#00F5FF",
          gold: "#FFD700",
          black: "#0A0014",
          dark: "#1A0A2E",
          green: "#7CFC00",
        },
      },
      fontFamily: {
        display: ["Bungee", "system-ui", "sans-serif"],
        body: ['"Space Grotesk"', "system-ui", "sans-serif"],
      },
      keyframes: {
        "glow-pulse": {
          "0%,100%": { filter: "drop-shadow(0 0 6px currentColor)" },
          "50%": { filter: "drop-shadow(0 0 22px currentColor)" },
        },
        "screen-shake": {
          "0%,100%": { transform: "translate3d(0,0,0)" },
          "10%": { transform: "translate3d(-8px,3px,0) rotate(-0.6deg)" },
          "25%": { transform: "translate3d(6px,-5px,0) rotate(0.5deg)" },
          "40%": { transform: "translate3d(-5px,4px,0) rotate(-0.4deg)" },
          "55%": { transform: "translate3d(7px,-3px,0) rotate(0.3deg)" },
          "70%": { transform: "translate3d(-4px,2px,0) rotate(-0.2deg)" },
          "85%": { transform: "translate3d(3px,-2px,0) rotate(0.1deg)" },
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 60px" },
        },
        "radial-breathe": {
          "0%,100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.95", transform: "scale(1.08)" },
        },
        "ray-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "bob": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "neon-flicker": {
          "0%,18%,22%,25%,53%,57%,100%": { opacity: "1", filter: "drop-shadow(0 0 8px currentColor) drop-shadow(0 0 28px currentColor)" },
          "20%,24%,55%": { opacity: "0.55", filter: "drop-shadow(0 0 2px currentColor)" },
        },
        "chromatic-shake": {
          "0%,100%": { textShadow: "2px 0 #ff006e, -2px 0 #00f5ff" },
          "50%": { textShadow: "-3px 0 #ff006e, 3px 0 #00f5ff" },
        },
        "scan-sweep": {
          "0%": { transform: "translateX(-120%) skewX(-25deg)" },
          "100%": { transform: "translateX(220%) skewX(-25deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "0.9" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        "rainbow-border": {
          "0%,100%": { borderColor: "#FF006E" },
          "33%": { borderColor: "#FFD700" },
          "66%": { borderColor: "#00F5FF" },
        },
        "score-jiggle": {
          "0%,100%": { transform: "rotate(0deg) scale(1)" },
          "25%": { transform: "rotate(-4deg) scale(1.05)" },
          "75%": { transform: "rotate(4deg) scale(1.05)" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 2.2s ease-in-out infinite",
        "screen-shake": "screen-shake 0.55s cubic-bezier(.36,.07,.19,.97)",
        "grid-pan": "grid-pan 6s linear infinite",
        "radial-breathe": "radial-breathe 4s ease-in-out infinite",
        "ray-spin-slow": "ray-spin 18s linear infinite",
        "ray-spin-fast": "ray-spin 6s linear infinite",
        "bob": "bob 2.6s ease-in-out infinite",
        "neon-flicker": "neon-flicker 4.6s linear infinite",
        "chromatic-shake": "chromatic-shake 0.16s steps(2) infinite",
        "scan-sweep": "scan-sweep 1.6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.4s ease-out infinite",
        "rainbow-border": "rainbow-border 2.8s linear infinite",
        "score-jiggle": "score-jiggle 0.4s ease-in-out",
      },
      backgroundImage: {
        "neon-grid":
          "linear-gradient(rgba(255,0,110,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.08) 1px, transparent 1px)",
        "rays-gold":
          "conic-gradient(from 0deg, rgba(255,215,0,0.0) 0deg, rgba(255,215,0,0.18) 5deg, rgba(255,215,0,0.0) 10deg, rgba(255,215,0,0.0) 30deg, rgba(255,215,0,0.18) 35deg, rgba(255,215,0,0.0) 40deg, rgba(255,215,0,0.0) 60deg, rgba(255,215,0,0.18) 65deg, rgba(255,215,0,0.0) 70deg)",
      },
      boxShadow: {
        neon: "0 0 24px rgba(255,0,110,0.55), 0 0 48px rgba(255,0,110,0.35)",
        "neon-cyan": "0 0 24px rgba(0,245,255,0.55), 0 0 48px rgba(0,245,255,0.35)",
        "neon-gold": "0 0 30px rgba(255,215,0,0.55), 0 0 60px rgba(255,215,0,0.4)",
      },
    },
  },
  plugins: [],
} satisfies Config;
