import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', icon, children, className = '', ...props }, ref) => {
    const variantStyles = {
      success: 'bg-[var(--sb-success-bg)] text-[var(--sb-ok-text)]',
      error: 'bg-[var(--sb-danger-bg)] text-[var(--sb-danger-text)]',
      warning: 'bg-[var(--sb-warning-bg)] text-[var(--sb-warn-text)]',
      info: 'bg-[var(--sb-info-bg)] text-[var(--sb-info-text)]',
      default: 'bg-[var(--sb-primary-100)] text-[var(--sb-ink)] border border-[var(--sb-line)]',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-xs',
      md: 'px-4 py-3 text-sm',
      lg: 'px-6 py-4 text-base',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center gap-2 font-semibold rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {icon && <span>{icon}</span>}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
