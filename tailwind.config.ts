import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // FUTMinna purple identity, tuned into a small usable ramp
        ink: {
          950: "#1B1023",
          900: "#241531",
        },
        plum: {
          50: "#F6F1FA",
          100: "#EBE0F5",
          200: "#D5BFEA",
          300: "#B78ED9",
          400: "#8F5AC0",
          500: "#5C2D82", // primary brand
          600: "#4B2369",
          700: "#3B1B54",
          800: "#2C1440",
          900: "#1E0D2C",
        },
        gold: {
          400: "#D9B65C",
          500: "#C9A24B",
          600: "#A9832F",
        },
        paper: "#FAF8FB",
      },
      fontFamily: {
        display: ["var(--font-source-serif)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27, 16, 35, 0.06), 0 8px 24px rgba(27, 16, 35, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
