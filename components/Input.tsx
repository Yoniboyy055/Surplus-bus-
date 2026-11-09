import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, icon, iconPosition = "left", fullWidth = false, className = "", ...props },
    ref
  ) => {
    return (
      <div className={fullWidth ? "w-full" : ""}>
        {label && (
          <label className="block text-sm font-semibold text-[var(--sb-ink)] mb-3">{label}</label>
        )}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sb-muted)]">{icon}</div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[var(--sb-surface-raised)] border ${
              error ? "border-[var(--sb-danger)]" : "border-[var(--sb-line)]"
            } rounded-[var(--sb-radius-sm)] px-4 py-3 text-[var(--sb-ink)] placeholder:text-[var(--sb-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--sb-action)] focus:border-transparent ${
              icon && iconPosition === "left" ? "pl-12" : ""
            } ${icon && iconPosition === "right" ? "pr-12" : ""} ${className}`}
            {...props}
          />
          {icon && iconPosition === "right" && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--sb-muted)]">{icon}</div>
          )}
        </div>
        {error && <p className="text-[var(--sb-danger-text)] text-xs mt-2">{error}</p>}
        {hint && !error && <p className="text-[var(--sb-muted)] text-xs mt-2">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
