import { poolDirect } from '../lib/db';
import { invoiceRepository } from '../lib/repositories';
import { govClient } from '../lib/gov-client';

// Worker configuration
const WORKER_CONCURRENCY = 5;
const WORKER_LEASE_SECONDS = 30; // Longer than HTTP timeout (10s)
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_RPS = 80; // Requests per second

// Token bucket rate limiter
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private rate: number;
  private capacity: number;
  
  constructor(rate: number, capacity: number) {
    this.rate = rate;
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }
  
  async waitForToken(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.rate);
    this.lastRefill = now;
    
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.rate * 1000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 0;
    } else {
      this.tokens -= 1;
    }
  }
}

// Exponential backoff with jitter
function calculateBackoff(attemptCount: number): number {
  const baseDelays = [30000, 60000, 120000, 300000, 900000]; // 30s, 1m, 2m, 5m, 15m
  const index = Math.min(attemptCount - 1, baseDelays.length - 1);
  const baseDelay = baseDelays[index];
  
  // Add jitter: ±20%
  const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
  return baseDelay + jitter;
}

// Process a single invoice
async function processInvoice(invoice: any): Promise<void> {
  const client = await poolDirect.connect();
  let attemptId: number | null = null;
  
  try {
    await client.query('BEGIN');
    
    // Insert attempt record BEFORE calling gov API
    attemptId = await invoiceRepository.insertProcessingAttempt(
      client,
      invoice.id,
      invoice.attempt_count
    );
    
    await client.query('COMMIT');
    
    // Prepare invoice data for gov API
    const invoiceData = {
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      customer_name: invoice.customer_name,
      customer_tax_id: invoice.customer_tax_id,
      customer_email: invoice.customer_email,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax_amount: invoice.tax_amount,
      total_amount: invoice.total_amount,
    };
    
    // Call gov API
    const result = await govClient.submitInvoice(invoice.id, invoiceData);
    
    // Determine outcome
    let outcome: string;
    let nextStatus: string;
    let nextAttemptAt: Date | null = null;
    let errorMsg: string | null = null;
    
    if (result.status === 200) {
      outcome = 'SUCCESS';
      nextStatus = 'SUBMITTED';
    } else if (result.status === 400) {
      outcome = 'PERMANENT_ERROR';
      nextStatus = 'FAILED';
      errorMsg = result.data?.error || 'Bad request';
    } else if (result.status === 503 || result.status === 0) {
      // Transient error or timeout
      if (invoice.attempt_count >= MAX_ATTEMPTS) {
        outcome = result.status === 0 ? 'TIMEOUT' : 'TRANSIENT_ERROR';
        nextStatus = 'FAILED';
        errorMsg = result.error || 'Service unavailable';
      } else {
        outcome = result.status === 0 ? 'TIMEOUT' : 'TRANSIENT_ERROR';
        nextStatus = 'RETRYING';
        nextAttemptAt = new Date(Date.now() + calculateBackoff(invoice.attempt_count));
        errorMsg = result.error || 'Service unavailable';
      }
    } else {
      outcome = 'TRANSIENT_ERROR';
      nextStatus = 'FAILED';
      errorMsg = `Unexpected status: ${result.status}`;
    }
    
    // Update attempt record
    await invoiceRepository.updateProcessingAttempt(
      attemptId,
      outcome,
      result.status || undefined,
      errorMsg || undefined
    );
    
    // Update invoice status conditionally
    const success = await invoiceRepository.updateInvoiceStatus(
      invoice.id,
      invoice.company_id,
      'PROCESSING',
      nextStatus,
      {
        external_reference: result.data?.reference,
        last_error: errorMsg,
        next_attempt_at: nextAttemptAt,
        locked_until: null,
      }
    );
    
    if (!success) {
      console.error(`Failed to update invoice ${invoice.id} status - may have been updated by another worker`);
    }
    
  } catch (error: any) {
    if (attemptId) {
      await invoiceRepository.updateProcessingAttempt(
        attemptId,
        'TRANSIENT_ERROR',
        undefined,
        error.message
      );
    }
    
    // Release lock on error
    await invoiceRepository.updateInvoiceStatus(
      invoice.id,
      invoice.company_id,
      'PROCESSING',
      'RETRYING',
      {
        last_error: error.message,
        next_attempt_at: new Date(Date.now() + calculateBackoff(invoice.attempt_count)),
        locked_until: null,
      }
    );
    
    throw error;
  } finally {
    client.release();
  }
}

// Main worker loop
async function workerLoop(rateLimiter: RateLimiter): Promise<void> {
  while (true) {
    try {
      // Wait for rate limit token
      await rateLimiter.waitForToken();
      
      // Claim pending invoices
      const invoices = await invoiceRepository.claimPendingInvoices(WORKER_LEASE_SECONDS, 1);
      
      if (invoices.length === 0) {
        // No work, sleep briefly
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // Process invoice
      for (const invoice of invoices) {
        await processInvoice(invoice);
      }
      
    } catch (error) {
      console.error('Worker error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Graceful shutdown
let workers: Promise<void>[] = [];

async function shutdown() {
  console.log('Shutting down worker...');
  // Workers will exit on next iteration due to flag (simplified)
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start workers
async function start() {
  console.log('Starting worker...');
  
  // Recover stuck invoices on startup
  const recovered = await invoiceRepository.recoverStuckInvoices();
  if (recovered > 0) {
    console.log(`Recovered ${recovered} stuck invoices`);
  }
  
  const rateLimiter = new RateLimiter(RATE_LIMIT_RPS, RATE_LIMIT_RPS);
  
  // Start concurrent workers
  for (let i = 0; i < WORKER_CONCURRENCY; i++) {
    workers.push(workerLoop(rateLimiter));
  }
  
  // Wait for all workers (never exits normally)
  await Promise.all(workers);
}

start().catch(console.error);
