import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  hover?: boolean;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { interactive = false, hover = true, icon, title, subtitle, children, className = "", ...props },
    ref
  ) => {
    const base =
      "bg-[var(--sb-surface)] border border-[var(--sb-line)] rounded-[var(--sb-radius)] p-[22px] shadow-soft transition-shadow duration-200";
    const interactiveStyles = interactive
      ? "cursor-pointer hover:shadow-raised"
      : hover
        ? "hover:shadow-raised"
        : "";

    return (
      <div ref={ref} className={`${base} ${interactiveStyles} ${className}`} {...props}>
        {(icon || title) && (
          <div className="flex items-start gap-3 mb-4">
            {icon && <div className="text-[var(--sb-action)] text-2xl">{icon}</div>}
            <div>
              {title && <h3 className="sb-title text-lg text-[var(--sb-ink)]">{title}</h3>}
              {subtitle && <p className="text-sm text-[var(--sb-muted)]">{subtitle}</p>}
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
