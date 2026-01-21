'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeOnBackdropClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleBackdropClick}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-lg">
        <div className={`${sizeStyles[size]} bg-quantum-800 rounded-lg shadow-lg p-2xl animate-slide-up max-h-[90vh] overflow-y-auto`}>
          {(title || subtitle) && (
            <div className="mb-2xl">
              {title && <h2 className="text-2xl font-bold text-quantum-50">{title}</h2>}
              {subtitle && <p className="text-quantum-500 mt-md">{subtitle}</p>}
            </div>
          )}

          <div className="mb-2xl">
            {children}
          </div>

          {footer && (
            <div className="flex gap-md justify-end border-t border-quantum-700 pt-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

Modal.displayName = 'Modal';
