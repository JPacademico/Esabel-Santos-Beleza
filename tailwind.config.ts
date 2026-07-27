import type { Config } from "tailwindcss";

/**
 * Colors resolve to CSS variables declared in src/styles/globals.css, so the
 * light/dark switch is a single class toggle on <html> with no re-render.
 *
 * The variables hold raw "R G B" channels, which is what lets opacity
 * modifiers like `bg-accent/12` work.
 */
const channel = (name: string) => `rgb(var(${name}) / <alpha-value>)`;
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: channel("--bg"),
        surface: channel("--surface"),
        "surface-2": channel("--surface-2"),
        border: channel("--border"),
        text: channel("--text"),
        muted: channel("--muted"),
        accent: channel("--accent"),
        "accent-2": channel("--accent-2"),
        "accent-fg": channel("--accent-fg"),
        success: channel("--success"),
        warning: channel("--warning"),
        danger: channel("--danger"),
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        xl: "calc(var(--radius) + 4px)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(0 0 0 / 0.04), 0 4px 16px -8px rgb(0 0 0 / 0.12)",
        float: "0 8px 32px -8px rgb(0 0 0 / 0.24)",
      },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite" },
    },
  },
  plugins: [],
} satisfies Config;
