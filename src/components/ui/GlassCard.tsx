'use client';

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  interactive?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = false,
  interactive = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl bg-gradient-to-b from-[#06382e]/85 to-[#03231c]/90 border border-emerald-500/25 backdrop-blur-md transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] ${
        glow ? 'shadow-[0_0_25px_rgba(16,185,129,0.22)] border-emerald-400/40' : ''
      } ${
        interactive
          ? 'cursor-pointer hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-[0_12px_35px_rgba(16,185,129,0.3)] hover:bg-[#084539]/90'
          : ''
      } ${className}`}
    >
      {/* Top subtle highlight shimmer border */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};
