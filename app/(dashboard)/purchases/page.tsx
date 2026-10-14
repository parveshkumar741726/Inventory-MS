'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Eye, 
  Upload, 
  Trash2, 
  CreditCard, 
  Receipt, 
  Calendar, 
  Building2, 
  Tag, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  FileSpreadsheet,
  Percent,
  SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import Link from 'next/link';

const purchaseSchema = z.object({
  vendor: z.string().min(1, 'Vendor is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceDate: z.string().min(1, 'Invoice date is required'),
  taxType: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  damageQuantity: z.number().min(0).optional(),
  missingQuantity: z.number().min(0).optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1, 'Item name is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit: z.string().min(1, 'Unit is required'),
    rate: z.number().min(0, 'Rate must be positive'),
    discountPercent: z.number().min(0).max(100).optional().default(0),
    taxPercent: z.number().min(0).max(100, 'Tax must be between 0-100'),
  })).min(1, 'At least one item is required'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', searchTerm, statusFilter],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const response = await api.get('/purchases', { params });
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
    formState: { errors },
    setValue,
    watch
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      vendor: '',
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      taxType: 'exclusive',
      damageQuantity: 0,
      missingQuantity: 0,
      remark: '',
      items: [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, discountPercent: 0, taxPercent: 18 }]
    }
  });

  const formItems = watch('items') || [];
  const selectedTaxType = watch('taxType') || 'exclusive';

  // Live Bill Calculation Engine
  const calculateBillSummary = () => {
    let grossTotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let totalTaxAmount = 0;

    formItems.forEach((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const taxPercent = Number(item.taxPercent) || 0;
      const discPercent = Number(item.discountPercent) || 0;

      const lineGross = qty * rate;
      grossTotal += lineGross;

      const lineDisc = (lineGross * discPercent) / 100;
      totalDiscount += lineDisc;

      const afterDisc = lineGross - lineDisc;

      if (selectedTaxType === 'inclusive') {
        const lineTaxable = afterDisc / (1 + taxPercent / 100);
        const lineTax = afterDisc - lineTaxable;
        taxableAmount += lineTaxable;
        totalTaxAmount += lineTax;
      } else {
        const lineTaxable = afterDisc;
        const lineTax = (lineTaxable * taxPercent) / 100;
        taxableAmount += lineTaxable;
        totalTaxAmount += lineTax;
      }
    });

    const subtotal = Math.round(taxableAmount * 100) / 100;
    const tax = Math.round(totalTaxAmount * 100) / 100;
    const rawTotal = subtotal + tax;
    const grandTotal = Math.round(rawTotal);
    const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

    return {
      grossTotal: Math.round(grossTotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      taxableAmount: subtotal,
      cgst: Math.round((tax / 2) * 100) / 100,
      sgst: Math.round((tax / 2) * 100) / 100,
      totalTax: tax,
      roundOff,
      grandTotal,
    };
  };

  const billSummary = calculateBillSummary();

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const formData = new FormData();
      formData.append('vendor', data.vendor);
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('invoiceDate', data.invoiceDate);
      formData.append('taxType', data.taxType);
      formData.append('items', JSON.stringify(data.items || []));
      if (data.damageQuantity) formData.append('damageQuantity', data.damageQuantity.toString());
      if (data.missingQuantity) formData.append('missingQuantity', data.missingQuantity.toString());
      if (data.remark) formData.append('remark', data.remark);
      if (invoiceFile) {
        formData.append('invoiceFile', invoiceFile);
      }
      const response = await api.post('/purchases', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Purchase invoice recorded successfully!');
      setIsModalOpen(false);
      reset();
      setInvoiceFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create purchase');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/purchases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Purchase invoice deleted and stock reverted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete purchase');
    },
  });

  const handleDelete = (id: string, invoiceNumber: string) => {
    if (confirm(`Are you sure you want to delete Invoice #${invoiceNumber}? Stock quantities will be automatically reverted.`)) {
      deleteMutation.mutate(id);
    }
  };

  const onSubmit = async (data: PurchaseFormData) => {
    await createMutation.mutateAsync(data);
  };

  const addItem = () => {
    setValue('items', [
      ...formItems,
      { itemName: '', quantity: 1, unit: 'pcs', rate: 0, discountPercent: 0, taxPercent: 18 }
    ]);
  };

  const removeItem = (index: number) => {
    const updated = [...formItems];
    updated.splice(index, 1);
    setValue('items', updated);
  };

  const updateItem = (index: number, field: string, val: any) => {
    const updated = [...formItems];
    updated[index] = { ...updated[index], [field]: val };
    setValue('items', updated);
  };

  const handlePaymentSubmit = async (amount: number) => {
    try {
      await api.post('/payments', {
        vendor: selectedPurchase.vendor._id,
        purchase: selectedPurchase._id,
        amount,
        paymentMode: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Payment for invoice #${selectedPurchase.invoiceNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment voucher recorded successfully');
      setIsPaymentModalOpen(false);
      setSelectedPurchase(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  // Filter purchases by search query
  const filteredPurchases = (purchases || []).filter((p: any) => {
    const matchesSearch = 
      (p.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.vendor?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate top bar metrics
  const totalBillAmount = (purchases || []).reduce((acc: number, p: any) => acc + (p.total || 0), 0);
  const totalPendingAmount = (purchases || []).reduce((acc: number, p: any) => acc + (p.pendingAmount || 0), 0);
  const totalPaidAmount = (purchases || []).reduce((acc: number, p: any) => acc + (p.paidAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-7 h-7 text-indigo-400" />
            Purchase Invoices & Bills
          </h1>
          <p className="text-sm text-slate-400 mt-1">Manage vendor procurement, GST tax calculations, and invoices</p>
        </div>

        <button
          onClick={() => {
            reset();
            setValue('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, discountPercent: 0, taxPercent: 18 }]);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Create Purchase Bill
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Procurement</p>
            <p className="text-xl sm:text-2xl font-black text-white mt-1">₹{totalBillAmount.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500">{purchases?.length || 0} Bills Total</p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Paid to Vendors</p>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">₹{totalPaidAmount.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500">Successfully Cleared</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Payables</p>
            <p className="text-xl sm:text-2xl font-black text-rose-400 mt-1">₹{totalPendingAmount.toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-slate-500">Due to Suppliers</p>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or vendor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-850/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'pending', 'partial', 'paid'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List / Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <LoadingSpinner size="lg" />
          <p className="text-sm mt-3 font-medium">Fetching invoices...</p>
        </div>
      ) : filteredPurchases.length > 0 ? (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Invoice Details</th>
                  <th className="px-5 py-3.5 font-bold">Vendor</th>
                  <th className="px-5 py-3.5 font-bold">Tax Type</th>
                  <th className="px-5 py-3.5 font-bold text-right">Taxable</th>
                  <th className="px-5 py-3.5 font-bold text-right">GST Tax</th>
                  <th className="px-5 py-3.5 font-bold text-right">Grand Total</th>
                  <th className="px-5 py-3.5 font-bold text-center">Status</th>
                  <th className="px-5 py-3.5 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPurchases.map((purchase: any) => (
                  <tr key={purchase._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">#{purchase.invoiceNumber}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(purchase.invoiceDate), 'dd MMM yyyy')}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{purchase.vendor?.name || 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{purchase.vendor?.phone || 'No phone'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                        purchase.taxType === 'inclusive'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}>
                        {purchase.taxType || 'Exclusive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-slate-300">
                      ₹{(purchase.subtotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-right font-medium text-indigo-300">
                      +₹{(purchase.totalTax || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="font-extrabold text-white text-base">
                        ₹{(purchase.total || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-rose-400 font-semibold">
                        Due: ₹{(purchase.pendingAmount || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                        purchase.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : purchase.status === 'partial'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {purchase.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {purchase.pendingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedPurchase(purchase);
                              setIsPaymentModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
                          >
                            Pay
                          </button>
                        )}
                        <Link 
                          href={`/purchases/${purchase._id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(purchase._id, purchase.invoiceNumber)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
          <ShoppingCart className="w-12 h-12 stroke-[1.5] mx-auto mb-3 opacity-30 text-indigo-400" />
          <h3 className="text-base font-bold text-white">No Purchase Invoices Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No invoices match your search filters.' : 'Get started by creating your first purchase bill.'}
          </p>
        </div>
      )}

      {/* CREATE PURCHASE BILL MODAL WITH LIVE CALCULATION ENGINE */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
          setInvoiceFile(null);
        }}
        title="Create New Purchase Bill (GST Invoice)"
        subtitle="Record vendor invoice, tax mode, and itemized lines with automatic GST breakdown"
        icon={<Receipt className="w-5 h-5 text-indigo-400" />}
        size="2xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6 text-slate-200">
          {/* Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Vendor / Supplier *</span>
              </label>
              <select
                {...register('vendor')}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
              >
                <option value="" className="bg-slate-900 text-slate-400">Select Vendor</option>
                {vendors?.map((v: any) => (
                  <option key={v._id} value={v._id} className="bg-slate-900 text-white">
                    {v.name} ({v.firmName || 'Vendor'})
                  </option>
                ))}
              </select>
              {errors.vendor && <p className="mt-1 text-xs text-rose-400">{errors.vendor.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                <span>Invoice Number *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. INV-2024-001"
                {...register('invoiceNumber')}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
              />
              {errors.invoiceNumber && <p className="mt-1 text-xs text-rose-400">{errors.invoiceNumber.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Invoice Date *</span>
              </label>
              <input
                type="date"
                {...register('invoiceDate')}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Tax Mode Selector & File Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 shadow-inner">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                <span>GST Tax Calculation Mode *</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                  selectedTaxType === 'exclusive'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    value="exclusive"
                    {...register('taxType')}
                    className="sr-only"
                  />
                  <span>Exclusive (Base + GST)</span>
                </label>

                <label className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                  selectedTaxType === 'inclusive'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/60 hover:border-slate-700'
                }`}>
                  <input
                    type="radio"
                    value="inclusive"
                    {...register('taxType')}
                    className="sr-only"
                  />
                  <span>Inclusive (MRP includes GST)</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 bg-slate-900/70 p-2 rounded-lg border border-slate-800/80">
                {selectedTaxType === 'exclusive' 
                  ? '💡 Rate is base price; GST tax is added on top.' 
                  : '💡 Rate already includes GST tax; base taxable amount is extracted.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Attach Bill / Invoice Scan</span>
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gradient-to-r file:from-indigo-600 file:to-indigo-500 file:text-white hover:file:opacity-90 file:cursor-pointer cursor-pointer bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Supported formats: PDF, JPG, PNG (Max 5MB)
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Receipt className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Bill Line Items
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {formItems.length} {formItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/25 border border-indigo-500/40 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-1">
              {formItems.map((item, index) => {
                const qty = Number(item.quantity) || 0;
                const rate = Number(item.rate) || 0;
                const taxP = Number(item.taxPercent) || 0;
                const discP = Number(item.discountPercent) || 0;
                const gross = qty * rate;
                const disc = (gross * discP) / 100;
                const netAfterDisc = gross - disc;
                const rowTotal = selectedTaxType === 'inclusive' 
                  ? netAfterDisc 
                  : netAfterDisc + (netAfterDisc * taxP) / 100;

                return (
                  <div key={index} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/80 grid grid-cols-12 gap-2.5 items-center transition-all shadow-sm">
                    <div className="col-span-12 sm:col-span-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Item Name</label>
                      <input
                        type="text"
                        placeholder="Item Description"
                        value={item.itemName || ''}
                        onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Unit</label>
                      <select
                        value={item.unit || 'pcs'}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="w-full px-1.5 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="pcs" className="bg-slate-900">pcs</option>
                        <option value="kg" className="bg-slate-900">kg</option>
                        <option value="box" className="bg-slate-900">box</option>
                        <option value="m" className="bg-slate-900">m</option>
                        <option value="l" className="bg-slate-900">l</option>
                      </select>
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.rate || ''}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Disc %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPercent || ''}
                        placeholder="0"
                        onChange={(e) => updateItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">GST %</label>
                      <select
                        value={item.taxPercent || 18}
                        onChange={(e) => updateItem(index, 'taxPercent', parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-1.5 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="0" className="bg-slate-900">0%</option>
                        <option value="5" className="bg-slate-900">5%</option>
                        <option value="12" className="bg-slate-900">12%</option>
                        <option value="18" className="bg-slate-900">18%</option>
                        <option value="28" className="bg-slate-900">28%</option>
                      </select>
                    </div>

                    <div className="col-span-3 sm:col-span-1 text-right">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total</label>
                      <p className="text-xs font-black text-emerald-400">₹{Math.round(rowTotal).toLocaleString('en-IN')}</p>
                    </div>

                    <div className="col-span-1 text-center">
                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LIVE BILL CALCULATION SUMMARY WIDGET */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/50 border border-indigo-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                Invoice Calculation Summary (GST Breakdown)
              </h4>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Live Engine
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[11px] font-medium text-slate-400">Gross Amount</p>
                <p className="text-sm font-bold text-white mt-0.5">₹{billSummary.grossTotal.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[11px] font-medium text-slate-400">Total Discount</p>
                <p className="text-sm font-bold text-amber-400 mt-0.5">-₹{billSummary.totalDiscount.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[11px] font-medium text-slate-400">Taxable Value</p>
                <p className="text-sm font-bold text-white mt-0.5">₹{billSummary.taxableAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[11px] font-medium text-slate-400">Total GST Tax</p>
                <p className="text-sm font-bold text-cyan-400 mt-0.5">+₹{billSummary.totalTax.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span className="font-medium">Round Off:</span>
                <span className="font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  {billSummary.roundOff >= 0 ? `+₹${billSummary.roundOff}` : `-₹${Math.abs(billSummary.roundOff)}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Grand Total:</span>
                <span className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">
                  ₹{billSummary.grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-7 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Invoice...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Save Purchase Bill</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* QUICK PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPurchase(null);
        }}
        title="Record Supplier Payment"
        subtitle="Settle outstanding invoice balance"
        icon={<CreditCard className="w-5 h-5 text-emerald-400" />}
        size="md"
      >
        {selectedPurchase && (
          <div className="p-6 space-y-4 text-slate-200">
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 text-sm shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Vendor</span>
                <span className="font-bold text-white">{selectedPurchase.vendor?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Invoice Ref</span>
                <span className="font-mono font-semibold text-indigo-400">#{selectedPurchase.invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Pending Payable</span>
                <span className="text-lg font-black text-rose-400">₹{selectedPurchase.pendingAmount?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Payment Amount (₹)</span>
                <span className="text-[11px] text-slate-500 lowercase font-normal">Max: ₹{selectedPurchase.pendingAmount?.toLocaleString('en-IN')}</span>
              </label>
              <input
                type="number"
                id="modalPaymentAmount"
                defaultValue={selectedPurchase.pendingAmount}
                max={selectedPurchase.pendingAmount}
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('modalPaymentAmount') as HTMLInputElement;
                  const val = parseFloat(input?.value || '0');
                  if (val > 0) handlePaymentSubmit(val);
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
