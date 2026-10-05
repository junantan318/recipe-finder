import type { Config } from "tailwindcss";

export default {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        basil: { DEFAULT: "rgb(var(--basil) / <alpha-value>)", soft: "rgb(var(--basil-soft) / <alpha-value>)" },
        saffron: { DEFAULT: "rgb(var(--saffron) / <alpha-value>)", soft: "rgb(var(--saffron-soft) / <alpha-value>)" },
        danger: { DEFAULT: "rgb(var(--danger) / <alpha-value>)", soft: "rgb(var(--danger-soft) / <alpha-value>)" },
        ig: "rgb(var(--ig) / <alpha-value>)",
        yt: "rgb(var(--yt) / <alpha-value>)",
        web: "rgb(var(--web) / <alpha-value>)",
        manual: "rgb(var(--manual) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(25 28 33 / 0.04), 0 4px 16px rgb(25 28 33 / 0.05)",
        lift: "0 2px 4px rgb(25 28 33 / 0.06), 0 12px 32px rgb(25 28 33 / 0.10)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        "sheet-in": { from: { transform: "translateX(24px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "rise-in": "rise-in 220ms cubic-bezier(.2,.8,.2,1)",
        "sheet-in": "sheet-in 240ms cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
