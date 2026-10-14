'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  BookOpen, 
  Search, 
  Printer, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  User, 
  Filter,
  FileText,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';

export default function LedgerPage() {
  const [selectedVendor, setSelectedVendor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const response = await api.get('/vendors', { params: { limit: 1000 } });
      return response.data.data;
    },
  });

  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['ledger', selectedVendor, startDate, endDate],
    queryFn: async () => {
      const url = selectedVendor ? `/ledger/vendor/${selectedVendor}` : '/ledger';
      const params: any = { limit: 500 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await api.get(url, { params });
      return response.data;
    },
    enabled: true,
  });

  const rawEntries = ledgerData?.data || [];

  const filteredEntries = useMemo(() => {
    if (typeFilter === 'all') return rawEntries;
    return rawEntries.filter((e: any) => e.type === typeFilter);
  }, [rawEntries, typeFilter]);

  // Metrics
  const summary = useMemo(() => {
    const totalDebit = filteredEntries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = filteredEntries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);
    const netBalance = totalCredit - totalDebit; // Credit (Invoices/Payables) - Debit (Payments)
    return { totalDebit, totalCredit, netBalance, count: filteredEntries.length };
  }, [filteredEntries]);

  const selectedVendorObj = useMemo(() => {
    return (vendors || []).find((v: any) => v._id === selectedVendor);
  }, [vendors, selectedVendor]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-indigo-400" />
            General Account Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete debit/credit transaction statement and running balances across all suppliers
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 shadow-lg transition-all"
        >
          <Printer className="w-4 h-4 text-indigo-400" />
          Print / Export Ledger
        </button>
      </div>

      {/* Print Only Header */}
      <div className="hidden print:block text-slate-900 mb-6">
        <h1 className="text-2xl font-bold">Transaction Statement / Ledger</h1>
        <p className="text-sm">Vendor: {selectedVendorObj ? selectedVendorObj.name : 'All Vendors'}</p>
        <p className="text-xs text-gray-500">Date Range: {startDate || 'Beginning'} to {endDate || 'Today'}</p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Credits (Cr)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-400">
            ₹{Math.round(summary.totalCredit).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Purchases & Invoices Added</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Debits (Dr)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400">
            ₹{Math.round(summary.totalDebit).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Payments & Settlements Cleared</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Balance Due</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-3 text-2xl font-black ${summary.netBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ₹{Math.abs(Math.round(summary.netBalance)).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {summary.netBalance > 0 ? 'Net Outstanding Payable (Cr)' : summary.netBalance < 0 ? 'Net Advance Credit (Dr)' : 'Settled (₹0)'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Entries</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{summary.count}</div>
          <span className="text-xs text-slate-400 font-medium">Vouchers & Transactions</span>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl print:hidden space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Filter by Vendor
            </label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">All Vendors</option>
              {(vendors || []).map((v: any) => (
                <option key={v._id} value={v._id}>{v.name} {v.firmName ? `(${v.firmName})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Transaction Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchases / Invoices (Credit)</option>
              <option value="payment">Payments / Disbursals (Debit)</option>
              <option value="opening">Opening Balances</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <LoadingSpinner size="lg" />
          <p className="text-sm mt-3 font-medium">Reconciling ledger entries...</p>
        </div>
      ) : filteredEntries.length > 0 ? (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Transaction Date</th>
                  <th className="px-5 py-3.5 font-bold">Vendor Name</th>
                  <th className="px-5 py-3.5 font-bold text-center">Type</th>
                  <th className="px-5 py-3.5 font-bold">Reference / Particulars</th>
                  <th className="px-5 py-3.5 font-bold text-right text-emerald-400">Debit (Dr) - Payments</th>
                  <th className="px-5 py-3.5 font-bold text-right text-rose-400">Credit (Cr) - Invoices</th>
                  <th className="px-5 py-3.5 font-bold text-right text-indigo-300">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((row: any) => {
                  const runningBal = row.runningBalance !== undefined ? row.runningBalance : (row.balance !== undefined ? row.balance : 0);
                  return (
                    <tr key={row._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                        {row.date ? format(new Date(row.date), 'dd MMM yyyy') : 'N/A'}
                      </td>

                      <td className="px-5 py-3.5 font-semibold text-white">
                        {row.vendor?.name || 'N/A'}
                      </td>

                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                          row.type === 'purchase'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : row.type === 'payment'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {row.type}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-slate-300">
                        {row.reference || row.description || '-'}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                        {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}
                      </td>

                      <td className="px-5 py-3.5 text-right font-bold text-rose-400 whitespace-nowrap">
                        {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <span className={`font-extrabold ${runningBal > 0 ? 'text-rose-400' : runningBal < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          ₹{Math.abs(runningBal).toLocaleString('en-IN')}
                        </span>
                        <span className={`text-[10px] ml-1.5 px-1.5 py-0.5 rounded font-bold uppercase ${
                          runningBal > 0 
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                            : runningBal < 0 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'text-slate-500'
                        }`}>
                          {runningBal > 0 ? 'Cr' : runningBal < 0 ? 'Dr' : 'Nil'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
          <BookOpen className="w-12 h-12 stroke-[1.5] mx-auto mb-3 opacity-30 text-indigo-400" />
          <h3 className="text-base font-bold text-white">No Ledger Entries Recorded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Transactions will appear automatically as you create purchase bills and record vendor payments.
          </p>
        </div>
      )}
    </div>
  );
}
