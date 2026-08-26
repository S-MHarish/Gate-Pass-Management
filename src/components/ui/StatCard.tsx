'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  variant?: 'emerald' | 'cyan' | 'teal' | 'amber';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'emerald',
  onClick,
}) => {
  const variantStyles = {
    emerald: {
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      valueColor: 'text-white',
      glow: 'shadow-emerald-500/20',
      badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    },
    cyan: {
      iconBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      valueColor: 'text-white',
      glow: 'shadow-sky-500/20',
      badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    },
    teal: {
      iconBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      valueColor: 'text-white',
      glow: 'shadow-teal-500/20',
      badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
    },
    amber: {
      iconBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      valueColor: 'text-white',
      glow: 'shadow-amber-500/20',
      badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    },
  }[variant];

  return (
    <GlassCard
      interactive={!!onClick}
      onClick={onClick}
      className="p-5 overflow-hidden group transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-emerald-300/80 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <h3 className={`text-3xl font-extrabold tracking-tight ${variantStyles.valueColor}`}>
              {value}
            </h3>
            {trend && (
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${variantStyles.badgeBg}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`p-3 rounded-2xl border ${variantStyles.iconBg} shadow-lg ${variantStyles.glow} group-hover:scale-110 transition-all duration-300`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </GlassCard>
  );
};
