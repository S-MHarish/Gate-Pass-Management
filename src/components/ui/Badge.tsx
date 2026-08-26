'use client';

import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'cyan' | 'amber' | 'purple' | 'gray' | 'danger';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'sm',
  className = '',
}) => {
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const variantClass = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    cyan: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    gray: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    danger: 'bg-red-500/15 text-red-300 border-red-500/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide rounded-full border shadow-sm ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
};
