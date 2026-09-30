'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  total_amount: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    invoice_number: '',
    invoice_date_from: '',
    invoice_date_to: '',
  });
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [total, setTotal] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.invoice_number && { invoice_number: filters.invoice_number }),
        ...(filters.invoice_date_from && { invoice_date_from: filters.invoice_date_from }),
        ...(filters.invoice_date_to && { invoice_date_to: filters.invoice_date_to }),
      });

      const response = await fetch(`/api/v1/invoices?${params}`);
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      setInvoices([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPage(1);
    
    // Debounce search to avoid too many API calls
    if (key === 'invoice_number') {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      searchTimeoutRef.current = setTimeout(() => {
        fetchInvoices();
      }, 300);
    } else {
      // For status changes, fetch immediately
      fetchInvoices();
    }
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PROCESSING': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'RETRYING': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'SUBMITTED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FAILED': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-500';
      case 'PROCESSING': return 'bg-blue-500';
      case 'RETRYING': return 'bg-orange-500';
      case 'SUBMITTED': return 'bg-emerald-500';
      case 'FAILED': return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`w-64 bg-white border-r border-gray-200 flex-shrink-0 h-screen sticky top-0 overflow-y-auto flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 fixed lg:sticky z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Image 
              src="/img/logo.png" 
              alt="Tubo Logo" 
              width={150} 
              height={45}
              className="h-8 w-auto"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 flex-1 space-y-2">
          <ul className="space-y-1">
            <li>
              <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 text-slate-900 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7V6a3 3 0 00-3-3H7a3 3 0 00-3 3v7a3 3 0 003 3m0 0l2-2m-7 7l7-7" />
                </svg>
                Dashboard
              </a>
            </li>
            <li>
              <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.707.293H19a2 2 0 012-2V11a2 2 0 012-2h5.586a1 1 0 01.707-.293l-5.414-5.414A1 1 0 01.8.586 6H3" />
                </svg>
                Invoices
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
                <span className="ml-auto bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full">20</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0" />
                </svg>
                Insights
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.588 6 10v4.159c0 .538.214 1.059.595 1.463 1.066L4 17h5m6 0v1a1 1 0 001 1h3a1 1 0 001-1v-1m-6 0h6" />
                </svg>
                Updates
              </a>
            </li>
          </ul>
        </nav>

        {/* User Avatar at Bottom */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-semibold">
                A
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Admin</div>
                <div className="text-xs text-gray-500">admin@tubo.ph</div>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                router.push('/login');
              }}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="text-sm text-gray-500 hidden sm:block">
                <span className="hover:text-gray-700 cursor-pointer">Home</span>
                <span className="mx-2">/</span>
                <span className="text-gray-900 font-medium">Invoices</span>
              </div>
            </div>
            {/* Notifications & User Profile */}
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex-shrink-0 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.588 6 10v4.159c0 .538.214 1.059.595 1.463 1.066L4 17h5m6 0v1a1 1 0 001 1h3a1 1 0 001-1v-1m-6 0h6" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  6
                </span>
              </button>
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white font-semibold flex-shrink-0">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Sales Overview</h1>
              <p className="text-gray-500">Track your invoice performance</p>
            </div>
            {/* Date Range */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4l4 4m0 0l4-4M4 4v4m0 0h4M4 4H4" />
              </svg>
              <span className="text-sm text-gray-600">April 10, 2026 - May 11, 2026</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">Total Invoices</div>
                <div className="text-emerald-600 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  4.9%
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">{total}</div>
              <div className="text-xs text-slate-400 mt-1">Last month</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">Pending</div>
                <div className="text-emerald-600 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  7.5%
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {invoices.filter(i => i.status === 'PENDING').length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Last month</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">Submitted</div>
                <div className="text-rose-600 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  6.0%
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {invoices.filter(i => i.status === 'FAILED').length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Last month</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-slate-500">Total Amount</div>
                <div className="text-emerald-600 text-sm font-medium flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {invoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0).toFixed(2)}
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                ${invoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Last month</div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-white rounded-xl shadow-md border border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
              <h2 className="text-lg font-semibold text-slate-900">Invoices</h2>
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search by invoice # or customer name..."
                  className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-full"
                  value={filters.invoice_number}
                  onChange={(e) => handleFilterChange('invoice_number', e.target.value)}
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 w-full sm:w-auto"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="RETRYING">Retrying</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <button
              onClick={() => router.push('/invoices/create')}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 font-medium flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Invoice
            </button>
          </div>

          {/* Invoice Table */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No invoices found</td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {invoice.customer_name}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        ${parseFloat(invoice.total_amount).toFixed(2)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(invoice.status)}`}></span>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-4 lg:px-8 py-4 whitespace-nowrap text-sm font-medium w-40">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-emerald-600 transition-colors"
                            title="View"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this invoice?')) {
                                fetch(`/api/v1/invoices/${invoice.id}`, {
                                  method: 'DELETE',
                                }).then(() => {
                                  fetchInvoices();
                                });
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m0-6l1 7m-1-7v6m0 0h9" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl shadow-md border border-slate-200">
            <div className="text-sm text-slate-500">
              Showing {Math.min(invoices.length, itemsPerPage)} of {total} invoices
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 text-sm font-medium disabled:hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-slate-700 text-sm font-medium">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={invoices.length < itemsPerPage}
                className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 text-sm font-medium disabled:hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
