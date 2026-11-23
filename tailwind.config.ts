import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg-canvas)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        hairline: "var(--border-hairline)",
        bhos: {
          navy: "#070A11",
          midnight: "#0D121E",
          darkCard: "#0D121E",
          border: "#1E293B",
          cyan: "#1D4ED8",
          cyanGlow: "#2563EB",
          blue: "#2563EB",
          gold: "#F59E0B",
          emerald: "#10B981",
          crimson: "#E11D48",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        editorial: "-0.02em",
      },
    },
  },
  plugins: [],
};
export default config;
