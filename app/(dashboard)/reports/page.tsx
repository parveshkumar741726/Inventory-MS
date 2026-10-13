'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
  BarChart3, 
  Download, 
  Eye, 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Package, 
  BookOpen, 
  Calendar, 
  X, 
  Filter,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
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

  const reportCards = [
    {
      id: 'purchases' as ReportType,
      title: 'Procurement & Purchase Report',
      description: 'Itemized purchase history, taxable amounts, GST breakdowns, and invoice payment statuses.',
      icon: ShoppingCart,
      color: 'from-indigo-600 to-blue-500',
      badge: 'GST & Invoices',
    },
    {
      id: 'vendors' as ReportType,
      title: 'Vendor Ledger & Balance Statement',
      description: 'Comprehensive directory of suppliers with lifetime debits, disbursements, and dues.',
      icon: Users,
      color: 'from-cyan-600 to-teal-500',
      badge: 'Payables & Balances',
    },
    {
      id: 'payments' as ReportType,
      title: 'Disbursements & Payment Vouchers',
      description: 'All recorded payments across cash, UPI, and bank transfers with transaction UTR numbers.',
      icon: CreditCard,
      color: 'from-emerald-600 to-green-500',
      badge: 'Cashflow Outflow',
    },
    {
      id: 'inventory' as ReportType,
      title: 'Inventory Valuation & Reorder Report',
      description: 'Warehouse stock counts, low stock alerts below min threshold, and purchase cost valuation.',
      icon: Package,
      color: 'from-amber-600 to-orange-500',
      badge: 'Stock Levels',
    },
    {
      id: 'ledger' as ReportType,
      title: 'General Accounting Ledger Book',
      description: 'Full chronological double-entry record with running balance tracking for all vendors.',
      icon: BookOpen,
      color: 'from-purple-600 to-pink-500',
      badge: 'Accounting Audit',
    },
    {
      id: 'monthly' as ReportType,
      title: 'Executive Monthly Business Summary',
      description: 'High-level executive metrics for monthly procurement totals, supplier payables, and trends.',
      icon: BarChart3,
      color: 'from-rose-600 to-red-500',
      badge: 'Executive Summary',
    },
  ];

  const handleOpenReport = (id: ReportType) => {
    setSelectedReport(id);
    setFilters({ startDate: '', endDate: '', vendor: '', status: '' });
  };

  const handleDownload = () => {
    if (!selectedReport || !reportData) {
      toast.error('No report data available to export');
      return;
    }

    try {
      let csvContent = '';
      const raw = reportData.data;

      if (selectedReport === 'monthly') {
        // Special formatting for monthly summary object
        csvContent = 'Category,Metric,Value\n';
        csvContent += `Purchases,Total Invoice Count,${raw.purchases?.count || 0}\n`;
        csvContent += `Purchases,Grand Total Value,${raw.purchases?.total || 0}\n`;
        csvContent += `Purchases,Total Paid,${raw.purchases?.paid || 0}\n`;
        csvContent += `Purchases,Total Pending Due,${raw.purchases?.pending || 0}\n`;
        csvContent += `Payments,Total Payments Count,${raw.payments?.count || 0}\n`;
        csvContent += `Payments,Disbursed Amount,${raw.payments?.total || 0}\n`;
        csvContent += `Payments,Cash Outflow,${raw.payments?.byMode?.cash || 0}\n`;
        csvContent += `Payments,UPI Outflow,${raw.payments?.byMode?.upi || 0}\n`;
        csvContent += `Payments,Bank Outflow,${raw.payments?.byMode?.bank || 0}\n`;
        csvContent += `Vendors,Total Registered,${raw.vendors?.total || 0}\n`;
        csvContent += `Vendors,Total Outstanding Dues,${raw.vendors?.totalOutstanding || 0}\n`;

        if (raw.vendors?.topVendors?.length > 0) {
          csvContent += '\nTop Outstanding Vendors\nVendor Name,Pending Balance\n';
          raw.vendors.topVendors.forEach((v: any) => {
            csvContent += `"${v.name}",${v.balance}\n`;
          });
        }
      } else if (Array.isArray(raw) && raw.length > 0) {
        // Flat array CSV generator
        const headers = Object.keys(raw[0]).filter(k => !['_id', '__v', 'createdBy', 'deletedBy', 'isDeleted'].includes(k));
        csvContent = headers.join(',') + '\n';

        raw.forEach((row: any) => {
          const values = headers.map(header => {
            let val = row[header];
            if (typeof val === 'object' && val !== null) {
              val = val.name || val.invoiceNumber || JSON.stringify(val);
            }
            if (header.toLowerCase().includes('date') && val) {
              try { val = format(new Date(val), 'yyyy-MM-dd'); } catch {}
            }
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
              val = `"${val.replace(/"/g, '""')}"`;
            }
            return val !== undefined && val !== null ? val : '';
          });
          csvContent += values.join(',') + '\n';
        });
      } else {
        toast.error('No record rows found for this date range');
        return;
      }

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedReport}_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('CSV Report exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export CSV report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-400" />
            Analytics & Management Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Export structured business statements, inventory reconciliations, and tax summaries
          </p>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportCards.map((rep) => {
          const Icon = rep.icon;
          return (
            <div
              key={rep.id}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl shadow-xl hover:border-slate-700 hover:shadow-2xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rep.color} flex items-center justify-center text-white shadow-lg`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {rep.badge}
                  </span>
                </div>

                <h3 className="font-extrabold text-white text-base group-hover:text-indigo-400 transition-colors">
                  {rep.title}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {rep.description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-5 border-t border-slate-800/80 mt-5">
                <button
                  onClick={() => handleOpenReport(rep.id)}
                  className="flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Report
                </button>

                <button
                  onClick={() => {
                    handleOpenReport(rep.id);
                    setTimeout(() => handleDownload(), 600);
                  }}
                  className="py-2 px-3 rounded-xl font-semibold text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  Export
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* REPORT VIEWER MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-750 shadow-2xl flex flex-col text-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-lg capitalize">
                    {selectedReport} Report Preview
                  </h3>
                  <p className="text-xs text-slate-400">Data statement with real-time filters</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>

                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 bg-slate-850 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {selectedReport !== 'monthly' && (
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Filter Vendor</label>
                  <select
                    value={filters.vendor}
                    onChange={(e) => setFilters({ ...filters, vendor: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">All Vendors</option>
                    {(vendors || []).map((v: any) => (
                      <option key={v._id} value={v._id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Modal Body / Report Data */}
            <div className="flex-1 overflow-auto p-5 scrollbar-thin">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <LoadingSpinner size="lg" />
                  <p className="text-sm mt-3 font-medium">Generating report data...</p>
                </div>
              ) : selectedReport === 'monthly' && reportData?.data ? (
                /* MONTHLY REPORT SPECIAL DASHBOARD VIEW */
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                      <span className="text-xs uppercase font-bold text-slate-400">Purchases Total</span>
                      <p className="text-2xl font-black text-white mt-1">
                        ₹{(reportData.data.purchases?.total || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-rose-400 font-semibold mt-1">
                        Pending: ₹{(reportData.data.purchases?.pending || 0).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                      <span className="text-xs uppercase font-bold text-slate-400">Payments Disbursed</span>
                      <p className="text-2xl font-black text-emerald-400 mt-1">
                        ₹{(reportData.data.payments?.total || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Cash: ₹{(reportData.data.payments?.byMode?.cash || 0).toLocaleString('en-IN')} | UPI: ₹{(reportData.data.payments?.byMode?.upi || 0).toLocaleString('en-IN')}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700">
                      <span className="text-xs uppercase font-bold text-slate-400">Total Supplier Dues</span>
                      <p className="text-2xl font-black text-rose-400 mt-1">
                        ₹{(reportData.data.vendors?.totalOutstanding || 0).toLocaleString('en-IN')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Across {reportData.data.vendors?.total || 0} Vendors
                      </p>
                    </div>
                  </div>

                  {reportData.data.vendors?.topVendors?.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                        Top 5 Outstanding Balances
                      </h4>
                      <div className="divide-y divide-slate-800 text-xs">
                        {reportData.data.vendors.topVendors.map((tv: any) => (
                          <div key={tv.vendorId} className="py-2.5 flex justify-between items-center">
                            <span className="font-semibold text-white">{tv.name}</span>
                            <span className="font-bold text-rose-400">₹{(tv.balance || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : Array.isArray(reportData?.data) && reportData.data.length > 0 ? (
                /* TABULAR REPORT VIEW */
                <div className="rounded-xl border border-slate-800 overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold border-b border-slate-700">
                      <tr>
                        {Object.keys(reportData.data[0])
                          .filter(k => !['_id', '__v', 'createdBy', 'deletedBy', 'isDeleted', 'items'].includes(k))
                          .slice(0, 8)
                          .map((key) => (
                            <th key={key} className="px-4 py-3 capitalize whitespace-nowrap">{key}</th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {reportData.data.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          {Object.keys(reportData.data[0])
                            .filter(k => !['_id', '__v', 'createdBy', 'deletedBy', 'isDeleted', 'items'].includes(k))
                            .slice(0, 8)
                            .map((key) => {
                              let val = row[key];
                              if (typeof val === 'object' && val !== null) {
                                val = val.name || val.invoiceNumber || JSON.stringify(val);
                              }
                              if (key.toLowerCase().includes('date') && val) {
                                try { val = format(new Date(val), 'dd MMM yyyy'); } catch {}
                              }
                              if (typeof val === 'number') {
                                val = val.toLocaleString('en-IN');
                              }
                              return (
                                <td key={key} className="px-4 py-3 whitespace-nowrap font-medium">
                                  {val !== undefined && val !== null ? String(val) : '-'}
                                </td>
                              );
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-400" />
                  <p className="text-sm font-semibold text-slate-400">No records found for the selected period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
