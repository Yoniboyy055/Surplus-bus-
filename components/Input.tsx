import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconPosition = 'left', fullWidth = false, className = '', ...props }, ref) => {
    const containerClass = fullWidth ? 'w-full' : '';

    return (
      <div className={containerClass}>
        {label && (
          <label className="block text-sm font-semibold text-quantum-200 mb-md">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-lg top-1/2 -translate-y-1/2 text-quantum-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-quantum-900 border ${error ? 'border-accent-danger' : 'border-quantum-700'} rounded-md px-lg py-md text-quantum-50 placeholder-quantum-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-base ${icon && iconPosition === 'left' ? 'pl-2xl' : ''} ${icon && iconPosition === 'right' ? 'pr-2xl' : ''} ${className}`}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-lg top-1/2 -translate-y-1/2 text-quantum-500">
              {icon}
            </div>
          )}
        </div>
        {error && <p className="text-accent-danger text-xs mt-sm">{error}</p>}
        {hint && !error && <p className="text-quantum-500 text-xs mt-sm">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
