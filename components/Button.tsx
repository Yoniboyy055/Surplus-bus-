import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'right',
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-quantum-950 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-cyan-500 text-quantum-950 hover:bg-cyan-400 active:scale-95',
      secondary: 'bg-quantum-800 text-quantum-50 border border-quantum-700 hover:bg-quantum-700 active:scale-95',
      danger: 'bg-accent-danger text-quantum-50 hover:bg-red-600 active:scale-95',
      ghost: 'text-quantum-300 hover:text-quantum-50 hover:bg-quantum-800/50 active:scale-95',
    };

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm gap-2',
      md: 'px-4 py-3 text-base gap-3',
      lg: 'px-8 py-4 text-lg gap-4',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {icon && iconPosition === 'left' && !loading && <span>{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && !loading && <span>{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
