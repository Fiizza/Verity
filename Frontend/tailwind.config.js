/** @type {import('tailwindcss').Config} */
export default {
 
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        sidebar: "rgb(var(--color-sidebar) / <alpha-value>)",
        card: "rgb(var(--color-card) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          soft: "rgb(var(--color-primary-soft) / <alpha-value>)",
        },
        success: "rgb(var(--color-success) / <alpha-value>)",
        text: {
          DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
        },
        muted: "rgb(var(--color-muted) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,111,255,0.25), 0 8px 30px -8px rgba(124,111,255,0.45)",
        "glow-sm": "0 0 18px -4px rgba(124,111,255,0.5)",
        soft: "0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #7C6FFF 0%, #A78BFA 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        breathe: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124,111,255,0.0)" },
          "50%": { boxShadow: "0 0 30px -2px rgba(124,111,255,0.35)" },
        },
        "gradient-flow": {
          "0%": { backgroundPosition: "0% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-2px)" },
          "40%": { transform: "translateX(2px)" },
          "60%": { transform: "translateX(-2px)" },
          "80%": { transform: "translateX(2px)" },
        },
        "accordion-down": {
          "0%": { opacity: "0", maxHeight: "0" },
          "100%": { opacity: "1", maxHeight: "400px" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
        "fade-in": "fade-in 0.5s ease both",
        "slide-in": "slide-in 0.4s ease both",
        breathe: "breathe 3.5s ease-in-out infinite",
        "gradient-flow": "gradient-flow 3s linear infinite",
        shake: "shake 0.4s ease-in-out",
        "accordion-down": "accordion-down 0.3s ease both",
      },
    },
  },
  plugins: [],
}