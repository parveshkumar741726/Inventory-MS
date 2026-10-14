'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ShoppingCart, 
  CreditCard, 
  BookOpen, 
  Building2, 
  Plus, 
  X,
  Calendar,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabType = 'overview' | 'purchases' | 'payments' | 'ledger';

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Quick Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'bank'>('cash');
  const [payRef, setPayRef] = useState('');

  const queryClient = useQueryClient();

  const { data: vendor, isLoading } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: async () => {
      const response = await api.get(`/vendors/${vendorId}`);
      return response.data.data;
    },
  });

  const { data: purchases } = useQuery({
    queryKey: ['vendor-purchases', vendorId],
    queryFn: async () => {
      const response = await api.get('/purchases', { params: { vendor: vendorId, limit: 100 } });
      return response.data.data;
    },
    enabled: activeTab === 'purchases' || activeTab === 'overview',
  });

  const { data: payments } = useQuery({
    queryKey: ['vendor-payments', vendorId],
    queryFn: async () => {
      const response = await api.get('/payments', { params: { vendor: vendorId, limit: 100 } });
      return response.data.data;
    },
    enabled: activeTab === 'payments' || activeTab === 'overview',
  });

  const { data: ledger } = useQuery({
    queryKey: ['vendor-ledger', vendorId],
    queryFn: async () => {
      const response = await api.get(`/ledger/vendor/${vendorId}`);
      return response.data.data;
    },
    enabled: activeTab === 'ledger',
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => api.post('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payments', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendor-ledger', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment recorded successfully!');
      setIsPayModalOpen(false);
      setPayAmount(0);
      setPayRef('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const submitPayment = () => {
    if (payAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    paymentMutation.mutate({
      vendor: vendorId,
      amount: payAmount,
      paymentMode: payMode,
      referenceNumber: payRef,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Direct payment voucher to ${vendor?.name}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <LoadingSpinner size="lg" />
        <p className="text-sm mt-3">Loading supplier file...</p>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-12 text-center text-slate-400">
        <h2 className="text-xl font-bold text-white mb-2">Vendor Not Found</h2>
        <button onClick={() => router.push('/vendors')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
          Back to Vendors
        </button>
      </div>
    );
  }

  const balance = vendor.currentBalance || 0;
  const isPayable = balance > 0;

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: FileText },
    { id: 'purchases' as TabType, label: `Invoices (${purchases?.length || 0})`, icon: ShoppingCart },
    { id: 'payments' as TabType, label: `Payments (${payments?.length || 0})`, icon: CreditCard },
    { id: 'ledger' as TabType, label: 'Account Ledger', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <Link
            href="/vendors"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {vendor.name}
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize border ${
                vendor.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-slate-700 text-slate-400 border-slate-600'
              }`}>
                {vendor.status}
              </span>
            </div>
            {vendor.firmName && (
              <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                {vendor.firmName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPayAmount(isPayable ? balance : 0);
              setIsPayModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Profile & Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Contact Info Card */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Supplier Profile & Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 block">Phone</span>
              <a href={`tel:${vendor.phone}`} className="font-semibold text-white hover:text-indigo-400 flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                {vendor.phone || 'N/A'}
              </a>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Email</span>
              <a href={`mailto:${vendor.email}`} className="font-semibold text-white hover:text-indigo-400 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-cyan-400" />
                {vendor.email || 'N/A'}
              </a>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">GSTIN</span>
              <span className="font-mono font-semibold text-slate-200 mt-0.5 block">
                {vendor.gstNumber || 'Unregistered'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block">Address</span>
              <span className="text-slate-300 mt-0.5 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                {vendor.address || 'No address provided'}
              </span>
            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Balance</span>
            <div className={`mt-2 text-3xl font-black ${isPayable ? 'text-rose-400' : balance < 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
              ₹{Math.abs(balance).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isPayable ? 'Amount you owe to vendor' : balance < 0 ? 'Advance paid to vendor' : 'Account is fully settled'}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Opening Balance:</span>
            <span className="font-semibold text-white">₹{(vendor.openingBalance || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-800 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm border-b-2 transition-all ${
                isActive
                  ? 'border-indigo-500 text-white bg-slate-800/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              Recent Purchase Invoices
            </h3>
            {purchases && purchases.length > 0 ? (
              <div className="divide-y divide-slate-800 text-xs">
                {purchases.slice(0, 5).map((p: any) => (
                  <div key={p._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">#{p.invoiceNumber}</p>
                      <p className="text-slate-400">{format(new Date(p.invoiceDate), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">₹{(p.total || 0).toLocaleString('en-IN')}</p>
                      <p className="text-rose-400 font-semibold">Due: ₹{(p.pendingAmount || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No purchases on file</p>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Recent Payment Vouchers
            </h3>
            {payments && payments.length > 0 ? (
              <div className="divide-y divide-slate-800 text-xs">
                {payments.slice(0, 5).map((pay: any) => (
                  <div key={pay._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-emerald-400">₹{(pay.amount || 0).toLocaleString('en-IN')}</p>
                      <p className="text-slate-400">{format(new Date(pay.paymentDate), 'dd MMM yyyy')}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 uppercase font-semibold text-slate-300">
                      {pay.paymentMode}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No payments on file</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Purchases */}
      {activeTab === 'purchases' && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-bold">Invoice #</th>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold text-right">Taxable</th>
                  <th className="px-5 py-3 font-bold text-right">GST</th>
                  <th className="px-5 py-3 font-bold text-right">Total</th>
                  <th className="px-5 py-3 font-bold text-right">Due</th>
                  <th className="px-5 py-3 font-bold text-center">Status</th>
                  <th className="px-5 py-3 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(purchases || []).map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-white">#{p.invoiceNumber}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{format(new Date(p.invoiceDate), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-3.5 text-right font-medium">₹{(p.subtotal || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-indigo-300">+₹{(p.totalTax || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-white">₹{(p.total || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-400">₹{(p.pendingAmount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-slate-300">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link href={`/purchases/${p._id}`} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Payments */}
      {activeTab === 'payments' && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold text-right">Amount Paid</th>
                  <th className="px-5 py-3 font-bold">Mode</th>
                  <th className="px-5 py-3 font-bold">Reference #</th>
                  <th className="px-5 py-3 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(payments || []).map((pay: any) => (
                  <tr key={pay._id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 text-xs text-slate-400">{format(new Date(pay.paymentDate), 'dd MMM yyyy')}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-400">₹{(pay.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 uppercase font-semibold text-xs text-slate-300">{pay.paymentMode}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{pay.referenceNumber || '-'}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{pay.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Ledger */}
      {activeTab === 'ledger' && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-5 py-3 font-bold text-center">Type</th>
                  <th className="px-5 py-3 font-bold">Reference / Particulars</th>
                  <th className="px-5 py-3 font-bold text-right text-emerald-400">Debit (Dr) - Payments</th>
                  <th className="px-5 py-3 font-bold text-right text-rose-400">Credit (Cr) - Invoices</th>
                  <th className="px-5 py-3 font-bold text-right text-indigo-300">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(ledger || []).map((row: any) => {
                  const runningBal = row.runningBalance !== undefined ? row.runningBalance : (row.balance !== undefined ? row.balance : 0);
                  return (
                    <tr key={row._id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5 text-xs text-slate-400">{format(new Date(row.date), 'dd MMM yyyy')}</td>
                      <td className="px-5 py-3.5 text-center">
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
                      <td className="px-5 py-3.5 text-xs text-slate-300">{row.reference || row.description || '-'}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-emerald-400">
                        {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-rose-400">
                        {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right font-extrabold whitespace-nowrap">
                        <span className={runningBal > 0 ? 'text-rose-400' : runningBal < 0 ? 'text-emerald-400' : 'text-slate-400'}>
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
      )}

      {/* QUICK PAY MODAL */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-lg">Record Payment to {vendor.name}</h3>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mode</label>
                  <select
                    value={payMode}
                    onChange={(e: any) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reference</label>
                  <input
                    type="text"
                    placeholder="Cheque / UTR No"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={paymentMutation.isPending || payAmount <= 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {paymentMutation.isPending ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
