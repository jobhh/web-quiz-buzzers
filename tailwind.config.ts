import type { Config } from "tailwindcss";

// Phase 1: minimal scaffold. Full neon theme arrives in phase 9.
export default {
  content: ["./client/index.html", "./client/src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
