export type TokenMode = "light" | "dark"
export type SemanticTokenName =
  | "brand"
  | "surface"
  | "text"
  | "border"
  | "focus"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "approval"
  | "blocked"

export type SemanticTokenPair = {
  background: string
  foreground: string
  border: string
  emphasis: string
}

export const semanticTokenNames = [
  "brand",
  "surface",
  "text",
  "border",
  "focus",
  "success",
  "warning",
  "danger",
  "info",
  "muted",
  "approval",
  "blocked",
] as const satisfies readonly SemanticTokenName[]

export const ykTokens = {
  color: {
    light: {
      brand: { background: "#0f766e", foreground: "#ffffff", border: "#0b5f59", emphasis: "#134e4a" },
      surface: { background: "#ffffff", foreground: "#111827", border: "#d1d5db", emphasis: "#f3f4f6" },
      text: { background: "#ffffff", foreground: "#111827", border: "#9ca3af", emphasis: "#374151" },
      border: { background: "#ffffff", foreground: "#1f2937", border: "#d1d5db", emphasis: "#6b7280" },
      focus: { background: "#eff6ff", foreground: "#1d4ed8", border: "#2563eb", emphasis: "#1e40af" },
      success: { background: "#ecfdf5", foreground: "#065f46", border: "#10b981", emphasis: "#047857" },
      warning: { background: "#fffbeb", foreground: "#92400e", border: "#f59e0b", emphasis: "#b45309" },
      danger: { background: "#fef2f2", foreground: "#991b1b", border: "#ef4444", emphasis: "#b91c1c" },
      info: { background: "#eff6ff", foreground: "#1e40af", border: "#3b82f6", emphasis: "#1d4ed8" },
      muted: { background: "#f3f4f6", foreground: "#4b5563", border: "#d1d5db", emphasis: "#6b7280" },
      approval: { background: "#f5f3ff", foreground: "#5b21b6", border: "#8b5cf6", emphasis: "#6d28d9" },
      blocked: { background: "#fff7ed", foreground: "#9a3412", border: "#f97316", emphasis: "#c2410c" },
    },
    dark: {
      brand: { background: "#2dd4bf", foreground: "#042f2e", border: "#5eead4", emphasis: "#99f6e4" },
      surface: { background: "#111827", foreground: "#f9fafb", border: "#374151", emphasis: "#1f2937" },
      text: { background: "#111827", foreground: "#f9fafb", border: "#4b5563", emphasis: "#d1d5db" },
      border: { background: "#111827", foreground: "#f9fafb", border: "#4b5563", emphasis: "#9ca3af" },
      focus: { background: "#172554", foreground: "#dbeafe", border: "#60a5fa", emphasis: "#93c5fd" },
      success: { background: "#052e1b", foreground: "#bbf7d0", border: "#34d399", emphasis: "#86efac" },
      warning: { background: "#451a03", foreground: "#fde68a", border: "#fbbf24", emphasis: "#fcd34d" },
      danger: { background: "#450a0a", foreground: "#fecaca", border: "#f87171", emphasis: "#fca5a5" },
      info: { background: "#172554", foreground: "#bfdbfe", border: "#60a5fa", emphasis: "#93c5fd" },
      muted: { background: "#1f2937", foreground: "#d1d5db", border: "#4b5563", emphasis: "#9ca3af" },
      approval: { background: "#2e1065", foreground: "#ddd6fe", border: "#a78bfa", emphasis: "#c4b5fd" },
      blocked: { background: "#431407", foreground: "#fed7aa", border: "#fb923c", emphasis: "#fdba74" },
    },
  },
  spacing: {
    none: "0",
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.5rem",
    "2xl": "2rem",
    "3xl": "3rem",
  },
  radius: {
    none: "0",
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    full: "9999px",
  },
  typography: {
    interface: { fontFamily: "Inter, Arial, sans-serif", fontSize: "0.875rem", lineHeight: "1.45" },
    heading: { fontFamily: "Archivo, Inter, Arial, sans-serif", fontSize: "1.25rem", lineHeight: "1.2" },
    metric: { fontFamily: "Archivo, Inter, Arial, sans-serif", fontSize: "1.875rem", lineHeight: "1.1" },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.8125rem", lineHeight: "1.5" },
  },
  elevation: {
    none: "none",
    sm: "0 1px 2px rgb(17 24 39 / 0.08)",
    md: "0 8px 24px rgb(17 24 39 / 0.12)",
  },
  motion: {
    instant: "0ms",
    fast: "120ms",
    normal: "180ms",
    slow: "240ms",
    reduced: "0ms",
  },
} as const

export const getSemanticPair = (name: SemanticTokenName, mode: TokenMode = "light"): SemanticTokenPair =>
  ykTokens.color[mode][name]
