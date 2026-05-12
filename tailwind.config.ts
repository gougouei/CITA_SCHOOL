import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "citsa-black": "#141414",
        "citsa-black-soft": "#1e1e1e",
        "citsa-red": "hsl(0, 75%, 45%)",
        "citsa-red-hex": "#C91D1D",
        "citsa-red-light": "#DD3C3C",
        "citsa-red-dark": "#A11212",
        cream: "#F9F7F6",
        "warm-gray": "#ECEBEA",
        border: "#E0E0E0",
        "muted-bg": "#F2F2F2",
        "muted-fg": "#666666",
        secondary: "#F5F5F5",
        success: "hsl(142, 70%, 35%)",
        warning: "hsl(38, 90%, 50%)",
        destructive: "hsl(0, 84%, 60%)",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        full: "9999px",
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0,0,0,.08)",
        elevated: "0 12px 40px -8px rgba(0,0,0,.15)",
      },
      backgroundImage: {
        "citsa-gradient": "linear-gradient(135deg, hsl(0,75%,45%), hsl(0,80%,35%))",
        "hero-overlay":
          "linear-gradient(to bottom, rgba(20,20,20,0.15) 0%, rgba(20,20,20,0.3) 50%, rgba(20,20,20,0.75) 100%)",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideIn: {
          from: { transform: "translateX(-8px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
      },
      animation: {
        pulse: "pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
