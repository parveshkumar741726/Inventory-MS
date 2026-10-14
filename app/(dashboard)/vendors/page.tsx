'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  CreditCard, 
  DollarSign, 
  CheckCircle2, 
  X,
  FileSpreadsheet,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';

const vendorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  firmName: z.string().optional(),
  phone: z.string().min(10, 'Valid 10-digit phone required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  openingBalance: z.number().min(0).optional(),
  openingBalanceType: z.enum(['debit', 'credit']).default('credit'),
  status: z.enum(['active', 'inactive']).default('active'),
});

type VendorFormData = z.infer<typeof vendorSchema>;

export default function VendorsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);

  // Quick Pay Modal
  const [payingVendor, setPayingVendor] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'cash' | 'upi' | 'bank'>('cash');
  const [payRef, setPayRef] = useState('');

  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors', searchTerm],
    queryFn: async () => {
      const response = await api.get('/vendors', {
        params: { search: searchTerm, limit: 200 },
      });
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      firmName: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      openingBalance: 0,
      openingBalanceType: 'debit',
      status: 'active',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: VendorFormData) => api.post('/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Vendor registered successfully');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create vendor');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: VendorFormData }) =>
      api.put(`/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Vendor details updated successfully');
      setIsModalOpen(false);
      setEditingVendor(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vendor');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete vendor');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (data: any) => api.post('/payments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Payment recorded successfully!');
      setPayingVendor(null);
      setPayAmount(0);
      setPayRef('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    },
  });

  const onSubmit = (data: VendorFormData) => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (vendor: any) => {
    setEditingVendor(vendor);
    reset({
      name: vendor.name,
      firmName: vendor.firmName || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gstNumber: vendor.gstNumber || '',
      openingBalance: vendor.openingBalance || 0,
      openingBalanceType: vendor.openingBalanceType || 'debit',
      status: vendor.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete vendor "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddNew = () => {
    setEditingVendor(null);
    reset({
      name: '',
      firmName: '',
      phone: '',
      email: '',
      address: '',
      gstNumber: '',
      openingBalance: 0,
      openingBalanceType: 'debit',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleQuickPay = (vendor: any) => {
    setPayingVendor(vendor);
    setPayAmount(vendor.currentBalance > 0 ? vendor.currentBalance : 0);
  };

  const submitQuickPay = () => {
    if (!payingVendor || payAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    paymentMutation.mutate({
      vendor: payingVendor._id,
      amount: payAmount,
      paymentMode: payMode,
      referenceNumber: payRef,
      paymentDate: new Date().toISOString().split('T')[0],
      notes: `Quick payment voucher to ${payingVendor.name}`,
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const list = vendors || [];
    const totalVendors = list.length;
    const activeVendors = list.filter((v: any) => v.status === 'active').length;
    const totalPayables = list.reduce((sum: number, v: any) => sum + Math.max(0, v.currentBalance || 0), 0);
    const totalAdvance = list.reduce((sum: number, v: any) => sum + ((v.currentBalance < 0) ? Math.abs(v.currentBalance) : 0), 0);
    return { totalVendors, activeVendors, totalPayables, totalAdvance };
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    return (vendors || []).filter((vendor: any) => {
      const matchStatus = statusFilter === 'all' || vendor.status === statusFilter;
      return matchStatus;
    });
  }, [vendors, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-400" />
            Vendors & Supplier Directory
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage suppliers, track balances, record disbursements, and review ledgers
          </p>
        </div>

        <button
          onClick={handleAddNew}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add New Vendor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Suppliers</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{metrics.totalVendors}</div>
          <span className="text-xs text-slate-400 font-medium">{metrics.activeVendors} Active Accounts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Payables Due</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-400">
            ₹{Math.round(metrics.totalPayables).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Pending Supplier Dues</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Advance Given</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400">
            ₹{Math.round(metrics.totalAdvance).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Prepaid / Credit with Vendors</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Status Rate</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-300">
            {metrics.totalVendors > 0 ? Math.round((metrics.activeVendors / metrics.totalVendors) * 100) : 100}%
          </div>
          <span className="text-xs text-slate-400 font-medium">Verified Active Accounts</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by vendor name, firm name, phone or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Vendors Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <LoadingSpinner size="lg" />
          <p className="text-sm mt-3 font-medium">Loading vendor list...</p>
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Vendor Profile</th>
                  <th className="px-5 py-3.5 font-bold">Contact Details</th>
                  <th className="px-5 py-3.5 font-bold">Tax / GST</th>
                  <th className="px-5 py-3.5 font-bold text-right">Current Balance</th>
                  <th className="px-5 py-3.5 font-bold text-center">Status</th>
                  <th className="px-5 py-3.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredVendors.map((vendor: any) => {
                  const balance = vendor.currentBalance || 0;
                  const isPayable = balance > 0;
                  const isAdvance = balance < 0;

                  return (
                    <tr key={vendor._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
                            {vendor.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <Link 
                              href={`/vendors/${vendor._id}`}
                              className="font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-1 group"
                            >
                              {vendor.name}
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                            {vendor.firmName && (
                              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-slate-500" />
                                {vendor.firmName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1 text-xs">
                          {vendor.phone && (
                            <a 
                              href={`tel:${vendor.phone}`}
                              className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-400"
                            >
                              <Phone className="w-3 h-3 text-indigo-400" />
                              {vendor.phone}
                            </a>
                          )}
                          {vendor.email && (
                            <a 
                              href={`mailto:${vendor.email}`}
                              className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400"
                            >
                              <Mail className="w-3 h-3 text-slate-500" />
                              {vendor.email}
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {vendor.gstNumber ? (
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {vendor.gstNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Unregistered</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className={`text-base font-extrabold ${isPayable ? 'text-rose-400' : isAdvance ? 'text-emerald-400' : 'text-slate-400'}`}>
                          ₹{Math.abs(balance).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {isPayable ? 'To Pay (Due)' : isAdvance ? 'Advance Balance' : 'Settled (₹0)'}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize border ${
                          vendor.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-700 text-slate-400 border-slate-600'
                        }`}>
                          {vendor.status || 'Active'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPayable && (
                            <button
                              onClick={() => handleQuickPay(vendor)}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all"
                              title="Make Payment"
                            >
                              Pay
                            </button>
                          )}

                          <Link
                            href={`/vendors/${vendor._id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Vendor Details & Ledger"
                          >
                            <Eye className="w-4 h-4 text-cyan-400" />
                          </Link>

                          <button
                            onClick={() => handleEdit(vendor)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Vendor"
                          >
                            <Edit3 className="w-4 h-4 text-indigo-400" />
                          </button>

                          <button
                            onClick={() => handleDelete(vendor._id, vendor.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
          <Users className="w-12 h-12 stroke-[1.5] mx-auto mb-3 opacity-30 text-indigo-400" />
          <h3 className="text-base font-bold text-white">No Vendors Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No vendors match your search query.' : 'Register your first supplier or contractor to begin.'}
          </p>
          <button
            onClick={handleAddNew}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vendor
          </button>
        </div>
      )}

      {/* ADD/EDIT VENDOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {editingVendor ? 'Edit Vendor Details' : 'Register New Vendor'}
                  </h3>
                  <p className="text-xs text-slate-400">Manage vendor contact and ledger parameters</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    {...register('name')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Firm / Business Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RK Electricals Pvt Ltd"
                    {...register('firmName')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    placeholder="10-digit mobile number"
                    {...register('phone')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {errors.phone && <p className="text-xs text-rose-400 mt-1">{errors.phone.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="vendor@company.com"
                    {...register('email')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    placeholder="22AAAAA0000A1Z5"
                    {...register('gstNumber')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Full Address / Warehouse Location
                </label>
                <textarea
                  rows={2}
                  placeholder="Plot No, Street, City, State, PIN"
                  {...register('address')}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!editingVendor && (
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Opening Balance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      {...register('openingBalance', { valueAsNumber: true })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Balance Type
                    </label>
                    <select
                      {...register('openingBalanceType')}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="credit">Credit (Amount Due / Payable to Vendor)</option>
                      <option value="debit">Debit (Advance Paid to Vendor)</option>
                    </select>
                  </div>
                </div>
              )}

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
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingVendor ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PAY MODAL */}
      {payingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Record Vendor Payment</h3>
                  <p className="text-xs text-slate-400">Pay to: {payingVendor.name}</p>
                </div>
              </div>
              <button
                onClick={() => setPayingVendor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex justify-between items-center">
                <span className="text-xs text-slate-400">Current Outstanding:</span>
                <span className="text-base font-extrabold text-rose-400">
                  ₹{(payingVendor.currentBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Payment Amount (₹) *
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Mode
                  </label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ref / Cheque No
                  </label>
                  <input
                    type="text"
                    placeholder="Optional transaction ID"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingVendor(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitQuickPay}
                  disabled={paymentMutation.isPending || payAmount <= 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
                >
                  {paymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
