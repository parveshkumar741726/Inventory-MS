'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  ArrowLeft, 
  Printer, 
  Package, 
  CreditCard, 
  User, 
  FileText, 
  Calendar, 
  Building2, 
  Trash2, 
  CheckCircle2, 
  X,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.id as string;
  const queryClient = useQueryClient();

  // Quick Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'bank'>('cash');
  const [payRef, setPayRef] = useState('');

  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async () => {
      const response = await api.get(`/purchases/${purchaseId}`);
      return response.data.data;
    },
  });

  const purchase = purchaseData?.purchase || purchaseData;
  const purchaseItems = purchaseData?.items || [];

  const { data: payments } = useQuery({
    queryKey: ['payments', purchase?.vendor?._id],
    queryFn: async () => {
      const response = await api.get(`/payments?vendor=${purchase.vendor._id}`);
      return response.data.data;
    },
    enabled: !!purchase?.vendor?._id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/purchases/${purchaseId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Purchase invoice deleted and stock reverted');
      router.push('/purchases');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete invoice');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => api.post('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase', purchaseId] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment recorded successfully!');
      setIsPayModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete Invoice #${purchase?.invoiceNumber}? This will revert item stock quantities and vendor ledger.`)) {
      deleteMutation.mutate();
    }
  };

  const handlePaymentSubmit = () => {
    if (payAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    paymentMutation.mutate({
      vendor: purchase.vendor._id,
      purchase: purchase._id,
      amount: payAmount,
      paymentMode: payMode,
      referenceNumber: payRef,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Payment for invoice #${purchase.invoiceNumber}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <LoadingSpinner size="lg" />
        <p className="text-sm mt-3">Loading purchase invoice...</p>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="p-12 text-center text-slate-400">
        <h2 className="text-xl font-bold text-white mb-2">Invoice Not Found</h2>
        <button onClick={() => router.push('/purchases')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
          Back to Purchases
        </button>
      </div>
    );
  }

  const relatedPayments = payments?.filter((p: any) => {
    if (p.notes?.includes(purchase.invoiceNumber)) return true;
    if (p.purchase === purchase._id) return true;
    return false;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/purchases')}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Invoice #{purchase.invoiceNumber}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
                purchase.status === 'paid'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : purchase.status === 'partial'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {purchase.status || 'Pending'}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              {purchase.invoiceDate ? format(new Date(purchase.invoiceDate), 'dd MMMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {purchase.pendingAmount > 0 && (
            <button
              onClick={() => {
                setPayAmount(purchase.pendingAmount);
                setIsPayModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              Pay Bill (₹{purchase.pendingAmount?.toLocaleString('en-IN')})
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            Print Bill
          </button>

          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Delete Invoice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PRINT-FRIENDLY INVOICE HEADER (Visible only on Print) */}
      <div className="hidden print:block text-slate-900 border-b pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black">PURCHASE INVOICE BILL</h1>
            <p className="text-sm">Invoice #: <strong>{purchase.invoiceNumber}</strong></p>
            <p className="text-xs text-gray-600">Date: {purchase.invoiceDate ? format(new Date(purchase.invoiceDate), 'dd MMM yyyy') : 'N/A'}</p>
          </div>
          <div className="text-right text-xs">
            <h3 className="font-bold text-base">{purchase.vendor?.name}</h3>
            {purchase.vendor?.firmName && <p>{purchase.vendor.firmName}</p>}
            {purchase.vendor?.gstNumber && <p>GSTIN: {purchase.vendor.gstNumber}</p>}
            <p>{purchase.vendor?.phone}</p>
          </div>
        </div>
      </div>

      {/* VENDOR & INVOICE META CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        {/* Vendor Card */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Supplier Information</span>
          <div className="text-sm">
            <h3 className="text-base font-bold text-white">{purchase.vendor?.name}</h3>
            {purchase.vendor?.firmName && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-500" />
                {purchase.vendor.firmName}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block">Phone:</span>
                <span className="font-medium text-slate-200">{purchase.vendor?.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">GST Number:</span>
                <span className="font-mono font-medium text-slate-200">{purchase.vendor?.gstNumber || 'Unregistered'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Summary Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/30 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Grand Total Amount</span>
            <div className="mt-1 text-3xl font-black text-white">
              ₹{(purchase.total || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-emerald-400 font-bold">Paid: ₹{(purchase.paidAmount || 0).toLocaleString('en-IN')}</span>
              <span className="text-rose-400 font-bold">Pending: ₹{(purchase.pendingAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Tax Calculation Mode:</span>
            <span className="font-bold text-indigo-400 uppercase">{purchase.taxType || 'Exclusive'}</span>
          </div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="rounded-2xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-400" />
            Purchased Line Items
          </h3>
          <span className="text-xs text-slate-400 font-medium">{purchaseItems.length} Products</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-800/40 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3 font-bold">Product Name</th>
                <th className="px-5 py-3 font-bold text-center">Quantity</th>
                <th className="px-5 py-3 font-bold text-center">Unit</th>
                <th className="px-5 py-3 font-bold text-right">Cost Rate</th>
                <th className="px-5 py-3 font-bold text-center">GST %</th>
                <th className="px-5 py-3 font-bold text-right">Row Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchaseItems.map((item: any, idx: number) => (
                <tr key={item._id || idx} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3.5 font-bold text-white">
                    {item.item?.name || item.itemName}
                  </td>
                  <td className="px-5 py-3.5 text-center font-extrabold text-cyan-300">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs uppercase text-slate-400">
                    {item.unit || item.item?.unit || 'pcs'}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium">
                    ₹{(item.rate || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono text-xs text-indigo-300">
                    {item.taxPercent || 0}%
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold text-white">
                    ₹{(item.total || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST BREAKDOWN & TOTALS FOOTER */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Taxable Subtotal:</span>
              <span className="font-semibold text-white">₹{(purchase.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total GST Tax:</span>
              <span className="font-semibold text-indigo-400">+₹{(purchase.totalTax || 0).toLocaleString('en-IN')}</span>
            </div>
            {purchase.roundOff !== undefined && purchase.roundOff !== 0 && (
              <div className="flex justify-between text-slate-400">
                <span>Round Off:</span>
                <span className="font-semibold text-slate-300">₹{purchase.roundOff}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-slate-800">
              <span>Grand Total:</span>
              <span className="text-base text-emerald-400">₹{(purchase.total || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Paid So Far:</span>
              <span className="font-semibold text-emerald-400">₹{(purchase.paidAmount || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-bold text-rose-400 pt-1">
              <span>Balance Due:</span>
              <span>₹{(purchase.pendingAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAYMENT HISTORY */}
      {relatedPayments.length > 0 && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-5 shadow-xl space-y-3 print:hidden">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Associated Payment Vouchers
          </h3>
          <div className="divide-y divide-slate-800 text-xs">
            {relatedPayments.map((p: any) => (
              <div key={p._id} className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-emerald-400 text-sm">₹{(p.amount || 0).toLocaleString('en-IN')}</span>
                  <span className="text-slate-400 ml-2">via {p.paymentMode?.toUpperCase()}</span>
                  {p.referenceNumber && <span className="text-slate-500 ml-2">(Ref: {p.referenceNumber})</span>}
                </div>
                <span className="text-slate-400">{format(new Date(p.paymentDate), 'dd MMM yyyy')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK PAY MODAL */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-lg">Pay Invoice #{purchase.invoiceNumber}</h3>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Payment Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={purchase.pendingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-base font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">Pending Due: ₹{(purchase.pendingAmount || 0).toLocaleString('en-IN')}</p>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ref / UTR</label>
                  <input
                    type="text"
                    placeholder="Transaction ID"
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
                  onClick={handlePaymentSubmit}
                  disabled={paymentMutation.isPending || payAmount <= 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Confirm Bill Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
