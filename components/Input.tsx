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
          <label className="block text-sm font-semibold text-quantum-200 mb-3">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-quantum-500">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-quantum-900 border ${error ? 'border-accent-danger' : 'border-quantum-700'} rounded-md px-4 py-3 text-quantum-50 placeholder-quantum-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 ${icon && iconPosition === 'left' ? 'pl-12' : ''} ${icon && iconPosition === 'right' ? 'pr-12' : ''} ${className}`}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-quantum-500">
              {icon}
            </div>
          )}
        </div>
        {error && <p className="text-accent-danger text-xs mt-2">{error}</p>}
        {hint && !error && <p className="text-quantum-500 text-xs mt-2">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
