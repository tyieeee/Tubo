'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { sileo } from 'sileo';

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

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceModal({ isOpen, onClose, onSuccess }: InvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { register, control, watch, handleSubmit, formState: { errors }, setValue, reset } = useForm<InvoiceForm>({
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

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && isOpen) {
      reset({
        invoice_number: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        invoice_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        customer_tax_id: '',
        customer_email: '',
        currency: 'USD',
        items: [
          { line_no: 1, description: '', quantity: 1, unit_price: 0, tax: 0 },
        ],
      });
    }
  }, [isOpen, isMounted, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const formData = watch();

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
    setLoading(true);

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

      console.log('Submitting invoice:', payload);

      const response = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', result);
        sileo.error({
          title: 'Error',
          description: result.error || `Failed to create invoice (Status: ${response.status})`,
          icon: (
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        });
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log('Success response:', result);

      setLoading(false);

      onClose();
      onSuccess();

      // Show toast after modal closes to ensure it's visible
      setTimeout(() => {
        sileo.success({
          title: 'Invoice Created',
          description: `Invoice #${payload.invoice_number} created with status: ${result.status || 'Processing'}`,
          duration: 5000,
        });
      }, 100);
    } catch (err: any) {
      console.error('Invoice creation error:', err);
      sileo.error({
        title: 'Error',
        description: err.message || 'Network error - please try again',
      });
      setLoading(false);
    }
  };

  const addItem = () => {
    const nextLineNo = formData.items.length + 1;
    append({ line_no: nextLineNo, description: '', quantity: 1, unit_price: 0, tax: 0 });
  };

  const autofillTestData = () => {
    const companies = [
      'Acme Corporation',
      'TechStart Inc',
      'Global Solutions Ltd',
      'Innovate Ventures',
      'Summit Holdings',
      'Nexus Technologies',
      'Prime Digital Co',
      'BlueWave Systems',
    ];

    const currencies = ['USD', 'EUR', 'GBP', 'PHP', 'IDR'];

    const serviceDescriptions = [
      'Web Development Services',
      'UI/UX Design',
      'Database Setup',
      'Cloud Infrastructure',
      'Mobile App Development',
      'API Integration',
      'Security Audit',
      'Performance Optimization',
      'Content Management System',
      'E-commerce Platform',
      'Data Analytics Dashboard',
      'Machine Learning Model',
    ];

    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomCurrency = currencies[Math.floor(Math.random() * currencies.length)];
    const randomTaxId = `TAX-${Math.floor(Math.random() * 900000000) + 100000000}`;
    const randomEmail = `billing@${randomCompany.toLowerCase().replace(/\s+/g, '')}.com`;

    setValue('customer_name', randomCompany);
    setValue('customer_tax_id', randomTaxId);
    setValue('customer_email', randomEmail);
    setValue('invoice_number', `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`);
    setValue('currency', randomCurrency);

    // Clear existing items and add random test items
    remove();

    const numItems = Math.floor(Math.random() * 3) + 2; // 2-4 items
    const selectedServices = [];

    for (let i = 0; i < numItems; i++) {
      let description;
      do {
        description = serviceDescriptions[Math.floor(Math.random() * serviceDescriptions.length)];
      } while (selectedServices.includes(description));
      selectedServices.push(description);

      const quantity = Math.floor(Math.random() * 50) + 10;
      const unitPrice = Math.floor(Math.random() * 150) + 25;
      const tax = Math.floor(Math.random() * 20) + 5;

      append({
        line_no: i + 1,
        description,
        quantity,
        unit_price: unitPrice,
        tax,
      });
    }

    sileo.info({
      title: 'Test Data',
      description: 'Form filled with random sample data',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-hidden">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Only visible on form side */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Create Invoice</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autofillTestData}
              className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Autofill
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Close button for desktop */}
        <div className="hidden lg:flex justify-end p-4">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
            {/* Left Column - Form */}
            <div className="overflow-y-auto lg:border-r border-gray-200 pr-0 lg:pr-6 pl-6 pb-6 min-h-0">
              {/* Desktop Header */}
              <div className="hidden lg:block mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Create Invoice</h2>
                  <button
                    type="button"
                    onClick={autofillTestData}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Autofill Test Data
                  </button>
                </div>
              </div>

              <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-xl p-6 border border-gray-400 shadow-sm">
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

              {/* Invoice Details */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-400">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date *</label>
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

              {/* Line Items */}
              <div className="bg-white rounded-xl p-4 border border-gray-400 shadow-sm">
                <div className="flex items-center justify-between mb-3">
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

                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-gray-50 rounded-lg p-3 border border-gray-400">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-700">Line {index + 1}</span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              remove(index);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m0-6l1 7m-1-7v6m0 0h9" />
                            </svg>
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
                          <input
                            {...register(`items.${index}.description`)}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                            placeholder="Enter item description"
                          />
                          {errors.items?.[index]?.description && (
                            <p className="text-red-600 text-xs mt-1">{errors.items[index]?.description?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Quantity *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          {errors.items?.[index]?.quantity && (
                            <p className="text-red-600 text-xs mt-1">{errors.items[index]?.quantity?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          {errors.items?.[index]?.unit_price && (
                            <p className="text-red-600 text-xs mt-1">{errors.items[index]?.unit_price?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%) *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`items.${index}.tax`, { valueAsNumber: true })}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                          />
                          {errors.items?.[index]?.tax && (
                            <p className="text-red-600 text-xs mt-1">{errors.items[index]?.tax?.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Line Total</label>
                          <input
                            type="text"
                            value={formData.currency + ' ' + ((formData.items[index]?.quantity || 0) * (formData.items[index]?.unit_price || 0)).toFixed(2)}
                            disabled
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-900 font-medium"
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
              </div>
            </div>

            {/* Right Column - Preview */}
            <div className="overflow-y-auto pr-6 pl-0 lg:pl-6 pb-6 min-h-0">
              <div className="rounded-xl shadow-2xl p-8 border border-gray-200">
                <div className="rounded-lg p-6 border border-gray-200">
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

                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Project</div>
                    <div className="font-medium text-gray-900">Invoice Processing</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Issued Date</div>
                    <div className="font-medium text-gray-900">{formData.invoice_date || 'YYYY-MM-DD'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase">Currency</div>
                    <div className="font-medium text-gray-900">{formData.currency || 'USD'}</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="text-xs text-gray-500 uppercase mb-2">Bill To</div>
                  <div className="font-medium text-gray-900">{formData.customer_name || 'Customer Name'}</div>
                  <div className="text-sm text-gray-600">{formData.customer_email || 'customer@example.com'}</div>
                  <div className="text-sm text-gray-600">Tax ID: {formData.customer_tax_id || 'TAX-XXX'}</div>
                </div>

                <table className="w-full mb-6">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-600 uppercase">Qty</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-600 uppercase">Price</th>
                      <th className="text-right py-2 text-xs font-semibold text-gray-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 text-sm text-gray-900">{item.description || 'Item description'}</td>
                        <td className="py-2 text-sm text-gray-900 text-right">{item.quantity || 0}</td>
                        <td className="py-2 text-sm text-gray-900 text-right">{formData.currency} {(item.unit_price || 0).toFixed(2)}</td>
                        <td className="py-2 text-sm text-gray-900 text-right">{formData.currency} {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">{formData.currency} {totals.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">{formData.currency} {totals.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{formData.currency} {totals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
