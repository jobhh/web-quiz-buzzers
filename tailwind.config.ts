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
          black: "#0A0014", // slightly violet, not pure black
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
          "25%": { transform: "translate3d(-4px,2px,0)" },
          "50%": { transform: "translate3d(3px,-3px,0)" },
          "75%": { transform: "translate3d(-2px,3px,0)" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 2.2s ease-in-out infinite",
        "screen-shake": "screen-shake 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
