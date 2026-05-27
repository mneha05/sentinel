import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:        "var(--bg)",
        panel:     "var(--panel)",
        "panel-2": "var(--panel-2)",
        line:      "var(--line)",
        line2:     "var(--line-2)",
        text:      "var(--text)",
        "text-dim":"var(--text-dim)",
        "text-mute":"var(--text-mute)",
        amber:     "var(--amber)",
        crimson:   "var(--crimson)",
        cyan:      "var(--cyan)",
        violet:    "var(--violet)",
        mint:      "var(--mint)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
