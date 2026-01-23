'use client';

import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const variantStyles = {
    danger: 'bg-accent-danger/10 border-accent-danger/20 text-accent-danger',
    warning: 'bg-accent-warning/10 border-accent-warning/20 text-accent-warning',
    info: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm} 
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-quantum-300 text-sm">
          {message}
        </p>
        
        <div className={`p-3 rounded-lg border flex gap-3 ${variantStyles[variant]}`}>
           <AlertCircle className="shrink-0" size={20} />
           <div className="text-xs">
             <p className="font-bold">Confirmation Required</p>
             <p>This action cannot be undone.</p>
           </div>
        </div>
      </div>
    </Modal>
  );
};
