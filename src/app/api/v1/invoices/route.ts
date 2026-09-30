import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { invoiceService } from '@/lib/services';
import { createInvoiceSchema, invoiceListFiltersSchema } from '@/lib/validation';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Simple rate limiter for create endpoint
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60000;

// TEMPORARY: File-based storage for persistence
const STORAGE_FILE = join(process.cwd(), 'mock-invoices.json');

const getMockInvoices = async () => {
  try {
    const data = await readFile(STORAGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

const setMockInvoices = async (invoices: any[]) => {
  await writeFile(STORAGE_FILE, JSON.stringify(invoices, null, 2));
};

function checkRateLimit(companyId: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(companyId);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(companyId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// List invoices
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const filters = invoiceListFiltersSchema.parse(Object.fromEntries(searchParams));
    
    // TEMPORARY: Return mock invoices from file (DNS issue with Supabase)
    const mockInvoices = await getMockInvoices();
    let filteredInvoices = [...mockInvoices];
    
    // Apply status filter
    if (filters.status) {
      filteredInvoices = filteredInvoices.filter(i => i.status === filters.status);
    }
    
    // Apply invoice number filter (also searches customer name)
    if (filters.invoice_number) {
      const searchTerm = filters.invoice_number?.toLowerCase() || '';
      filteredInvoices = filteredInvoices.filter(i => 
        i.invoice_number?.toLowerCase().includes(searchTerm) ||
        i.customer_name?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply date filters
    if (filters.invoice_date_from) {
      filteredInvoices = filteredInvoices.filter(i => 
        i.invoice_date && i.invoice_date >= filters.invoice_date_from!
      );
    }
    
    if (filters.invoice_date_to) {
      filteredInvoices = filteredInvoices.filter(i => 
        i.invoice_date && i.invoice_date <= filters.invoice_date_to!
      );
    }
    
    // Apply pagination
    const limit = filters.limit || 10;
    const startIndex = (filters.page - 1) * limit;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + limit);
    
    const result = { 
      invoices: paginatedInvoices, 
      total: filteredInvoices.length 
    };
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid filters', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create invoice
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting
    if (!checkRateLimit(user.companyId)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }
    
    const body = await request.json();
    
    // TEMPORARY: Create mock invoice (DNS issue with Supabase)
    const mockInvoiceId = `inv-${Date.now()}`;
    const mockInvoice = {
      id: mockInvoiceId,
      company_id: user.companyId,
      invoice_number: body.invoice_number || `INV-${Date.now()}`,
      invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
      customer_name: body.customer_name || 'Test Customer',
      customer_tax_id: body.customer_tax_id || 'TAX-001',
      customer_email: body.customer_email || 'test@example.com',
      currency: body.currency || 'USD',
      subtotal: body.subtotal || 0,
      tax_amount: body.tax_amount || 0,
      total_amount: body.total_amount || 0,
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };
    
    // Add to mock storage (file-based)
    const mockInvoices = await getMockInvoices();
    mockInvoices.push(mockInvoice);
    await setMockInvoices(mockInvoices);
    
    return NextResponse.json(
      { 
        invoiceId: mockInvoiceId, 
        message: 'Invoice created and queued for processing (mock - no database)' 
      }, 
      { status: 202 }
    );
    
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
