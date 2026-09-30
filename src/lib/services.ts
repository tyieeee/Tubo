import { Pool } from 'pg';
import { invoiceRepository } from './repositories';
import { createInvoiceSchema } from './validation';

// Service for invoice business logic
export class InvoiceService {
  // Create invoice with server-side validation and totals recalculation
  async createInvoice(companyId: string, data: any): Promise<{ invoiceId: string; message: string }> {
    // Validate input
    const validated = createInvoiceSchema.parse(data);
    
    // Recalculate totals (round half up to 2 decimals)
    const recalculatedSubtotal = this.calculateSubtotal(validated.items);
    const recalculatedTax = this.calculateTax(validated.items);
    const recalculatedTotal = recalculatedSubtotal + recalculatedTax;
    
    // Round to 2 decimals (round half up)
    const round2 = (n: number) => Math.round(n * 100) / 100;
    
    // Verify client totals match server calculations
    if (round2(validated.subtotal) !== round2(recalculatedSubtotal) ||
        round2(validated.tax_amount) !== round2(recalculatedTax) ||
        round2(validated.total_amount) !== round2(recalculatedTotal)) {
      throw new Error('Totals do not match server calculations');
    }
    
    // Insert in transaction
    const pool = await import('./db').then(m => m.pool);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const invoiceId = await invoiceRepository.createInvoice(
        client,
        companyId,
        validated,
        validated.items
      );
      
      await client.query('COMMIT');
      
      return { invoiceId, message: 'Invoice created and queued for processing' };
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      // Unique constraint violation
      if (error.code === '23505') {
        throw new Error('Invoice number already exists for this company');
      }
      
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Calculate subtotal from items
  private calculateSubtotal(items: any[]): number {
    return items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
  }
  
  // Calculate tax from items (tax is a percentage rate)
  private calculateTax(items: any[]): number {
    return items.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineTax = lineSubtotal * (item.tax / 100);
      return sum + lineTax;
    }, 0);
  }
  
  // Get invoice with items
  async getInvoice(companyId: string, invoiceId: string): Promise<any | null> {
    const invoice = await invoiceRepository.getInvoiceById(companyId, invoiceId);
    if (!invoice) {
      return null;
    }
    
    const items = await invoiceRepository.getInvoiceItems(invoiceId);
    const attempts = await invoiceRepository.getProcessingAttempts(invoiceId);
    
    return { ...invoice, items, attempts };
  }
  
  // List invoices
  async listInvoices(companyId: string, filters: any): Promise<{ invoices: any[]; total: number }> {
    return invoiceRepository.listInvoices(companyId, filters);
  }
  
  // Retry failed invoice
  async retryInvoice(companyId: string, invoiceId: string): Promise<void> {
    const success = await invoiceRepository.retryInvoice(companyId, invoiceId);
    if (!success) {
      throw new Error('Invoice cannot be retried (not found or not in FAILED status)');
    }
  }
}

export const invoiceService = new InvoiceService();
