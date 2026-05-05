import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "bg-base":       "var(--bg-primary)",
        "bg-alt":        "var(--bg-secondary)",
        "theme-surface": "var(--surface)",
        "theme-surface-2": "var(--surface-2)",
        "theme-border":  "var(--border)",
        "theme-border-strong": "var(--border-strong)",
        "theme-divider": "var(--divider)",
        "theme-blue":    "var(--accent-blue)",
        "theme-green":   "var(--accent-green)",
        "theme-pink":    "var(--accent-pink)",
        "theme-text":    "var(--text-1)",
        "theme-text-2":  "var(--text-2)",
      },
      fontFamily: {
        mono: ["'Kanit'", "system-ui", "sans-serif"],
        sans: ["'Kanit'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(var(--pattern) 1px, transparent 1px), linear-gradient(90deg, var(--pattern) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card:    "0 4px 16px var(--shadow)",
        "card-md": "0 8px 24px var(--shadow-md)",
      },
      animation: {
        "float":      "float 6s ease-in-out infinite",
        "spin-slow":  "spin 8s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.55" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
