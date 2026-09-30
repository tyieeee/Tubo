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

// Retry failed invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    
    // TEMPORARY: Update mock file (DNS issue with Supabase)
    const mockInvoices = await getMockInvoices();
    const invoiceIndex = mockInvoices.findIndex((inv: any) => inv.id === id);
    
    if (invoiceIndex === -1) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    const invoice = mockInvoices[invoiceIndex];
    
    if (invoice.status !== 'FAILED') {
      return NextResponse.json({ error: 'Invoice cannot be retried (not in FAILED status)' }, { status: 409 });
    }
    
    // Update status to PENDING for retry
    mockInvoices[invoiceIndex] = {
      ...invoice,
      status: 'PENDING',
      last_error: null,
    };
    
    await setMockInvoices(mockInvoices);
    
    return NextResponse.json({ message: 'Invoice queued for retry' });
    
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
