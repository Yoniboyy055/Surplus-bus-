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
    success: 'bg-[var(--sb-success-bg)] text-[var(--sb-ok-text)] border-[rgba(108,126,87,0.35)]',
    error: 'bg-[var(--sb-danger-bg)] text-[var(--sb-danger-text)] border-[rgba(169,58,44,0.35)]',
    info: 'bg-[var(--sb-info-bg)] text-[var(--sb-info-text)] border-[rgba(91,122,168,0.35)]',
    warning: 'bg-[var(--sb-warning-bg)] text-[var(--sb-warn-text)] border-[rgba(188,143,25,0.35)]',
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
  };

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm p-4 rounded-lg border ${typeStyles[type]} shadow-lg animate-slide-up z-50`}>
      <div className="flex items-start gap-3">
        <span className="text-xl font-bold">{typeIcons[type]}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';
