'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Plus, 
  CreditCard, 
  Trash2, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  X, 
  DollarSign, 
  Wallet, 
  Smartphone, 
  Landmark,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import Link from 'next/link';

const paymentSchema = z.object({
  vendor: z.string().min(1, 'Vendor is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  paymentMode: z.enum(['cash', 'upi', 'bank']).default('cash'),
  referenceNumber: z.string().optional(),
  paymentDate: z.string().min(1, 'Payment date is required'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function PaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await api.get('/payments', { params: { limit: 200 } });
      return response.data.data;
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const response = await api.get('/vendors', { params: { limit: 1000 } });
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      vendor: '',
      amount: 0,
      paymentMode: 'cash',
      referenceNumber: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const selectedVendorId = watch('vendor');
  const selectedVendor = useMemo(() => {
    return (vendors || []).find((v: any) => v._id === selectedVendorId);
  }, [vendors, selectedVendorId]);

  const createMutation = useMutation({
    mutationFn: (data: PaymentFormData) => api.post('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment voucher recorded successfully');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment voucher deleted and ledger updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete payment');
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    createMutation.mutate(data);
  };

  const handleDelete = (id: string, amount: number, vendorName: string) => {
    if (confirm(`Are you sure you want to delete payment voucher of ₹${amount.toLocaleString('en-IN')} for ${vendorName}? This will adjust vendor balance and ledger.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const list = payments || [];
    const totalDisbursed = list.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const cashTotal = list.filter((p: any) => p.paymentMode === 'cash').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const upiTotal = list.filter((p: any) => p.paymentMode === 'upi').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const bankTotal = list.filter((p: any) => p.paymentMode === 'bank').reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    return { totalDisbursed, cashTotal, upiTotal, bankTotal };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return (payments || []).filter((payment: any) => {
      const matchMode = modeFilter === 'all' || payment.paymentMode === modeFilter;
      const matchSearch = 
        (payment.vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.referenceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (payment.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchMode && matchSearch;
    });
  }, [payments, modeFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-indigo-400" />
            Vendor Payments & Disbursals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Record supplier payment vouchers, maintain transaction history, and clear balances
          </p>
        </div>

        <button
          onClick={() => {
            reset();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Disbursed</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400">
            ₹{Math.round(metrics.totalDisbursed).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">All Lifetime Payments</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">UPI Payments</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-300">
            ₹{Math.round(metrics.upiTotal).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Instant Online Transfers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Transfers</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-indigo-300">
            ₹{Math.round(metrics.bankTotal).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">NEFT / RTGS / Cheque</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cash Disbursal</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-300">
            ₹{Math.round(metrics.cashTotal).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Petty Cash Vouchers</span>
        </div>
      </div>

      {/* Search & Mode Filters */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by vendor, reference number, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'cash', 'upi', 'bank'].map((mode) => (
            <button
              key={mode}
              onClick={() => setModeFilter(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                modeFilter === mode
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <LoadingSpinner size="lg" />
          <p className="text-sm mt-3 font-medium">Fetching payment vouchers...</p>
        </div>
      ) : filteredPayments.length > 0 ? (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Voucher Date</th>
                  <th className="px-5 py-3.5 font-bold">Vendor Name</th>
                  <th className="px-5 py-3.5 font-bold text-right">Amount Paid</th>
                  <th className="px-5 py-3.5 font-bold text-center">Payment Mode</th>
                  <th className="px-5 py-3.5 font-bold">Reference #</th>
                  <th className="px-5 py-3.5 font-bold">Notes</th>
                  <th className="px-5 py-3.5 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPayments.map((payment: any) => (
                  <tr key={payment._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'dd MMM yyyy') : 'N/A'}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-bold text-white">
                        {payment.vendor?.name || 'Unknown Vendor'}
                      </div>
                      {payment.vendor?.firmName && (
                        <div className="text-xs text-slate-400">{payment.vendor.firmName}</div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <span className="text-base font-extrabold text-emerald-400">
                        ₹{(payment.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                        payment.paymentMode === 'upi'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : payment.paymentMode === 'bank'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {payment.paymentMode}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-slate-400">
                      {payment.referenceNumber || '-'}
                    </td>

                    <td className="px-5 py-4 text-xs text-slate-400 max-w-xs truncate">
                      {payment.notes || '-'}
                    </td>

                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(payment._id, payment.amount, payment.vendor?.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete Payment Voucher"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
          <CreditCard className="w-12 h-12 stroke-[1.5] mx-auto mb-3 opacity-30 text-indigo-400" />
          <h3 className="text-base font-bold text-white">No Payments Recorded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No vouchers match your search criteria.' : 'Create your first payment voucher to record supplier disbursements.'}
          </p>
          <button
            onClick={() => {
              reset();
              setIsModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Payment
          </button>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Record Supplier Payment</h3>
                  <p className="text-xs text-slate-400">Issue debit entry against vendor balance</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Supplier / Vendor *
                </label>
                <select
                  {...register('vendor')}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Vendor</option>
                  {(vendors || []).map((v: any) => (
                    <option key={v._id} value={v._id}>
                      {v.name} {v.firmName ? `(${v.firmName})` : ''} - Due: ₹{(v.currentBalance || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                {errors.vendor && <p className="text-xs text-rose-400 mt-1">{errors.vendor.message}</p>}
              </div>

              {selectedVendor && (
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current Outstanding:</span>
                  <span className="text-sm font-extrabold text-rose-400">
                    ₹{(selectedVendor.currentBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    {...register('amount', { valueAsNumber: true })}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-base font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {errors.amount && <p className="text-xs text-rose-400 mt-1">{errors.amount.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    {...register('paymentDate')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.paymentDate && <p className="text-xs text-rose-400 mt-1">{errors.paymentDate.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    {...register('paymentMode')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">Cash Voucher</option>
                    <option value="upi">UPI / Online</option>
                    <option value="bank">Bank Transfer / NEFT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Reference / UTR No
                  </label>
                  <input
                    type="text"
                    placeholder="Transaction ID / Cheque"
                    {...register('referenceNumber')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Notes / Particulars
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional memo (e.g. Paid in full for Invoice #102)"
                  {...register('notes')}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Recording...' : 'Confirm Payment Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
