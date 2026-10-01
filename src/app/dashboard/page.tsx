'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import InvoiceModal from '@/components/InvoiceModal';
import { sileo } from 'sileo';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  total_amount: string;
  status: string;
  created_at: string;
  external_reference?: string;
  last_error?: string;
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

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
    fetchUserEmail();
  }, [page]);

  const fetchUserEmail = async () => {
    try {
      const response = await fetch('/api/v1/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email || '');
        setCompanyName(data.companyName || '');
      }
    } catch (error) {
      console.error('Failed to fetch user email:', error);
    }
  };

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

  // Dark mode effect
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownOpen && !event.target.closest('.avatar-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

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
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 mt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <Image 
                  src="/img/logo.png" 
                  alt="Tubo" 
                  width={120} 
                  height={50}
                  className="h-8 w-auto"
                />
              </div>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-6">
              <a href="/dashboard" className="text-gray-900 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Dashboard
              </a>
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.707.293l5.414 5.414a1 1 0 011.707.293H19a2 2 0 012-2V11a2 2 0 012-2h5.586a1 1 0 011.707-.293l-5.414-5.414A1 1 0 011.586 6H3" />
                </svg>
                Invoices
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </a>
            </div>
            {/* Right side */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Toggle dark mode"
              >
                {darkMode ? (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <div className="relative avatar-dropdown">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500 font-medium">Company</p>
                      <p className="text-sm text-gray-900 font-semibold">{companyName}</p>
                    </div>
                    <button
                      onClick={async () => {
                        await fetch('/api/v1/auth/logout', { method: 'POST' });
                        router.push('/login');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="mt-2 text-gray-600 tracking-wide">Track your invoice performance and statistics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 tracking-wide">Total Invoices</h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center tracking-wide">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                +10%
              </span>
            </div>
            <p className="text-4xl font-bold text-gray-900 tracking-tight mb-3">{total}</p>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline transition-colors tracking-wide flex items-center gap-1">
              View Details
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 tracking-wide">Pending</h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center tracking-wide">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                +7.5%
              </span>
            </div>
            <p className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
              {invoices.filter(i => i.status === 'PENDING').length}
            </p>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline transition-colors tracking-wide flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 tracking-wide">Submitted</h3>
              <span className="bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center tracking-wide">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                -6.0%
              </span>
            </div>
            <p className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
              {invoices.filter(i => i.status === 'SUBMITTED').length}
            </p>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline transition-colors tracking-wide flex items-center gap-1">
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 tracking-wide">Total Amount</h3>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center tracking-wide">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l4 4m2-2m-2 2l-4-4m4 4V7a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                +12%
              </span>
            </div>
            <p className="text-4xl font-bold text-gray-900 tracking-tight mb-3">
              ${invoices.reduce((sum, i) => sum + parseFloat(i.total_amount), 0).toFixed(2)}
            </p>
            <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline transition-colors tracking-wide flex items-center gap-1">
              View Report
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>

        {/* Invoices Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Recent Invoices</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm w-full sm:w-64 tracking-wide"
                    value={filters.invoice_number}
                    onChange={(e) => handleFilterChange('invoice_number', e.target.value)}
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="relative">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm tracking-wide appearance-none bg-white w-full"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="RETRYING">Retrying</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <svg className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium flex items-center gap-2 transition-colors tracking-wide"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Invoice
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider tracking-wide">Invoice #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider tracking-wide">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider tracking-wide">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider tracking-wide">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 tracking-wide">Loading...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 tracking-wide">No invoices found</td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 tracking-wide">
                        {invoice.invoice_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tracking-wide">
                        {invoice.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tracking-wide">
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tracking-wide">
                        ${parseFloat(invoice.total_amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)} tracking-wide`}>
                          <span className={`w-2 h-2 rounded-full ${getStatusDot(invoice.status)}`}></span>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}`)}
                            className="text-gray-600 hover:text-gray-900 transition-colors"
                            title="View"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setIsProgressModalOpen(true);
                            }}
                            className="text-gray-600 hover:text-blue-600 transition-colors"
                            title="View Progress"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                            className="text-gray-600 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600 tracking-wide">
              Showing {Math.min(invoices.length, itemsPerPage)} of {total} invoices
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium tracking-wide"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700 text-sm font-medium tracking-wide">Page {page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={invoices.length < itemsPerPage}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm font-medium tracking-wide"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Invoice Modal */}
      <InvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchInvoices();
        }}
      />

      {/* Progress Modal */}
      {isProgressModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Invoice Progress</h3>
              <button
                onClick={() => setIsProgressModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {[
                  { label: 'Validation', status: 'completed' },
                  { label: 'Government API', status: ['PROCESSING', 'RETRYING'].includes(selectedInvoice.status) ? 'active' : selectedInvoice.status === 'SUBMITTED' ? 'completed' : 'pending' },
                  { label: 'Confirmation', status: selectedInvoice.status === 'SUBMITTED' ? 'completed' : 'pending' },
                  { label: 'Final', status: 'pending' },
                ].map((step, index) => (
                  <div key={step.label} className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                      step.status === 'completed' ? 'bg-green-500 text-white' :
                      step.status === 'active' ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {step.status === 'completed' ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step.status === 'active' ? (
                        <span className="text-sm font-bold">{index + 1}</span>
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs mt-2 font-medium transition-all duration-500 ${
                      step.status === 'completed' || step.status === 'active' ? 'text-green-500' :
                      'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Progress Line */}
              <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full bg-green-500 rounded-full ${
                    ['PROCESSING', 'RETRYING'].includes(selectedInvoice.status) ? 'animate-move-back-forth' : ''
                  } transition-all duration-700 ease-in-out`}
                  style={{
                    width: selectedInvoice.status === 'PENDING' ? '0%' :
                           selectedInvoice.status === 'PROCESSING' || selectedInvoice.status === 'RETRYING' ? '50%' :
                           selectedInvoice.status === 'SUBMITTED' ? '75%' :
                           '0%'
                  }}
                />
              </div>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Current Status Card */}
              <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                ['PROCESSING', 'RETRYING'].includes(selectedInvoice.status) ? 'border-green-500 bg-green-50' :
                selectedInvoice.status === 'SUBMITTED' ? 'border-green-500 bg-green-50' :
                selectedInvoice.status === 'FAILED' ? 'border-red-500 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      ['PROCESSING', 'RETRYING'].includes(selectedInvoice.status) ? 'bg-green-500' :
                      selectedInvoice.status === 'SUBMITTED' ? 'bg-green-500' :
                      selectedInvoice.status === 'FAILED' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`} />
                    <span className="font-semibold text-gray-900">Current Status</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    ['PROCESSING', 'RETRYING'].includes(selectedInvoice.status) ? 'bg-green-500 text-white' :
                    selectedInvoice.status === 'SUBMITTED' ? 'bg-green-500 text-white' :
                    selectedInvoice.status === 'FAILED' ? 'bg-red-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedInvoice.status === 'PENDING' && 'Your invoice is queued and will be submitted to the government API shortly.'}
                  {selectedInvoice.status === 'PROCESSING' && 'Your invoice is currently being processed by the government API. This may take a few moments.'}
                  {selectedInvoice.status === 'RETRYING' && 'The previous submission attempt failed. The system will automatically retry.'}
                  {selectedInvoice.status === 'SUBMITTED' && 'Your invoice has been successfully submitted to the government and confirmed.'}
                  {selectedInvoice.status === 'FAILED' && 'The invoice submission failed. Please check the error details and try again.'}
                </p>
              </div>

              {/* Next Steps Card */}
              <div className={`p-5 rounded-2xl border-2 transition-all duration-300 ${
                selectedInvoice.status === 'PENDING' ? 'border-green-500 bg-green-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedInvoice.status === 'PENDING' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="font-semibold text-gray-900">What's Next</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedInvoice.status === 'PENDING' && 'System will validate invoice data and submit to government API within 30 seconds.'}
                  {selectedInvoice.status === 'PROCESSING' && 'Government API is processing your invoice. Awaiting response...'}
                  {selectedInvoice.status === 'RETRYING' && 'System will retry submission automatically in 30 seconds.'}
                  {selectedInvoice.status === 'SUBMITTED' && 'Invoice is complete. You can download the receipt or view details.'}
                  {selectedInvoice.status === 'FAILED' && 'Review the error details below and retry submission manually.'}
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="space-y-3">
              {selectedInvoice.external_reference && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm font-semibold text-green-800 mb-1">Government Reference</p>
                  <p className="text-sm text-green-700 font-mono">{selectedInvoice.external_reference}</p>
                </div>
              )}

              {selectedInvoice.last_error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-sm font-semibold text-red-800 mb-1">Error Details</p>
                  <p className="text-sm text-red-700">{selectedInvoice.last_error}</p>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-sm font-semibold text-gray-900 mb-1">Invoice Details</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-600">Invoice #:</span>
                  <span className="text-gray-900 font-medium">{selectedInvoice.invoice_number}</span>
                  <span className="text-gray-600">Amount:</span>
                  <span className="text-gray-900 font-medium">${parseFloat(selectedInvoice.total_amount).toFixed(2)}</span>
                  <span className="text-gray-600">Customer:</span>
                  <span className="text-gray-900 font-medium">{selectedInvoice.customer_name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
