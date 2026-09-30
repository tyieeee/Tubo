'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface InvoiceItem {
  line_no: number;
  description: string;
  quantity: string;
  unit_price: string;
  tax: string;
  line_total: string;
}

interface ProcessingAttempt {
  attempt_no: number;
  started_at: string;
  ended_at: string | null;
  http_status: number | null;
  error_message: string | null;
  outcome: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_tax_id: string;
  customer_email: string;
  currency: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  status: string;
  external_reference: string | null;
  last_error: string | null;
  created_at: string;
  items: InvoiceItem[];
  attempts: ProcessingAttempt[];
}

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState('');

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/invoices/${params.id}`);
      if (response.status === 401) {
        router.push('/login');
        return;
      }
      if (response.status === 404) {
        setError('Invoice not found');
        return;
      }

      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
    
    // Poll for status changes if not in final state
    const interval = setInterval(() => {
      if (invoice && ['PENDING', 'PROCESSING', 'RETRYING'].includes(invoice.status)) {
        fetchInvoice();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [params.id, invoice?.status]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const response = await fetch(`/api/v1/invoices/${params.id}/retry`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to retry invoice');
        return;
      }

      setError('');
      fetchInvoice();
    } catch (err) {
      setError('Network error');
    } finally {
      setRetrying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'RETRYING': return 'bg-orange-100 text-orange-800';
      case 'SUBMITTED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (outcome: string | null) => {
    switch (outcome) {
      case 'SUCCESS': return 'text-green-600';
      case 'PERMANENT_ERROR': return 'text-red-600';
      case 'TRANSIENT_ERROR': return 'text-orange-600';
      case 'TIMEOUT': return 'text-yellow-600';
      case 'INTERRUPTED': return 'text-gray-600';
      default: return 'text-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'Invoice not found'}</div>
      </div>
    );
  }

  // Mock items if not available
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    { line_no: 1, description: 'Web & App Design', quantity: '1', unit_price: '2500', tax: '0', line_total: '2500' },
    { line_no: 2, description: 'Logo Design', quantity: '1', unit_price: '500', tax: '0', line_total: '500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 text-green-600 hover:text-green-700 font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        {/* Invoice Document */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          {/* Error Alert for Failed Status */}
          {invoice.status === 'FAILED' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">Invoice Processing Failed</h4>
                  <p className="text-sm text-red-700">
                    {invoice.last_error || 'No error message available. Check processing attempts below for details.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Image 
                  src="/img/logo.png" 
                  alt="Tubo Logo" 
                  width={150} 
                  height={45}
                  className="h-12 w-auto"
                />
              </div>
              <p className="text-gray-500 text-sm">Invoice #{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-gray-500 text-sm">Status: <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(invoice.status)}`}>{invoice.status}</span></p>
            </div>
          </div>

          {/* Project Details */}
          <div className="grid grid-cols-3 gap-4 mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-xs text-gray-500 uppercase">Project</div>
              <div className="font-medium text-gray-900">Invoice Processing</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Issued Date</div>
              <div className="font-medium text-gray-900">{new Date(invoice.invoice_date).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Due Date</div>
              <div className="font-medium text-gray-900">{new Date(new Date(invoice.invoice_date).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">From</div>
              <div className="text-sm">
                <div className="font-semibold text-gray-900">Tubo Admin</div>
                <div className="text-gray-600">Admin Panel</div>
                <div className="text-gray-600">Email: admin@tubo.ph</div>
                <div className="text-gray-600">Tax ID: {invoice.customer_tax_id}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase mb-2">To</div>
              <div className="text-sm">
                <div className="font-semibold text-gray-900">{invoice.customer_name}</div>
                <div className="text-gray-600">Email: {invoice.customer_email}</div>
                <div className="text-gray-600">Tax ID: {invoice.customer_tax_id}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">Units</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">GST</th>
                  <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.line_no} className="border-b border-gray-100">
                    <td className="py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">${parseFloat(item.tax).toFixed(2)}</td>
                    <td className="py-3 text-sm text-gray-900 text-right">${parseFloat(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={4} className="py-3 text-right text-sm font-semibold text-gray-900">Total Amount</td>
                  <td className="py-3 text-right text-sm font-bold text-green-600">${parseFloat(invoice.total_amount).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Method */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 uppercase mb-2">Payment Method</div>
            <div className="text-sm text-gray-700">
              <div><span className="font-medium">EFT Bank Transfer</span></div>
              <div>Account Name: Tubo Admin</div>
              <div>Code: 123456</div>
              <div>Account Number: 991188343445123</div>
            </div>
          </div>

          {/* Signature */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="text-xs text-gray-500 uppercase mb-2">Additional Note</div>
              <p className="text-sm text-gray-700">Note: GST will be paid by me, {invoice.customer_name}.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-700 mb-2">Tubo Admin</div>
              <div className="w-32 h-12 border-b-2 border-gray-300 mb-2"></div>
              <div className="text-xs text-gray-500">Authorized Signature</div>
            </div>
          </div>

          {/* Retry Button */}
          {invoice.status === 'FAILED' && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
              >
                {retrying ? 'Retrying...' : 'Retry Invoice'}
              </button>
            </div>
          )}

          {/* Processing Attempts */}
          {invoice.attempts && invoice.attempts.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Attempts</h3>
              <div className="space-y-3">
                {invoice.attempts.map((attempt) => (
                  <div key={attempt.attempt_no} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Attempt #{attempt.attempt_no}</span>
                      {attempt.outcome && (
                        <span className={`text-sm ${getOutcomeColor(attempt.outcome)}`}>
                          {attempt.outcome.replace('_', ' ').toLowerCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Started: {new Date(attempt.started_at).toLocaleString()}
                    </div>
                    {attempt.ended_at && (
                      <div className="text-sm text-gray-600">
                        Ended: {new Date(attempt.ended_at).toLocaleString()}
                      </div>
                    )}
                    {attempt.http_status && (
                      <div className="text-sm text-gray-600">
                        HTTP Status: {attempt.http_status}
                      </div>
                    )}
                    {attempt.error_message && (
                      <div className="text-sm text-red-600 mt-1">
                        Error: {attempt.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
