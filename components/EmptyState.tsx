import React from 'react';
import { Button } from './Button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 rounded-xl border border-quantum-700 bg-quantum-900/50 text-center ${className}`}>
      <div className="w-16 h-16 bg-quantum-800 rounded-full flex items-center justify-center mb-6">
        <Icon size={32} className="text-quantum-400" />
      </div>
      <h3 className="text-xl font-bold text-quantum-50 mb-2">{title}</h3>
      <p className="text-quantum-400 max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
