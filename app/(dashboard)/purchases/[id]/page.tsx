'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ArrowLeft, Printer, Package, CreditCard, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const purchaseId = params.id as string;

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

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Purchase Not Found</h2>
        <Button onClick={() => router.push('/purchases')}>Back to Purchases</Button>
      </div>
    );
  }

  const relatedPayments = payments?.filter((p: any) => {
    if (p.notes?.includes(purchase.invoiceNumber)) return true;
    if (p.paymentDate && purchase.invoiceDate) {
      try {
        return format(new Date(p.paymentDate), 'yyyy-MM-dd') === format(new Date(purchase.invoiceDate), 'yyyy-MM-dd');
      } catch {
        return false;
      }
    }
    return false;
  }) || [];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/purchases')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Purchase Details</h1>
            <p className="text-gray-600 mt-1">Invoice #{purchase.invoiceNumber}</p>
          </div>
        </div>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Print
        </Button>
      </div>

      {/* Print Header - Only visible on print */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Invoice</h1>
        <p className="text-gray-600 mt-2">Invoice #{purchase.invoiceNumber}</p>
        <p className="text-sm text-gray-500">
          {purchase.invoiceDate ? format(new Date(purchase.invoiceDate), 'MMMM dd, yyyy') : 'N/A'}
        </p>
      </div>

      {/* Invoice Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Invoice Information</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="font-semibold text-gray-900">{purchase.invoiceNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Invoice Date</p>
              <p className="font-medium text-gray-900">
                {purchase.invoiceDate ? format(new Date(purchase.invoiceDate), 'MMMM dd, yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Invoice File</p>
              {purchase.invoiceFile ? (
                <a 
                  href={purchase.invoiceFile} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  View Invoice
                </a>
              ) : (
                <p className="font-medium text-gray-500">No file uploaded</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Vendor Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Vendor Information</h2>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vendor Name</p>
              <p className="font-semibold text-gray-900">{purchase.vendor?.name}</p>
            </div>
            {purchase.vendor?.firmName && (
              <div>
                <p className="text-sm text-gray-600">Firm Name</p>
                <p className="font-semibold text-gray-900">{purchase.vendor.firmName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-900">{purchase.vendor?.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{purchase.vendor?.email || 'N/A'}</p>
            </div>
            {purchase.vendor?.address && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Address</p>
                <p className="font-medium text-gray-900">{purchase.vendor.address}</p>
              </div>
            )}
            {purchase.vendor?.gstNumber && (
              <div>
                <p className="text-sm text-gray-600">GST Number</p>
                <p className="font-medium text-gray-900">{purchase.vendor.gstNumber}</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Purchase Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Items Purchased</h2>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {purchaseItems?.map((item: any) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 text-gray-900">{item.item?.name || item.itemName}</td>
                    <td className="px-6 py-4 text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 text-gray-600">{item.unit}</td>
                    <td className="px-6 py-4 text-gray-600">₹{item.rate.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">{item.taxPercent}%</td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-900">₹{item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Damage/Missing Info */}
          {(purchase.damageQuantity || purchase.missingQuantity || purchase.remark) && (
            <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
              <h4 className="font-semibold text-amber-900 mb-2">Additional Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-amber-700">Damaged Quantity: </span>
                  <span className="font-semibold text-amber-900">{purchase.damageQuantity || 0} units</span>
                </div>
                <div>
                  <span className="text-amber-700">Missing Quantity: </span>
                  <span className="font-semibold text-amber-900">{purchase.missingQuantity || 0} units</span>
                </div>
                <div className="md:col-span-1">
                  <span className="text-amber-700">Remark: </span>
                  <span className="text-amber-900">{purchase.remark || 'None'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-full md:w-1/2 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{(purchase.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>₹{(purchase.totalTax || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                  <span>Total:</span>
                  <span>₹{(purchase.total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>₹{(purchase.paidAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-red-600">
                  <span>Pending:</span>
                  <span>₹{(purchase.pendingAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Payment History</h2>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {relatedPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {relatedPayments.map((payment: any) => (
                    <tr key={payment._id}>
                      <td className="px-6 py-4 text-gray-900">
                        {payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-green-600">
                        ₹{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600 uppercase">{payment.paymentMode}</td>
                      <td className="px-6 py-4 text-gray-600">{payment.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No payments recorded yet
            </div>
          )}
        </CardBody>
      </Card>

      {/* Additional Info */}
      {purchase.notes && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Additional Notes</h2>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-gray-700">{purchase.notes}</p>
          </CardBody>
        </Card>
      )}

      {/* Print Button - Bottom */}
      <div className="flex justify-center print:hidden pb-8">
        <Button onClick={handlePrint} size="lg" className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Print Invoice
        </Button>
      </div>
    </div>
  );
}
