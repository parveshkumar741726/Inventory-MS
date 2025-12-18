'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Download, Eye, FileText, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type ReportType = 'vendors' | 'purchases' | 'payments' | 'inventory' | 'ledger' | 'monthly';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vendor: '',
    status: '',
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors-list'],
    queryFn: async () => {
      const response = await api.get('/vendors', { params: { limit: 1000 } });
      return response.data.data;
    },
  });

  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['report', selectedReport, filters],
    queryFn: async () => {
      if (!selectedReport) return null;
      const response = await api.get(`/reports/${selectedReport}`, { params: filters });
      return response.data;
    },
    enabled: !!selectedReport,
  });

  const reports = [
    {
      id: 'vendors' as ReportType,
      title: 'Vendor Report',
      description: 'Complete vendor list with balances and transaction summary',
      icon: '👥',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      id: 'purchases' as ReportType,
      title: 'Purchase Report',
      description: 'Detailed purchase history with invoice details',
      icon: '🛒',
      color: 'bg-green-50 border-green-200',
    },
    {
      id: 'payments' as ReportType,
      title: 'Payment Report',
      description: 'All payments made to vendors with mode and reference',
      icon: '💰',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      id: 'inventory' as ReportType,
      title: 'Inventory Report',
      description: 'Current stock levels and low stock alerts',
      icon: '📦',
      color: 'bg-yellow-50 border-yellow-200',
    },
    {
      id: 'ledger' as ReportType,
      title: 'Ledger Report',
      description: 'Complete ledger with all debit/credit transactions',
      icon: '📒',
      color: 'bg-red-50 border-red-200',
    },
    {
      id: 'monthly' as ReportType,
      title: 'Monthly Summary',
      description: 'Month-wise purchase and payment summary',
      icon: '📊',
      color: 'bg-indigo-50 border-indigo-200',
    },
  ];

  const handleViewReport = (reportId: ReportType) => {
    setSelectedReport(reportId);
    setFilters({ startDate: '', endDate: '', vendor: '', status: '' });
  };

  const handleDownload = async () => {
    if (!selectedReport || !reportData?.data) {
      toast.error('No data to download');
      return;
    }

    try {
      // Convert data to CSV
      const data = reportData.data;
      if (!data || data.length === 0) {
        toast.error('No data available to download');
        return;
      }

      // Get headers from first object
      const headers = Object.keys(data[0]);
      
      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      
      data.forEach((row: any) => {
        const values = headers.map(header => {
          let value = row[header];
          
          // Handle nested objects (like vendor)
          if (typeof value === 'object' && value !== null) {
            value = value.name || value._id || JSON.stringify(value);
          }
          
          // Handle dates
          if (header.includes('Date') || header.includes('date')) {
            try {
              value = value ? format(new Date(value), 'yyyy-MM-dd') : '';
            } catch {
              value = value || '';
            }
          }
          
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value || '';
        });
        
        csvContent += values.join(',') + '\n';
      });

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedReport}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Generate and download comprehensive business reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {reports.map((report) => (
          <Card key={report.id} className={`border-2 ${report.color} hover:shadow-lg transition-all`}>
            <CardBody className="p-6">
              <div className="text-4xl mb-3">{report.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{report.title}</h3>
              <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{report.description}</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleViewReport(report.id)} 
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <Button 
                  onClick={() => {
                    handleViewReport(report.id);
                    setTimeout(() => {
                      if (reportData?.data) {
                        handleDownload();
                      }
                    }, 1000);
                  }} 
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={reports.find(r => r.id === selectedReport)?.title || 'Report'}
        size="xl"
      >
        <div className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {selectedReport !== 'inventory' && selectedReport !== 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                  <select
                    value={filters.vendor}
                    onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Vendors</option>
                    {vendors?.map((vendor: any) => (
                      <option key={vendor._id} value={vendor._id}>{vendor.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <Button onClick={() => refetch()} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : reportData ? (
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Report Preview</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {reportData.data?.length || 0} records found
                      </p>
                    </div>
                    <Button onClick={handleDownload} size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  {reportData.summary && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <h5 className="font-semibold text-gray-900 mb-2">Summary</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {Object.entries(reportData.summary).map(([key, value]: [string, any]) => (
                          <div key={key}>
                            <p className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                            <p className="font-semibold text-gray-900">
                              {typeof value === 'number' ? `₹${value.toLocaleString()}` : value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    <p className="mb-2">✅ Data loaded successfully</p>
                    <p className="mb-2">📊 {reportData.data?.length || 0} records in report</p>
                    <p>💾 Ready for PDF/Excel export</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Apply filters and click "Apply Filters" to generate report</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
