'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Search, ShoppingCart, Eye, Upload } from 'lucide-react';
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
  damageQuantity: z.number().min(0).optional(),
  missingQuantity: z.number().min(0).optional(),
  remark: z.string().optional(),
  items: z.array(z.object({
    itemName: z.string().min(1, 'Item name is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unit: z.string().min(1, 'Unit is required'),
    rate: z.number().min(0, 'Rate must be positive'),
    taxPercent: z.number().min(0).max(100, 'Tax must be between 0-100'),
  })).min(1, 'At least one item is required'),
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function PurchasesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  // Items are now managed by react-hook-form
  const queryClient = useQueryClient();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchases', searchTerm],
    queryFn: async () => {
      const response = await api.get('/purchases', {
        params: { limit: 100 },
      });
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
      items: [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]
    }
  });

  // Watch items to update form state
  const formItems = watch('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const formData = new FormData();
      formData.append('vendor', data.vendor);
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('invoiceDate', data.invoiceDate);
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
      toast.success('Purchase created successfully');
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingPurchase(null);
      reset();
      setValue('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);
      setInvoiceFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create purchase');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PurchaseFormData) => {
      const formData = new FormData();
      formData.append('vendor', data.vendor);
      formData.append('invoiceNumber', data.invoiceNumber);
      formData.append('invoiceDate', data.invoiceDate);
      formData.append('items', JSON.stringify(data.items));
      if (data.damageQuantity) formData.append('damageQuantity', data.damageQuantity.toString());
      if (data.missingQuantity) formData.append('missingQuantity', data.missingQuantity.toString());
      if (data.remark) formData.append('remark', data.remark);
      if (invoiceFile) {
        formData.append('invoiceFile', invoiceFile);
      }
      const response = await api.put(`/purchases/${editingPurchase._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      toast.success('Purchase updated successfully');
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingPurchase(null);
      reset();
      setValue('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);
      setInvoiceFile(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update purchase');
    },
  });

  const onSubmit = async (data: PurchaseFormData) => {
    console.log('Submitting form data:', data);
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const addItem = () => {
    const currentItems = formItems || [];
    setValue('items', [...currentItems, { itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = [...(formItems || [])];
    currentItems.splice(index, 1);
    setValue('items', currentItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const currentItems = [...(formItems || [])];
    currentItems[index] = { ...currentItems[index], [field]: value };
    setValue('items', currentItems);
  };

  const calculateTotal = () => {
    return (formItems || []).reduce((total, item) => {
      const quantity = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const taxPercent = Number(item.taxPercent) || 0;
      const subtotal = quantity * rate;
      const tax = (subtotal * taxPercent) / 100;
      return total + subtotal + tax;
    }, 0);
  };

  const handlePayment = (purchase: any) => {
    setSelectedPurchase(purchase);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (amount: number) => {
    try {
      await api.post('/payments', {
        vendor: selectedPurchase.vendor._id,
        purchase: selectedPurchase._id,
        amount,
        paymentMode: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: `Payment for invoice ${selectedPurchase.invoiceNumber}`,
      });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
      setSelectedPurchase(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleEdit = async (purchase: any) => {
    setIsEditMode(true);
    setEditingPurchase(purchase);

    // Fetch purchase with items
    try {
      const response = await api.get(`/purchases/${purchase._id}`);
      const purchaseData = response.data.data;
      const items = purchaseData.items || [];

      // Pre-fill form with purchase data
      setValue('vendor', purchase.vendor._id || purchase.vendor);
      setValue('invoiceNumber', purchase.invoiceNumber);
      setValue('invoiceDate', format(new Date(purchase.invoiceDate), 'yyyy-MM-dd'));
      setValue('damageQuantity', purchase.damageQuantity || 0);
      setValue('missingQuantity', purchase.missingQuantity || 0);
      setValue('remark', purchase.remark || '');
      setValue('items', items.map((item: any) => ({
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        taxPercent: item.taxPercent,
      })));

      setIsModalOpen(true);
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to load purchase details');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Purchases</h1>
          <p className="text-gray-600 mt-1">Track and manage all purchases</p>
        </div>
        <Button onClick={() => {
          setIsEditMode(false);
          setEditingPurchase(null);
          reset();
          setValue('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);
          setIsModalOpen(true);
        }} className="w-full sm:w-auto">
          <Plus className="w-5 h-5 mr-2" />
          Add Purchase
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search purchases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : purchases && purchases.length > 0 ? (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {purchases.map((purchase: any) => (
                      <tr key={purchase._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{purchase.invoiceNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{purchase.vendor?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {format(new Date(purchase.invoiceDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-gray-900">₹{purchase.total.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-green-600">₹{purchase.paidAmount.toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-semibold text-red-600">₹{(purchase.total - purchase.paidAmount).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${purchase.status === 'paid' ? 'bg-green-100 text-green-800' :
                              purchase.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                            }`}>
                            {purchase.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Link href={`/purchases/${purchase._id}`}>
                              <Button variant="ghost" size="sm" title="View Details">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>

                            <button
                              onClick={() => handleEdit(purchase)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              Edit
                            </button>
                            {purchase.status !== 'paid' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handlePayment(purchase)}
                              >
                                Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-gray-200">
                {purchases.map((purchase: any) => (
                  <div key={purchase._id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{purchase.invoiceNumber}</h3>
                        <p className="text-sm text-gray-600">{purchase.vendor?.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(purchase.invoiceDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${purchase.status === 'paid' ? 'bg-green-100 text-green-800' :
                          purchase.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {purchase.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <p className="text-sm text-gray-600">Total: <span className="font-semibold text-gray-900">₹{purchase.total.toLocaleString()}</span></p>
                        <p className="text-sm text-gray-600">Paid: <span className="text-green-600">₹{purchase.paidAmount.toLocaleString()}</span></p>
                        <p className="text-sm text-gray-600">Pending: <span className="font-semibold text-red-600">₹{(purchase.total - purchase.paidAmount).toLocaleString()}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(purchase)}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          Edit
                        </button>
                        <Link href={`/purchases/${purchase._id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={ShoppingCart}
              title="No purchases found"
              description="Start by adding your first purchase"
              action={{ label: 'Add Purchase', onClick: () => setIsModalOpen(true) }}
            />
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setIsEditMode(false);
          setEditingPurchase(null);
          reset();
          setValue('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);
          setInvoiceFile(null);
        }}
        title={isEditMode ? "Edit Purchase" : "Add New Purchase"}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4" encType="multipart/form-data">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
              <select
                {...register('vendor')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Vendor</option>
                {vendors?.map((vendor: any) => (
                  <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                ))}
              </select>
              {errors.vendor && <p className="mt-1 text-sm text-red-600">{errors.vendor.message as string}</p>}
            </div>
            <Input
              label="Invoice Number *"
              placeholder="INV-001"
              error={errors.invoiceNumber?.message as string}
              {...register('invoiceNumber')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Invoice Date *"
              type="date"
              error={errors.invoiceDate?.message as string}
              {...register('invoiceDate')}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice File</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Damage Quantity"
              type="number"
              placeholder="0"
              error={errors.damageQuantity?.message as string}
              {...register('damageQuantity', { valueAsNumber: true })}
            />
            <Input
              label="Missing Quantity"
              type="number"
              placeholder="0"
              error={errors.missingQuantity?.message as string}
              {...register('missingQuantity', { valueAsNumber: true })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
              <input
                type="text"
                placeholder="Add remark..."
                {...register('remark')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Items</h3>
              <Button type="button" onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {formItems?.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="col-span-12 md:col-span-3">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={item.itemName || ''}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="1"
                      step="1"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <select
                      value={item.unit || 'pcs'}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pcs">pcs</option>
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="l">l</option>
                      <option value="m">m</option>
                      <option value="box">box</option>
                    </select>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <input
                      type="number"
                      placeholder="Rate"
                      value={item.rate || ''}
                      onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-5 md:col-span-2">
                    <input
                      type="number"
                      placeholder="Tax %"
                      value={item.taxPercent || ''}
                      onChange={(e) => updateItem(index, 'taxPercent', parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div className="col-span-1">
                    {(formItems?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-primary-50 rounded-lg">
              {errors.items && (
                <p className="text-red-600 text-sm mb-2">
                  {errors.items.message as string}
                </p>
              )}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Total Amount:</span>
                <span className="text-xl font-bold text-primary-600">₹{calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                reset();
                setValue('items', [{ itemName: '', quantity: 1, unit: 'pcs', rate: 0, taxPercent: 0 }]);
                setInvoiceFile(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {isEditMode ? 'Update Purchase' : 'Create Purchase'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPurchase(null);
        }}
        title="Record Payment"
        size="md"
      >
        {selectedPurchase && (
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Purchase Details</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">Vendor:</span> <span className="font-medium">{selectedPurchase.vendor?.name}</span></p>
                <p><span className="text-gray-600">Invoice:</span> <span className="font-medium">{selectedPurchase.invoiceNumber}</span></p>
                <p><span className="text-gray-600">Total Amount:</span> <span className="font-semibold text-gray-900">₹{selectedPurchase.total?.toLocaleString()}</span></p>
                <p><span className="text-gray-600">Paid Amount:</span> <span className="text-green-600">₹{selectedPurchase.paidAmount?.toLocaleString()}</span></p>
                <p><span className="text-gray-600">Pending Amount:</span> <span className="font-bold text-red-600">₹{selectedPurchase.pendingAmount?.toLocaleString()}</span></p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
              <input
                type="number"
                id="paymentAmount"
                max={selectedPurchase.pendingAmount}
                placeholder="Enter amount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum: ₹{selectedPurchase.pendingAmount?.toLocaleString()}</p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setSelectedPurchase(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const input = document.getElementById('paymentAmount') as HTMLInputElement;
                  const amount = parseFloat(input?.value || '0');
                  if (amount > 0 && amount <= selectedPurchase.pendingAmount) {
                    handlePaymentSubmit(amount);
                  } else {
                    toast.error('Please enter a valid amount');
                  }
                }}
                className="flex-1"
              >
                Record Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
