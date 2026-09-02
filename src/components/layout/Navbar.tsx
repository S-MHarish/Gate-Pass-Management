'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  FileText,
  Users,
  History,
  Settings,
  Clock,
  Layers,
  Building2,
  LogOut,
  Radio,
  Loader2,
  WifiOff,
} from 'lucide-react';
import { useRealtime } from '@/context/RealtimeContext';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { students, connectionStatus, logout, isAuthenticated } = useRealtime();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }) +
          ' ' +
          now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Layers },
    { href: '/generate', label: 'Generate Pass', icon: FileText, highlight: true },
    { href: '/students', label: 'Student Database', icon: Users },
    { href: '/history', label: 'Pass History', icon: History },
    { href: '/settings', label: 'Hostel Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#031d17]/85 border-b border-emerald-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* College & System Branding */}
          <Link href="/" className="flex items-center space-x-3.5 group">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[2px] shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-400/40 transition-all duration-300">
                <div className="w-full h-full bg-[#04201a] rounded-[14px] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#04201a]"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                  VSB HOSTEL
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRO SYSTEM
                </span>
              </div>
              <p className="text-xs text-emerald-400/80 font-medium">
                Boys Hostel-I • Gate Pass Hub
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5 lg:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'text-white bg-emerald-500/25 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : link.highlight
                      ? 'text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 hover:border-emerald-400/60 hover:text-white'
                      : 'text-gray-300 hover:text-white hover:bg-emerald-900/30 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-emerald-300'
                        : link.highlight
                        ? 'text-emerald-400'
                        : 'text-gray-400 group-hover:text-emerald-300'
                    }`}
                  />
                  <span>{link.label}</span>
                  {link.highlight && !isActive && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Header Status, Realtime Indicator & Clock */}
          <div className="flex items-center space-x-2.5">
            {/* Realtime Status Indicator */}
            {connectionStatus === 'connected' ? (
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                title="Live real-time sync active across all devices"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <span>Live</span>
              </div>
            ) : connectionStatus === 'connecting' ? (
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-500/40 text-amber-300 text-xs font-semibold"
                title="Reconnecting to central database..."
              >
                <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
                <span>Reconnecting...</span>
              </div>
            ) : (
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-red-950/90 border border-red-500/40 text-red-300 text-xs font-semibold"
                title="Connection lost. Trying to reconnect..."
              >
                <WifiOff className="w-3 h-3 text-red-400" />
                <span>Offline</span>
              </div>
            )}

            {/* Realtime Clock */}
            <div className="hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-950/70 border border-emerald-500/20 text-xs">
              <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-mono text-emerald-200 font-medium">
                {time || 'Loading time...'}
              </span>
            </div>

            {/* Total Student Counter */}
            <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-900/80 to-teal-950/80 px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 font-medium shadow-inner">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Master Active:</span>
              <span className="font-bold text-white bg-emerald-500/30 px-1.5 py-0.5 rounded text-[11px] border border-emerald-400/30">
                {students.length} Students
              </span>
            </div>

            {/* Logout Button if authenticated */}
            {isAuthenticated && (
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl bg-emerald-950/60 hover:bg-red-950/80 text-emerald-400 hover:text-red-300 border border-emerald-500/20 hover:border-red-500/30 transition-colors"
                title="Lock / Logout from this device"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-emerald-500/20 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-emerald-300 font-bold'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </header>
  );
};
