import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Remapped from dark quantum → Clay & Honey so existing utility classes restyle.
        quantum: {
          "950": "#F8F0E4",
          "900": "#EBDDC8",
          "800": "#FFFCF7",
          "700": "#E8DCCE",
          "600": "#847260",
          "500": "#6A5646",
          "400": "#6A5646",
          "300": "#2C2118",
          "200": "#2C2118",
          "100": "#2C2118",
          "50": "#2C2118",
        },
        cyan: {
          "500": "#845924",
          "400": "#AF7327",
          "300": "#D28D36",
        },
        clay: {
          bg: "#F8F0E4",
          deep: "#EBDDC8",
          surface: "#FFFCF7",
          raised: "#FFFFFF",
          ink: "#2C2118",
          soft: "#6A5646",
          muted: "#847260",
          action: "#845924",
          "action-hover": "#60411A",
          accent: "#99503D",
          ok: "#6C7E57",
          warn: "#BC8F19",
          danger: "#A93A2C",
          tag: "#F3EDE6",
          line: "rgba(44, 33, 24, 0.10)",
        },
        accent: {
          primary: "#845924",
          secondary: "#99503D",
          success: "#6C7E57",
          danger: "#A93A2C",
          warning: "#BC8F19",
          info: "#5B7AA8",
        },
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
        "4xl": "64px",
      },
      borderRadius: {
        xs: "10px",
        sm: "16px",
        md: "26px",
        lg: "26px",
        xl: "32px",
        full: "9999px",
      },
      boxShadow: {
        "inner-subtle": "inset 0 1px 0 rgba(255, 255, 255, 0.65)",
        "glow-cyan": "0 0 0 1px rgba(132, 89, 36, 0.25), 0 10px 28px rgba(132, 89, 36, 0.12)",
        "glow-cyan-lg": "0 0 0 2px rgba(132, 89, 36, 0.3), 0 16px 40px rgba(132, 89, 36, 0.16)",
        card: "0 10px 26px rgba(44, 33, 24, 0.09)",
        "card-hover": "0 24px 50px rgba(44, 33, 24, 0.12), 0 6px 16px rgba(44, 33, 24, 0.07)",
        soft: "0 10px 26px rgba(44, 33, 24, 0.09)",
        raised: "0 24px 50px rgba(44, 33, 24, 0.12), 0 6px 16px rgba(44, 33, 24, 0.07)",
      },
      fontFamily: {
        sans: ["Schibsted Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Bricolage Grotesque", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["16px", { lineHeight: "24px" }],
        lg: ["18px", { lineHeight: "28px" }],
        xl: ["22px", { lineHeight: "28px" }],
        "2xl": ["28px", { lineHeight: "34px" }],
        "3xl": ["36px", { lineHeight: "42px" }],
        "4xl": ["48px", { lineHeight: "54px" }],
        "5xl": ["48px", { lineHeight: "54px" }],
      },
      animation: {
        "fade-in": "fadeIn 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-up": "slideUp 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-down": "slideDown 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-subtle": "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "band-settle": "bandSettle 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        bandSettle: {
          "0%": { transform: "scaleX(0.6)", opacity: "0.4" },
          "100%": { transform: "scaleX(1)", opacity: "1" },
        },
      },
      transitionDuration: {
        fast: "150ms",
        base: "200ms",
        slow: "320ms",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
