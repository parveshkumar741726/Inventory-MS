'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
      
      {/* Main Content Viewport with Ambient Gradient Accents */}
      <div className="relative flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        {/* Subtle Ambient Glow Elements */}
        <div className="pointer-events-none absolute -top-40 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />

        <main className="relative flex-1 overflow-y-auto scrollbar-thin px-4 py-6 sm:px-6 lg:px-10 pb-24 lg:pb-10">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
