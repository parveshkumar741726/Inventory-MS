'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  CreditCard, 
  FileText, 
  BarChart3,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: null },
  { name: 'Purchases', href: '/purchases', icon: ShoppingCart, badge: 'Bills' },
  { name: 'Vendors', href: '/vendors', icon: Users, badge: null },
  { name: 'Inventory', href: '/inventory', icon: Package, badge: null },
  { name: 'Payments', href: '/payments', icon: CreditCard, badge: null },
  { name: 'Ledger', href: '/ledger', icon: FileText, badge: null },
  { name: 'Reports', href: '/reports', icon: BarChart3, badge: 'Analytics' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-900/90 text-white rounded-xl shadow-lg border border-slate-700/60 backdrop-blur-md hover:bg-slate-800 transition-all"
        aria-label="Toggle Navigation"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobileMenuOpen ? 0 : '-100%',
        }}
        className="lg:translate-x-0 lg:!transform-none fixed lg:static inset-y-0 left-0 z-40 w-72 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/80 shadow-2xl flex flex-col justify-between transition-transform duration-200 ease-out will-change-transform"
      >
        {/* Brand Header */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/60 bg-slate-900/40">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  StockFlow
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    PRO
                  </span>
                </span>
                <p className="text-[11px] text-slate-400 font-medium">Smart Inventory & ERP</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
            <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Main Menu
            </div>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 transition-transform duration-200 ${
                      isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-indigo-400 group-hover:scale-105'
                    }`} />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700/60 group-hover:border-indigo-500/40 group-hover:text-indigo-300'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-800/70 bg-slate-900/50">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3.5 mb-3 flex items-center gap-3 backdrop-blur-md">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-indigo-400/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || 'admin@example.com'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-medium text-emerald-400 capitalize">{user?.role || 'admin'} • Active</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500 rounded-xl transition-all duration-200 border border-rose-500/20 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </motion.aside>
    </>
  );
}
