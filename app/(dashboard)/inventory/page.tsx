'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  Plus, 
  Search, 
  Package, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Eye, 
  Layers, 
  TrendingUp, 
  Boxes, 
  X,
  Filter,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  stockId: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  minStockLevel: z.number().min(0).default(10),
  currentStock: z.number().min(0).default(0),
  lastPurchaseRate: z.number().min(0).default(0),
  newPrice: z.number().min(0).optional(),
});

type ItemFormData = z.infer<typeof itemSchema>;

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Edit form state
  const [editStock, setEditStock] = useState(0);
  const [editMinStock, setEditMinStock] = useState(10);
  const [editRate, setEditRate] = useState(0);
  const [editNewPrice, setEditNewPrice] = useState(0);
  const [editCategory, setEditCategory] = useState('General');

  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', searchTerm, showLowStock],
    queryFn: async () => {
      const response = await api.get('/items', {
        params: { search: searchTerm, lowStock: showLowStock, limit: 200 },
      });
      return response.data.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: '',
      stockId: '',
      unit: 'pcs',
      category: 'General',
      minStockLevel: 10,
      currentStock: 0,
      lastPurchaseRate: 0,
      newPrice: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ItemFormData) => api.post('/items', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('New inventory item added successfully!');
      setIsAddModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/items/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Item stock updated successfully!');
      setIsEditModalOpen(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Item deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    },
  });

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditStock(item.currentStock);
    setEditMinStock(item.minStockLevel || 10);
    setEditRate(item.lastPurchaseRate || 0);
    setEditNewPrice(item.newPrice || item.lastPurchaseRate || 0);
    setEditCategory(item.category || 'General');
    setIsEditModalOpen(true);
  };

  const handleViewDetail = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from inventory?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleUpdateStock = () => {
    if (selectedItem) {
      updateMutation.mutate({
        id: selectedItem._id,
        data: {
          currentStock: editStock,
          minStockLevel: editMinStock,
          lastPurchaseRate: editRate,
          newPrice: editNewPrice,
          category: editCategory,
          lastUpdatedDate: new Date().toISOString(),
        },
      });
    }
  };

  const onSubmitAdd = (data: ItemFormData) => {
    createMutation.mutate(data);
  };

  // Metrics calculations
  const metrics = useMemo(() => {
    const list = items || [];
    const totalItems = list.length;
    const totalUnits = list.reduce((sum: number, it: any) => sum + (it.currentStock || 0), 0);
    const lowStockCount = list.filter((it: any) => (it.currentStock || 0) <= (it.minStockLevel || 10)).length;
    const totalValuation = list.reduce((sum: number, it: any) => sum + ((it.currentStock || 0) * (it.lastPurchaseRate || 0)), 0);
    return { totalItems, totalUnits, lowStockCount, totalValuation };
  }, [items]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    (items || []).forEach((it: any) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return (items || []).filter((item: any) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchCat;
    });
  }, [items, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-indigo-400" />
            Inventory Stock Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time item tracking, valuation, reorder levels, and catalog
          </p>
        </div>

        <button
          onClick={() => {
            reset();
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Add New Item
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Catalog</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{metrics.totalItems}</div>
          <span className="text-xs text-slate-400 font-medium">Distinct Products</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Stock Qty</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-300">{metrics.totalUnits.toLocaleString('en-IN')}</div>
          <span className="text-xs text-slate-400 font-medium">Units in Warehouse</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Low Stock Alert</span>
            <div className={`p-2 rounded-xl border ${metrics.lowStockCount > 0 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-3 text-2xl font-black ${metrics.lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {metrics.lowStockCount}
          </div>
          <span className="text-xs text-slate-400 font-medium">Items Below Threshold</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Stock Valuation</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400">
            ₹{Math.round(metrics.totalValuation).toLocaleString('en-IN')}
          </div>
          <span className="text-xs text-slate-400 font-medium">Purchase Rate Value</span>
        </div>
      </div>

      {/* Search, Filter & Category Tabs */}
      <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search items by name or stock ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* Low Stock Toggle Pill */}
          <button
            onClick={() => setShowLowStock(!showLowStock)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showLowStock
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-md shadow-rose-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock Only
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <LoadingSpinner size="lg" />
          <p className="text-sm mt-3 font-medium">Loading inventory items...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-xl backdrop-blur-xl">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs uppercase bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Stock ID</th>
                  <th className="px-5 py-3.5 font-bold">Item Details</th>
                  <th className="px-5 py-3.5 font-bold text-center">Unit</th>
                  <th className="px-5 py-3.5 font-bold text-center">Current Stock</th>
                  <th className="px-5 py-3.5 font-bold text-center">Min Level</th>
                  <th className="px-5 py-3.5 font-bold text-right">Cost Rate</th>
                  <th className="px-5 py-3.5 font-bold text-right">Selling Price</th>
                  <th className="px-5 py-3.5 font-bold text-right">Valuation</th>
                  <th className="px-5 py-3.5 font-bold text-center">Status</th>
                  <th className="px-5 py-3.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item: any) => {
                  const isLow = (item.currentStock || 0) <= (item.minStockLevel || 10);
                  const valuation = (item.currentStock || 0) * (item.lastPurchaseRate || 0);

                  return (
                    <tr key={item._id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                          #{item.stockId || 'N/A'}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[11px] text-slate-300">
                            {item.category || 'General'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap text-slate-400 uppercase text-xs font-semibold">
                        {item.unit || 'pcs'}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`text-base font-extrabold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {item.currentStock}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap text-xs text-slate-400">
                        {item.minStockLevel || 10}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap font-medium text-slate-300">
                        ₹{(item.lastPurchaseRate || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap font-bold text-cyan-300">
                        ₹{(item.newPrice || item.lastPurchaseRate || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4 text-right whitespace-nowrap font-semibold text-white">
                        ₹{Math.round(valuation).toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize border ${
                          isLow
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isLow ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Stock & Pricing"
                          >
                            <Edit3 className="w-4 h-4 text-indigo-400" />
                          </button>

                          <button
                            onClick={() => handleViewDetail(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="View Info"
                          >
                            <Eye className="w-4 h-4 text-cyan-400" />
                          </button>

                          <button
                            onClick={() => handleDelete(item._id, item.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Item"
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
          <Package className="w-12 h-12 stroke-[1.5] mx-auto mb-3 opacity-30 text-indigo-400" />
          <h3 className="text-base font-bold text-white">No Inventory Items Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'No items match your search filter.' : 'Start tracking stock by adding your first product.'}
          </p>
          <button
            onClick={() => {
              reset();
              setIsAddModalOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Item
          </button>
        </div>
      )}

      {/* ADD ITEM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Add New Product to Inventory</h3>
                  <p className="text-xs text-slate-400">Enter product parameters and opening stock</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmitAdd)} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Copper Wire 2.5mm"
                  {...register('name')}
                  className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Stock ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto generated if blank"
                    {...register('stockId')}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Raw Material, Hardware"
                    {...register('category')}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Unit *
                  </label>
                  <select
                    {...register('unit')}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="box">box</option>
                    <option value="m">m</option>
                    <option value="l">l</option>
                    <option value="set">set</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register('currentStock', { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Min Alert Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    {...register('minStockLevel', { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Cost Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('lastPurchaseRate', { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register('newPrice', { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Add Item to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-lg">Update Stock & Pricing</h3>
                <p className="text-xs text-slate-400">{selectedItem.name} (#{selectedItem.stockId})</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Current Stock ({selectedItem.unit})
                  </label>
                  <input
                    type="number"
                    value={editStock}
                    onChange={(e) => setEditStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Min Stock Alert
                  </label>
                  <input
                    type="number"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cost Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editNewPrice}
                    onChange={(e) => setEditNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateStock}
                  disabled={updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Save Stock Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-lg">Product Details</h3>
                <p className="text-xs text-slate-400">{selectedItem.name}</p>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-4 text-sm">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Stock ID:</span>
                <span className="font-mono font-bold text-indigo-400">#{selectedItem.stockId || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-white">{selectedItem.category || 'General'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Unit:</span>
                <span className="font-semibold text-white uppercase">{selectedItem.unit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Current Stock:</span>
                <span className={`font-black text-lg ${selectedItem.currentStock <= selectedItem.minStockLevel ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedItem.currentStock} {selectedItem.unit}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Min Alert Level:</span>
                <span className="font-semibold text-white">{selectedItem.minStockLevel} {selectedItem.unit}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Cost Rate:</span>
                <span className="font-semibold text-white">₹{(selectedItem.lastPurchaseRate || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Selling Price:</span>
                <span className="font-semibold text-cyan-300">₹{(selectedItem.newPrice || selectedItem.lastPurchaseRate || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Stock Valuation:</span>
                <span className="font-bold text-emerald-400">
                  ₹{Math.round((selectedItem.currentStock || 0) * (selectedItem.lastPurchaseRate || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-3">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEdit(selectedItem);
                  }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Edit This Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
