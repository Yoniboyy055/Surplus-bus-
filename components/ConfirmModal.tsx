'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (note?: string) => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireNote?: boolean;
  notePlaceholder?: string;
  noteLabel?: string;
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
  variant = 'info',
  requireNote = false,
  notePlaceholder = 'Enter note...',
  noteLabel = 'Note (Required)',
  loading = false,
}) => {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (requireNote && !note.trim()) {
      setError('A note is required for this action.');
      return;
    }
    onConfirm(note.trim() || undefined);
    setNote('');
    setError('');
  };

  const handleClose = () => {
    setNote('');
    setError('');
    onClose();
  };

  const variantStyles = {
    danger: 'text-accent-danger',
    warning: 'text-accent-warning',
    info: 'text-accent-info',
  };

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      closeOnBackdropClick={!loading}
    >
      <div className="space-y-4">
        <p className={`text-quantum-300 ${variantStyles[variant]}`}>{message}</p>
        
        {requireNote && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-quantum-200">
              {noteLabel}
            </label>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError('');
              }}
              placeholder={notePlaceholder}
              className="w-full bg-quantum-900 border border-quantum-700 rounded-md px-4 py-3 text-quantum-50 placeholder-quantum-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent h-24"
            />
            {error && <p className="text-accent-danger text-xs">{error}</p>}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-4 border-t border-quantum-700">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={buttonVariant} onClick={handleConfirm} loading={loading}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

ConfirmModal.displayName = 'ConfirmModal';
