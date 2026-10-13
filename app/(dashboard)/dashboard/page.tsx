'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  FileText,
  DollarSign,
  Building2,
  CalendarDays
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <p className="text-sm font-medium text-slate-400">Loading business analytics...</p>
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentPurchases = data?.recentPurchases || [];
  const recentPayments = data?.recentPayments || [];
  const monthlyPurchases = data?.monthlyPurchases || [];

  const chartData = monthlyPurchases.map((item: any) => ({
    month: `${item._id.month}/${item._id.year}`,
    amount: item.total,
  })).reverse();

  const statCards = [
    {
      title: 'Total Purchases',
      value: `₹${(stats.totalPurchaseAmount || 0).toLocaleString('en-IN')}`,
      subtext: `${stats.totalPurchases || 0} Invoices Recorded`,
      icon: ShoppingCart,
      gradient: 'from-blue-500 to-indigo-600',
      glow: 'shadow-blue-500/10',
      badge: 'Purchases',
      badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      title: 'Pending Payables',
      value: `₹${(stats.pendingPayments || 0).toLocaleString('en-IN')}`,
      subtext: 'To be paid to vendors',
      icon: AlertTriangle,
      gradient: 'from-amber-500 to-rose-600',
      glow: 'shadow-rose-500/10',
      badge: 'Action Required',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      title: 'Inventory Value',
      value: `₹${(stats.totalInventoryValue || 0).toLocaleString('en-IN')}`,
      subtext: `${stats.totalStockUnits || 0} Total Units in Stock`,
      icon: Package,
      gradient: 'from-emerald-500 to-teal-600',
      glow: 'shadow-emerald-500/10',
      badge: 'Assets',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Total Payments Done',
      value: `₹${(stats.totalPayments || 0).toLocaleString('en-IN')}`,
      subtext: 'Settled to vendors',
      icon: CreditCard,
      gradient: 'from-purple-500 to-indigo-600',
      glow: 'shadow-purple-500/10',
      badge: 'Settled',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    {
      title: 'Active Vendors',
      value: (stats.totalVendors || 0).toString(),
      subtext: 'Registered suppliers',
      icon: Building2,
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'shadow-cyan-500/10',
      badge: 'Suppliers',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    },
    {
      title: 'Low Stock Alerts',
      value: (stats.lowStockItems || 0).toString(),
      subtext: (stats.lowStockItems || 0) > 0 ? 'Items below reorder point' : 'All items well-stocked',
      icon: TrendingUp,
      gradient: (stats.lowStockItems || 0) > 0 ? 'from-rose-500 to-amber-600' : 'from-slate-600 to-slate-700',
      glow: (stats.lowStockItems || 0) > 0 ? 'shadow-rose-500/20' : '',
      badge: (stats.lowStockItems || 0) > 0 ? 'Critical' : 'Healthy',
      badgeColor: (stats.lowStockItems || 0) > 0 
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
        : 'bg-slate-700/30 text-slate-400 border-slate-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Business Overview
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Synced
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            {format(new Date(), 'EEEE, MMMM dd, yyyy')} • Financial Summary
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/purchases"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            New Purchase
          </Link>
          <Link
            href="/payments"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:text-white transition-all hover:border-slate-600"
          >
            <CreditCard className="w-4 h-4 text-purple-400" />
            Record Payment
          </Link>
          <Link
            href="/reports"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:text-white transition-all"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            Reports
          </Link>
        </div>
      </div>

      {/* Primary Metrics Grid (6 Sleek Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <div className={`relative overflow-hidden rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 backdrop-blur-xl hover:border-slate-700/80 hover:bg-slate-900/90 transition-all duration-300 group shadow-xl ${stat.glow}`}>
              {/* Subtle Corner Ambient Glow */}
              <div className={`absolute -right-12 -top-12 w-28 h-28 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-xl group-hover:opacity-20 transition-opacity`} />

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stat.badgeColor}`}>
                      {stat.badge}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {stat.value}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    {stat.subtext}
                  </p>
                </div>

                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Chart & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Purchases Trend Chart (2 columns) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/60">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Monthly Purchases Flow
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Purchasing volume trends across recent months</p>
            </div>
            <Link 
              href="/reports" 
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
            >
              Full Analytics <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-72 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purchaseFlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: '#334155',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Purchases']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#purchaseFlowGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <ShoppingCart className="w-10 h-10 stroke-[1.5] mb-2 opacity-30" />
                <p className="text-sm font-medium">No purchase data yet recorded</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Purchases List */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/60">
            <div>
              <h2 className="text-base font-bold text-white">Recent Invoices</h2>
              <p className="text-xs text-slate-400 mt-0.5">Latest purchase orders</p>
            </div>
            <Link 
              href="/purchases" 
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[300px] scrollbar-thin pr-1">
            {recentPurchases.length > 0 ? (
              recentPurchases.map((purchase: any) => (
                <div 
                  key={purchase._id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-800/70 transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors">
                      {purchase.vendor?.name || 'Vendor'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      Inv #{purchase.invoiceNumber} • {format(new Date(purchase.invoiceDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">
                      ₹{purchase.total.toLocaleString('en-IN')}
                    </p>
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 capitalize border ${
                      purchase.status === 'paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : purchase.status === 'partial'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {purchase.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500">
                <p className="text-xs">No recent invoices recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Payments Feed */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800/60">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-400" />
              Recent Payment Transactions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Payments successfully settled to suppliers</p>
          </div>
          <Link 
            href="/payments" 
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Manage Payments <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {recentPayments.length > 0 ? (
            recentPayments.map((payment: any) => (
              <div 
                key={payment._id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-800/70 transition-all flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-semibold text-white truncate">
                    {payment.vendor?.name || 'Vendor'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                  </p>
                  <span className="inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-md mt-1 bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Mode: {payment.paymentMode || 'Cash'}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-base font-extrabold text-emerald-400">
                    ₹{payment.amount.toLocaleString('en-IN')}
                  </p>
                  <span className="text-[10px] text-slate-400">Cleared</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center text-slate-500">
              <p className="text-xs">No recent payment vouchers found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
