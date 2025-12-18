'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, Package, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editStock, setEditStock] = useState(0);
  const [editRate, setEditRate] = useState(0);
  const [editNewPrice, setEditNewPrice] = useState(0);
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ['items', searchTerm, showLowStock],
    queryFn: async () => {
      const response = await api.get('/items', {
        params: { search: searchTerm, lowStock: showLowStock, limit: 100 },
      });
      return response.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/items/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success('Item updated successfully');
      setIsEditModalOpen(false);
      setSelectedItem(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update item');
    },
  });

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setEditStock(item.currentStock);
    setEditRate(item.lastPurchaseRate);
    setEditNewPrice(item.newPrice || item.lastPurchaseRate);
    setIsEditModalOpen(true);
  };

  const handleViewDetail = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  const handleUpdateStock = () => {
    if (selectedItem) {
      updateMutation.mutate({
        id: selectedItem._id,
        data: {
          currentStock: editStock,
          lastPurchaseRate: editRate,
          newPrice: editNewPrice,
          lastUpdatedDate: new Date().toISOString(),
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-gray-600 mt-1">Monitor your stock levels</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Low Stock Only</span>
            </label>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : items && items.length > 0 ? (
            <>
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item: any) => {
                      const isLowStock = item.currentStock <= item.minStockLevel;
                      return (
                        <tr key={item._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-mono text-sm font-semibold text-primary-600">{item.stockId || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.currentStock}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.minStockLevel}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                            ₹{item.lastPurchaseRate.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-semibold text-blue-600">
                              ₹{(item.newPrice || item.lastPurchaseRate).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {isLowStock ? (
                              <span className="flex items-center text-red-600 text-sm">
                                <AlertTriangle className="w-4 h-4 mr-1" />
                                Low Stock
                              </span>
                            ) : (
                              <span className="text-green-600 text-sm">In Stock</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleViewDetail(item)}
                                className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                              >
                                Detail
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="lg:hidden divide-y divide-gray-200">
                {items.map((item: any) => {
                  const isLowStock = item.currentStock <= item.minStockLevel;
                  return (
                    <div key={item._id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs font-semibold text-primary-600 block mb-1">ID: {item.stockId || 'N/A'}</span>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.unit}</p>
                        </div>
                        {isLowStock ? (
                          <span className="flex items-center text-red-600 text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Low
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">OK</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                        <div>
                          <span className="text-gray-600">Stock: </span>
                          <span className={`font-semibold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.currentStock}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Min: </span>
                          <span className="text-gray-900">{item.minStockLevel}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">Last Rate: </span>
                          <span className="text-gray-900">₹{item.lastPurchaseRate.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Package}
              title="No items found"
              description="Items will appear here once you make purchases"
            />
          )}
        </CardBody>
      </Card>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title="Edit Stock"
        size="md"
      >
        {selectedItem && (
          <div className="p-6 space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-1">{selectedItem.name}</h4>
              <p className="text-sm text-gray-600">Unit: {selectedItem.unit}</p>
            </div>
            <Input
              label="Current Stock *"
              type="number"
              value={editStock}
              onChange={(e) => setEditStock(parseFloat(e.target.value) || 0)}
              placeholder="Enter stock quantity"
            />
            <Input
              label="Last Purchase Rate *"
              type="number"
              value={editRate}
              onChange={(e) => setEditRate(parseFloat(e.target.value) || 0)}
              placeholder="Enter rate"
            />
            <Input
              label="New Price *"
              type="number"
              value={editNewPrice}
              onChange={(e) => setEditNewPrice(parseFloat(e.target.value) || 0)}
              placeholder="Enter new price"
            />
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedItem(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleUpdateStock}
                isLoading={updateMutation.isPending}
                className="flex-1"
              >
                Update Stock
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItem(null);
        }}
        title="Item Details"
        size="md"
      >
        {selectedItem && (
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Stock ID</span>
                <span className="font-mono font-semibold text-primary-600">{selectedItem.stockId || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Item Name</span>
                <span className="font-semibold text-gray-900">{selectedItem.name}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Unit</span>
                <span className="font-medium text-gray-900">{selectedItem.unit}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Current Stock</span>
                <span className={`font-bold text-lg ${selectedItem.currentStock <= selectedItem.minStockLevel ? 'text-red-600' : 'text-gray-900'}`}>
                  {selectedItem.currentStock}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Min Stock Level</span>
                <span className="font-medium text-gray-900">{selectedItem.minStockLevel}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Last Purchase Rate</span>
                <span className="font-semibold text-gray-900">₹{selectedItem.lastPurchaseRate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-medium text-gray-900">
                  {selectedItem.lastUpdatedDate ? new Date(selectedItem.lastUpdatedDate).toLocaleDateString() : 'Not updated'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-gray-600">Category</span>
                <span className="font-medium text-gray-900">{selectedItem.category || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                {selectedItem.currentStock <= selectedItem.minStockLevel ? (
                  <span className="flex items-center text-red-600 font-medium">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Low Stock
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">In Stock</span>
                )}
              </div>
            </div>
            <div className="pt-4">
              <Button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  handleEdit(selectedItem);
                }}
                className="w-full"
              >
                Edit Stock
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
