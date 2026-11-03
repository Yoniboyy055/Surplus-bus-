import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconPosition = "right",
      fullWidth = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-full transition-[transform,background-color,border-color,box-shadow] duration-150 ease-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-action)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]";

    const variantStyles = {
      primary:
        "bg-[var(--sb-action)] text-white shadow-soft hover:bg-[var(--sb-action-hover)]",
      secondary:
        "bg-[var(--sb-surface)] text-[var(--sb-ink)] border border-[var(--sb-line)] shadow-soft hover:bg-[var(--sb-surface-raised)]",
      outline:
        "bg-[var(--sb-surface)] text-[var(--sb-ink)] border-[1.5px] border-[rgba(44,33,24,0.16)] shadow-soft hover:bg-[var(--sb-surface-raised)]",
      danger: "bg-[var(--sb-danger)] text-white hover:opacity-90",
      ghost:
        "bg-transparent text-[var(--sb-ink)] border border-[var(--sb-line)] hover:bg-[var(--sb-surface)]",
    };

    const sizeStyles = {
      sm: "px-3 py-2 text-sm gap-2",
      md: "px-[22px] py-3 text-[15px] gap-2",
      lg: "px-8 py-4 text-lg gap-3",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {icon && iconPosition === "left" && !loading && <span>{icon}</span>}
        {children}
        {icon && iconPosition === "right" && !loading && <span>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
