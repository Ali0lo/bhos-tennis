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
          navy: "#0A192F",
          midnight: "#0F172A",
          darkCard: "#13233D",
          border: "#1E293B",
          cyan: "#00E5FF",
          cyanGlow: "#38BDF8",
          blue: "#0284C7",
          gold: "#F59E0B",
          emerald: "#10B981",
          crimson: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

