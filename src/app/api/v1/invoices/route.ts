import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { invoiceService } from '@/lib/services';
import { invoiceRepository } from '@/lib/repositories';
import { createInvoiceSchema, invoiceListFiltersSchema } from '@/lib/validation';

// Simple rate limiter for create endpoint
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60000;

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

    const result = await invoiceRepository.listInvoices(user.companyId, filters);

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
    console.log('Received invoice data:', JSON.stringify(body, null, 2));

    const result = await invoiceService.createInvoice(user.companyId, body);

    return NextResponse.json(result, { status: 201 });

  } catch (error: any) {
    console.error('Invoice creation error:', error);
    console.error('Error stack:', error.stack);

    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    if (error.message === 'Totals do not match server calculations') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message === 'Invoice number already exists for this company') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error', message: error.message, details: error.toString() }, { status: 500 });
  }
}
