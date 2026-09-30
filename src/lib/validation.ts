import { z } from 'zod';

// Invoice item schema
export const invoiceItemSchema = z.object({
  line_no: z.number().int().positive(),
  description: z.string().min(1).max(500),
  quantity: z.number().nonnegative(),
  unit_price: z.number().nonnegative(),
  tax: z.number().nonnegative(), // Tax rate as percentage
  line_total: z.number().nonnegative(),
});

// Create invoice schema
export const createInvoiceSchema = z.object({
  invoice_number: z.string().min(1).max(50),
  invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer_name: z.string().min(1).max(255),
  customer_tax_id: z.string().min(1).max(50),
  customer_email: z.string().email().max(255),
  currency: z.string().length(3).default('USD'),
  subtotal: z.number().nonnegative(),
  tax_amount: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
  items: z.array(invoiceItemSchema).min(1),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Invoice list filters schema
export const invoiceListFiltersSchema = z.object({
  status: z.string().optional(),
  invoice_date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  invoice_date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  invoice_number: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
}).transform((data) => ({
  ...data,
  invoice_number: data.invoice_number || '',
}));

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InvoiceListFilters = z.infer<typeof invoiceListFiltersSchema>;
