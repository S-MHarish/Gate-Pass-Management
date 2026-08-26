'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface GlowingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const GlowingButton: React.FC<GlowingButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg space-x-1.5',
    md: 'px-4 py-2.5 text-sm font-bold rounded-xl space-x-2',
    lg: 'px-6 py-3.5 text-base font-extrabold rounded-2xl space-x-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] border border-emerald-300/40 active:scale-[0.98]',
    accent:
      'bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white shadow-[0_0_20px_rgba(56,189,248,0.4)] hover:shadow-[0_0_30px_rgba(56,189,248,0.7)] border border-cyan-300/40 active:scale-[0.98]',
    secondary:
      'bg-[#063b31] hover:bg-[#094d40] text-emerald-200 hover:text-white border border-emerald-500/30 hover:border-emerald-400/60 shadow-md active:scale-[0.98]',
    danger:
      'bg-red-600/80 hover:bg-red-500 text-white border border-red-400/40 shadow-[0_0_15px_rgba(239,68,68,0.3)] active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-emerald-950/60 text-emerald-300 hover:text-white border border-transparent hover:border-emerald-500/30',
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none select-none ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4" />}
        </>
      )}
    </button>
  );
};
