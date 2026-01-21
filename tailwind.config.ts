import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Dark Palette
        "quantum": {
          "950": "#0A0E27",  // Deep navy background
          "900": "#0F1535",  // Slightly lighter background
          "800": "#1A1F3A",  // Surface color
          "700": "#252B47",  // Border/divider
          "600": "#3A4158",  // Muted text
          "500": "#6B7280",  // Secondary text
          "400": "#9CA3AF",  // Tertiary text
          "300": "#D1D5DB",  // Light text
          "200": "#E5E7EB",  // Very light text
          "100": "#F3F4F6",  // Almost white
          "50":  "#FFFFFF",  // Pure white
        },
        // Accent Colors
        "cyan": {
          "500": "#00D9FF",  // Primary accent (bright cyan)
          "400": "#22E3FF",  // Hover state
          "300": "#67E8F9",  // Light variant
        },
        "accent": {
          "primary": "#00D9FF",   // Primary CTA
          "secondary": "#0EA5E9", // Secondary CTA
          "success": "#10B981",   // Success state
          "danger": "#EF4444",    // Error/danger state
          "warning": "#F59E0B",   // Warning state
          "info": "#3B82F6",      // Info state
        },
        // Role-based colors
        "role": {
          "buyer": "#00D9FF",     // Cyan for buyer
          "referrer": "#FBBF24",  // Amber for referrer
          "operator": "#EF4444",  // Red for operator
        },
      },
      spacing: {
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "24px",
        "2xl": "32px",
        "3xl": "48px",
        "4xl": "64px",
      },
      borderRadius: {
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "20px",
        "full": "9999px",
      },
      boxShadow: {
        "inner-subtle": "inset 0 1px 3px rgba(0, 0, 0, 0.1)",
        "glow-cyan": "0 0 0 2px #00D9FF, 0 0 8px rgba(0, 217, 255, 0.3)",
        "glow-cyan-lg": "0 0 0 3px #00D9FF, 0 0 16px rgba(0, 217, 255, 0.4)",
        "card": "0 4px 12px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 8px 24px rgba(0, 217, 255, 0.1)",
      },
      fontFamily: {
        "sans": ["Inter", "system-ui", "sans-serif"],
        "mono": ["Fira Code", "monospace"],
      },
      fontSize: {
        "xs": ["12px", { lineHeight: "16px" }],
        "sm": ["14px", { lineHeight: "20px" }],
        "base": ["16px", { lineHeight: "24px" }],
        "lg": ["18px", { lineHeight: "28px" }],
        "xl": ["20px", { lineHeight: "28px" }],
        "2xl": ["24px", { lineHeight: "32px" }],
        "3xl": ["30px", { lineHeight: "36px" }],
        "4xl": ["36px", { lineHeight: "44px" }],
        "5xl": ["48px", { lineHeight: "56px" }],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "pulse-subtle": "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
      },
      transitionDuration: {
        "fast": "150ms",
        "base": "200ms",
        "slow": "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
