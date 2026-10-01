'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';

const itemSchema = z.object({
  line_no: z.number().int().positive(),
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
  tax: z.number().nonnegative(),
});

const invoiceSchema = z.object({
  invoice_number: z.string().min(1).max(50),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer_name: z.string().min(1).max(255),
  customer_tax_id: z.string().min(1).max(50),
  customer_email: z.string().email().max(255),
  currency: z.string().length(3).default('USD'),
  items: z.array(itemSchema).min(1),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export default function CreateInvoicePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Generate invoice number only on client to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const generateInvoiceNumber = () => {
    return `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
  };

  const { register, control, watch, handleSubmit, formState: { errors }, setValue } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      customer_name: '',
      customer_tax_id: '',
      customer_email: '',
      currency: 'USD',
      items: [
        { line_no: 1, description: '', quantity: 1, unit_price: 0, tax: 0 },
      ],
    },
  });

  // Set invoice number after mount
  useEffect(() => {
    if (isMounted) {
      const currentValue = watch('invoice_number');
      if (!currentValue) {
        setValue('invoice_number', generateInvoiceNumber());
      }
    }
  }, [isMounted, setValue, watch]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const formData = watch();

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    formData.items.forEach((item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineTax = lineSubtotal * (item.tax / 100);
      subtotal += lineSubtotal;
      taxAmount += lineTax;
    });

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
      subtotal: round2(subtotal),
      taxAmount: round2(taxAmount),
      total: round2(subtotal + taxAmount),
    };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: InvoiceForm) => {
    setError('');
    setLoading(true);
    setSuccess(false);

    try {
      const payload = {
        ...data,
        subtotal: totals.subtotal,
        tax_amount: totals.taxAmount,
        total_amount: totals.total,
        items: data.items.map((item) => ({
          ...item,
          line_total: item.quantity * item.unit_price,
        })),
      };

      const response = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to create invoice');
        setLoading(false);
        return;
      }

      // Show success notification
      setSuccess(true);
      setLoading(false);

      // Delay navigation to show the notification
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      setError('Network error');
      setLoading(false);
    }
  };

  const addItem = () => {
    const nextLineNo = formData.items.length + 1;
    append({ line_no: nextLineNo, description: '', quantity: 1, unit_price: 0, tax: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mb-6 text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Create Invoice</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Invoice created successfully! Redirecting to dashboard...</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Invoice Details</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* People Section - White Box */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase">Customer Information</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                      <input
                        {...register('customer_name')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                        placeholder="Enter customer name"
                      />
                      {errors.customer_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.customer_name.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID *</label>
                      <input
                        {...register('customer_tax_id')}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                        placeholder="TAX-12345"
                      />
                      {errors.customer_tax_id && (
                        <p className="text-red-600 text-sm mt-1">{errors.customer_tax_id.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email *</label>
                    <input
                      type="email"
                      {...register('customer_email')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
                      placeholder="customer@example.com"
                    />
                    {errors.customer_email && (
                      <p className="text-red-600 text-sm mt-1">{errors.customer_email.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Details - Slate Box */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 012-2V5a2 2 0 012-2h5.586a1 1 0 011.707.293l5.414 5.414a1 1 0 011.707.293H19a2 2 0 012-2V11a2 2 0 012-2h5.586a1 1 0 011.707-.293l-5.414-5.414A1 1 0 011.586 6H3" />
                  </svg>
                  <h3 className="text-sm font-semibold text-slate-900 uppercase">Invoice Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number *</label>
                    <input
                      {...register('invoice_number')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                      placeholder="INV-2024-001"
                    />
                    {errors.invoice_number && (
                      <p className="text-red-600 text-sm mt-1">{errors.invoice_number.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
                    <input
                      type="date"
                      {...register('invoice_date')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    />
                    {errors.invoice_date && (
                      <p className="text-red-600 text-sm mt-1">{errors.invoice_date.message}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <select
                      {...register('currency')}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="IDR">IDR - Indonesian Rupiah</option>
                    </select>
                    {errors.currency && (
                      <p className="text-red-600 text-sm mt-1">{errors.currency.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Products - White Box */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="text-sm font-semibold text-gray-900 uppercase">Line Items</h3>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-slate-600 hover:text-slate-900 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-medium text-gray-700">Line {index + 1}</span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m0-6l1 7m-1-7v6m0 0h9" />
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                          <input
                            {...register(`items.${index}.description`)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                            placeholder="Enter item description"
                          />
                          {errors.items?.[index]?.description && (
                            <p className="text-red-600 text-sm mt-1">{errors.items[index]?.description?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          {errors.items?.[index]?.quantity && (
                            <p className="text-red-600 text-sm mt-1">{errors.items[index]?.quantity?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          {errors.items?.[index]?.unit_price && (
                            <p className="text-red-600 text-sm mt-1">{errors.items[index]?.unit_price?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%) *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.tax`, { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          {errors.items?.[index]?.tax && (
                            <p className="text-red-600 text-sm mt-1">{errors.items[index]?.tax?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Line Total</label>
                          <input
                            type="text"
                            value={formData.currency + ' ' + ((formData.items[index]?.quantity || 0) * (formData.items[index]?.unit_price || 0)).toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-800 text-white py-3 px-4 rounded-lg hover:bg-slate-900 disabled:opacity-50 font-medium shadow-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Invoice'}
              </button>
            </form>
          </div>

          {/* Right Column - Live Preview */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200 sticky top-8 h-fit">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Preview</h2>
            
            {/* Invoice Document - Top Section Only */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Image 
                      src="/img/logo.png" 
                      alt="Tubo Logo" 
                      width={150} 
                      height={45}
                      className="h-10 w-auto"
                    />
                  </div>
                  <p className="text-gray-500 text-sm">Invoice #{formData.invoice_number || 'INV-XXXX-XXX'}</p>
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h1>
                  <p className="text-gray-500 text-sm">Status: <span className="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">DRAFT</span></p>
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Project</div>
                  <div className="font-medium text-gray-900">Invoice Processing</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Issued Date</div>
                  <div className="font-medium text-gray-900">{isMounted && formData.invoice_date ? new Date(formData.invoice_date).toLocaleDateString() : '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Due Date</div>
                  <div className="font-medium text-gray-900">{isMounted && formData.invoice_date ? new Date(new Date(formData.invoice_date).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString() : '-'}</div>
                </div>
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">From</div>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">Tubo Admin</div>
                    <div className="text-gray-600">Admin Panel</div>
                    <div className="text-gray-600">Email: admin@tubo.ph</div>
                    <div className="text-gray-600">Tax ID: {formData.customer_tax_id || 'N/A'}</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-2">To</div>
                  <div className="text-sm">
                    <div className="font-semibold text-gray-900">{formData.customer_name || 'Not specified'}</div>
                    <div className="text-gray-600">Email: {formData.customer_email || 'Not specified'}</div>
                    <div className="text-gray-600">Tax ID: {formData.customer_tax_id || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Items Table - First 2 items only */}
              <div className="mb-6">
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
                    {formData.items.slice(0, 2).map((item) => (
                      <tr key={item.line_no} className="border-b border-gray-100">
                        <td className="py-3 text-sm text-gray-900">{item.description || '-'}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{formData.currency} {item.unit_price.toFixed(2)}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{formData.currency} {(item.quantity * item.unit_price * (item.tax / 100)).toFixed(2)}</td>
                        <td className="py-3 text-sm text-gray-900 text-right">{formData.currency} {(item.quantity * item.unit_price * (1 + item.tax / 100)).toFixed(2)}</td>
                      </tr>
                    ))}
                    {formData.items.length > 2 && (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-sm text-gray-500 italic">
                          +{formData.items.length - 2} more items...
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={4} className="py-3 text-right text-sm font-semibold text-gray-900">Total Amount</td>
                      <td className="py-3 text-right text-sm font-bold text-green-600">{formData.currency} {totals.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
