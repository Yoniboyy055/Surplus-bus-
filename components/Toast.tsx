'use client';

import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeStyles = {
    success: 'bg-accent-success/20 text-accent-success border-accent-success/50',
    error: 'bg-accent-danger/20 text-accent-danger border-accent-danger/50',
    info: 'bg-accent-info/20 text-accent-info border-accent-info/50',
    warning: 'bg-accent-warning/20 text-accent-warning border-accent-warning/50',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`fixed bottom-lg right-lg max-w-sm p-lg rounded-lg border ${typeStyles[type]} shadow-lg animate-slide-up z-50`}>
      <div className="flex items-start gap-md">
        <span className="text-xl font-bold">{typeIcons[type]}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';
