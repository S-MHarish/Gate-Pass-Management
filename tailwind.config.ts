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
        background: "var(--background)",
        foreground: "var(--foreground)",
        emerald: {
          950: "#02221b",
          900: "#063d32",
          850: "#094d40",
          800: "#065f46",
          700: "#047857",
          600: "#059669",
          500: "#10b981",
          400: "#34d399",
          300: "#6ee7b7",
        },
        cyber: {
          dark: "#041512",
          card: "rgba(6, 40, 32, 0.65)",
          border: "rgba(52, 211, 153, 0.18)",
          glow: "rgba(16, 185, 129, 0.25)",
          accent: "#38bdf8",
          neon: "#00f5a0",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 15px rgba(16, 185, 129, 0.2)" },
          "100%": { boxShadow: "0 0 28px rgba(16, 185, 129, 0.55)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        }
      },
    },
  },
  plugins: [],
};
export default config;
