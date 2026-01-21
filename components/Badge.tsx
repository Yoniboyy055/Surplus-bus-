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
      success: 'bg-accent-success/20 text-accent-success',
      error: 'bg-accent-danger/20 text-accent-danger',
      warning: 'bg-accent-warning/20 text-accent-warning',
      info: 'bg-accent-info/20 text-accent-info',
      default: 'bg-quantum-700 text-quantum-300',
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
