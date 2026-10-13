'use client';

import Link from 'next/link';
import { 
  CreditCard, 
  BookOpen, 
  BarChart3, 
  LogOut, 
  User, 
  ShieldCheck, 
  Package, 
  Users, 
  ShoppingCart, 
  ArrowUpRight 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function MorePage() {
  const { user, logout } = useAuth();

  const menuSections = [
    {
      title: 'Financial & Accounting Modules',
      items: [
        {
          icon: CreditCard,
          label: 'Payments & Vouchers',
          description: 'Record supplier payments, track cashflow and UTR references',
          href: '/payments',
          color: 'from-emerald-600 to-teal-500',
        },
        {
          icon: BookOpen,
          label: 'General Account Ledger',
          description: 'Detailed transaction statement and running balances',
          href: '/ledger',
          color: 'from-purple-600 to-pink-500',
        },
        {
          icon: BarChart3,
          label: 'Business Analytics & Reports',
          description: 'Download CSV reports for tax, inventory, and monthly summaries',
          href: '/reports',
          color: 'from-rose-600 to-orange-500',
        },
      ],
    },
    {
      title: 'Core Operations',
      items: [
        {
          icon: ShoppingCart,
          label: 'Purchase Invoices & Bills',
          description: 'Procurement bills with live GST calculation and tax types',
          href: '/purchases',
          color: 'from-indigo-600 to-blue-500',
        },
        {
          icon: Package,
          label: 'Inventory & Warehouse Stock',
          description: 'Item catalog, stock counts, reorder alerts, and valuation',
          href: '/inventory',
          color: 'from-amber-600 to-yellow-500',
        },
        {
          icon: Users,
          label: 'Suppliers & Vendors Directory',
          description: 'Directory of suppliers, GSTIN records, and pending dues',
          href: '/vendors',
          color: 'from-cyan-600 to-teal-500',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-800/60">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Additional Tools & Modules
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Quick shortcuts, accounting vouchers, user profile, and system navigation
        </p>
      </div>

      {/* User Profile Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-500/30 backdrop-blur-xl shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-600/30">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'AU'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              {user?.name || 'Administrator'}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user?.role || 'Admin'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'admin@example.com'}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 transition-all flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Sections */}
      {menuSections.map((sec, idx) => (
        <div key={idx} className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            {sec.title}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sec.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <Link
                  key={i}
                  href={item.href}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 backdrop-blur-xl shadow-lg transition-all hover:scale-[1.01] group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </div>

                    <h4 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                      {item.label}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
