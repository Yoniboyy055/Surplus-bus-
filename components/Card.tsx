import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  hover?: boolean;
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ interactive = false, hover = true, icon, title, subtitle, children, className = '', ...props }, ref) => {
    const baseStyles = 'bg-quantum-800 border border-quantum-700 rounded-lg p-4 shadow-card transition-all duration-200';
    const interactiveStyles = interactive ? 'cursor-pointer hover:border-cyan-500/50 hover:shadow-card-hover' : '';
    const hoverStyles = hover && !interactive ? 'hover:shadow-card-hover' : '';

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${interactiveStyles} ${hoverStyles} ${className}`}
        {...props}
      >
        {(icon || title) && (
          <div className="flex items-start gap-3 mb-4">
            {icon && <div className="text-cyan-500 text-2xl">{icon}</div>}
            <div>
              {title && <h3 className="text-lg font-semibold text-quantum-50">{title}</h3>}
              {subtitle && <p className="text-sm text-quantum-500">{subtitle}</p>}
            </div>
          </div>
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
