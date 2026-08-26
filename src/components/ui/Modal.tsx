'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    full: 'max-w-6xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-fadeIn"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className={`relative transform overflow-hidden rounded-3xl bg-[#042820] border border-emerald-500/30 text-left shadow-[0_25px_60px_rgba(0,0,0,0.8)] transition-all sm:my-8 w-full ${maxWidthClasses} animate-scaleUp`}
        >
          {/* Top highlight glow */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400" />

          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-500/20 bg-[#063329]/80">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-emerald-300/80 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:text-white hover:bg-emerald-500/20 border border-transparent hover:border-emerald-500/30 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="px-6 py-6 max-h-[80vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
};
