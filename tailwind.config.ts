import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#123E66",
          deep: "#0b2c4d",
          soft: "#164a78",
        },
        blue: {
          brand: "#2E7CC4",
          light: "#96C0E0",
        },
        gold: "#FCBC36",
        orange: {
          brand: "#F37E31",
          mid: "#F79A2E",
        },
        ink: "#132430",
        muted: "#647587",
        canvas: "#eef2f8",
        card: "#ffffff",
        hairline: "#e6edf5",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(18,62,102,.18)",
        cardHover: "0 16px 40px -14px rgba(18,62,102,.28)",
        cta: "0 8px 20px -8px rgba(243,126,49,.55)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in .2s ease-out",
        "slide-up": "slide-up .25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
