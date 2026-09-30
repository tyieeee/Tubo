import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { invoiceService } from '@/lib/services';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

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

// Get invoice by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    // TEMPORARY: Read from mock file (DNS issue with Supabase)
    const mockInvoices = await getMockInvoices();
    const invoice = mockInvoices.find((inv: any) => inv.id === id);
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    return NextResponse.json(invoice);
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete invoice by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    // TEMPORARY: Delete from mock file (DNS issue with Supabase)
    const mockInvoices = await getMockInvoices();
    const filteredInvoices = mockInvoices.filter((inv: any) => inv.id !== id);
    
    if (mockInvoices.length === filteredInvoices.length) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    await setMockInvoices(filteredInvoices);
    
    return NextResponse.json({ message: 'Invoice deleted successfully' });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
