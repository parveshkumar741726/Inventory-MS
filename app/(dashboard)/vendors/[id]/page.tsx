'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Phone, Mail, MapPin, FileText, ShoppingCart, CreditCard, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type TabType = 'overview' | 'purchases' | 'payments' | 'ledger';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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
    enabled: activeTab === 'purchases',
  });

  const { data: payments } = useQuery({
    queryKey: ['vendor-payments', vendorId],
    queryFn: async () => {
      const response = await api.get('/payments', { params: { vendor: vendorId, limit: 100 } });
      return response.data.data;
    },
    enabled: activeTab === 'payments',
  });

  const { data: ledger } = useQuery({
    queryKey: ['vendor-ledger', vendorId],
    queryFn: async () => {
      const response = await api.get(`/ledger/vendor/${vendorId}`);
      return response.data.data;
    },
    enabled: activeTab === 'ledger',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!vendor) {
    return <div>Vendor not found</div>;
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: FileText },
    { id: 'purchases' as TabType, label: 'Purchases', icon: ShoppingCart },
    { id: 'payments' as TabType, label: 'Payments', icon: CreditCard },
    { id: 'ledger' as TabType, label: 'Ledger', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/vendors">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{vendor.name}</h1>
          <p className="text-gray-600 mt-1">Vendor Details</p>
        </div>
        <Badge variant={vendor.status === 'active' ? 'success' : 'default'}>
          {vendor.status}
        </Badge>
      </div>

      <Card>
        <CardBody className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Balance</p>
              <p className={`text-2xl font-bold ${vendor.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{vendor.currentBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
              <p className="text-xl font-semibold text-gray-900">
                ₹{vendor.openingBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Contact</p>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{vendor.phone}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{vendor.email || 'N/A'}</span>
              </div>
            </div>
          </div>
          {vendor.address && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-gray-700">{vendor.address}</span>
              </div>
            </div>
          )}
          {vendor.gstNumber && (
            <div className="mt-2">
              <span className="text-sm text-gray-600">GST: </span>
              <span className="text-sm font-medium text-gray-900">{vendor.gstNumber}</span>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="border-b border-gray-200">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Vendor Information</h3>
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{vendor.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{vendor.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{vendor.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">GST Number</p>
                  <p className="font-medium">{vendor.gstNumber || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge variant={vendor.status === 'active' ? 'success' : 'default'}>
                    {vendor.status}
                  </Badge>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Account Summary</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Opening Balance</span>
                  <span className="font-semibold">₹{vendor.openingBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Balance</span>
                  <span className={`font-bold text-lg ${vendor.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{vendor.currentBalance.toLocaleString()}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {vendor.currentBalance > 0 
                      ? '⚠️ Outstanding amount to be paid' 
                      : '✅ All payments settled'}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {activeTab === 'purchases' && (
          <Card>
            <CardBody className="p-0">
              {purchases && purchases.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {purchases.map((purchase: any) => (
                        <tr key={purchase._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium">{purchase.invoiceNumber}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {format(new Date(purchase.invoiceDate), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">
                            ₹{purchase.total.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                            ₹{purchase.paidAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                            ₹{purchase.pendingAmount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge variant={
                              purchase.status === 'paid' ? 'success' : 
                              purchase.status === 'partial' ? 'warning' : 'danger'
                            }>
                              {purchase.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No purchases found</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <CardBody className="p-0">
              {payments && payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((payment: any) => (
                        <tr key={payment._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-green-600">
                            ₹{payment.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="info">{payment.paymentMode.toUpperCase()}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {payment.referenceNumber || '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No payments found</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {activeTab === 'ledger' && (
          <Card>
            <CardBody className="p-0">
              {ledger && ledger.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ledger.map((entry: any) => (
                        <tr key={entry._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {format(new Date(entry.date), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              entry.type === 'purchase' ? 'info' :
                              entry.type === 'payment' ? 'success' : 'default'
                            }>
                              {entry.type}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{entry.reference || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {entry.debit > 0 ? (
                              <span className="font-semibold text-red-600">₹{entry.debit.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {entry.credit > 0 ? (
                              <span className="font-semibold text-green-600">₹{entry.credit.toLocaleString()}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`font-bold ${(entry.runningBalance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              ₹{Math.abs(entry.runningBalance || 0).toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No ledger entries found</p>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
