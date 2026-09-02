import type { Metadata } from 'next';
import './globals.css';
import { ThreeBackground } from '@/components/ui/ThreeBackground';
import { Navbar } from '@/components/layout/Navbar';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: 'VSB Hostel Gate Pass System | Boys Hostel-I',
  description:
    'Premium Automated Gate Pass Management System for VSB Engineering College Boys Hostel-I (New Construction First Floor). Fast room search, instant month-end passes, official A4 PDF/Word generation, and central real-time student registry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#021813] text-emerald-50 antialiased selection:bg-emerald-500 selection:text-white relative">
        <RealtimeProvider>
          {/* Futuristic 3D Particle Ambient Canvas Background */}
          <ThreeBackground />

          {/* Global Application Frame */}
          <div className="relative z-10 min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <AuthGuard>{children}</AuthGuard>
            </main>

            {/* Minimalist Professional Footer */}
            <footer className="relative z-10 border-t border-emerald-500/20 bg-[#021813]/90 backdrop-blur-md py-6 text-center text-xs text-emerald-400/60">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <p>
                  © 2026 VSB Engineering College, Karur. Boys Hostel-I (New Construction First Floor).
                </p>
                <p className="flex items-center space-x-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Central Master Database • Real-Time Synchronized</span>
                </p>
              </div>
            </footer>
          </div>
        </RealtimeProvider>
      </body>
    </html>
  );
}
