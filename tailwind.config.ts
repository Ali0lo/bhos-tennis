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
        bhos: {
          navy: "#0B0F19",
          midnight: "#0F172A",
          darkCard: "#0F172A",
          border: "#1E293B",
          cyan: "#1D4ED8",
          cyanGlow: "#2563EB",
          blue: "#1D4ED8",
          gold: "#D97706",
          emerald: "#059669",
          crimson: "#E11D48",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
