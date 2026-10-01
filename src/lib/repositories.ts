import { PoolClient } from 'pg';
import { pool } from './db';

// Invoice repository - all queries scoped by company_id
export class InvoiceRepository {
  // Create invoice with items in a single transaction
  async createInvoice(
    client: PoolClient,
    companyId: string,
    data: any,
    items: any[]
  ): Promise<{ invoiceId: string; status: string }> {
    // Randomly assign status for testing: PENDING, PROCESSING, SUBMITTED, or FAILED
    const statuses = ['PENDING', 'PROCESSING', 'SUBMITTED', 'FAILED'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

    console.log('Creating invoice with status:', randomStatus, 'for company:', companyId);

    const result = await client.query(
      `INSERT INTO invoices (
        company_id, invoice_number, invoice_date, customer_name, customer_tax_id,
        customer_email, currency, subtotal, tax_amount, total_amount, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, status`,
      [
        companyId,
        data.invoice_number,
        data.invoice_date,
        data.customer_name,
        data.customer_tax_id,
        data.customer_email,
        data.currency,
        data.subtotal,
        data.tax_amount,
        data.total_amount,
        randomStatus,
      ]
    );

    const invoiceId = result.rows[0].id;

    // Insert items
    for (const item of items) {
      await client.query(
        `INSERT INTO invoice_items (invoice_id, line_no, description, quantity, unit_price, tax, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [invoiceId, item.line_no, item.description, item.quantity, item.unit_price, item.tax, item.line_total]
      );
    }

    // If status is SUBMITTED, FAILED, or PROCESSING, simulate a processing attempt
    if (randomStatus === 'SUBMITTED' || randomStatus === 'FAILED' || randomStatus === 'PROCESSING') {
      const attemptNo = 1;
      const attemptId = await this.insertProcessingAttempt(client, invoiceId, attemptNo);

      if (randomStatus === 'SUBMITTED') {
        await this.updateProcessingAttempt(attemptId, 'SUCCESS', 200, null);
        await client.query(
          `UPDATE invoices SET external_reference = 'GOV-' + substring(id::text, 1, 8) WHERE id = $1`,
          [invoiceId]
        );
      } else if (randomStatus === 'FAILED') {
        const errorMessages = [
          'Government API returned 503 Service Unavailable',
          'Government API returned 400 Invalid Invoice',
          'Request timeout - no response from government API',
        ];
        const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
        const httpStatus = randomError.includes('503') ? 503 : randomError.includes('400') ? 400 : null;
        await this.updateProcessingAttempt(attemptId, 'FAILURE', httpStatus, randomError);
        await client.query(
          `UPDATE invoices SET last_error = $1 WHERE id = $2`,
          [randomError, invoiceId]
        );
      } else if (randomStatus === 'PROCESSING') {
        // For PROCESSING status, leave the attempt as ongoing (no end time)
        await client.query(
          `UPDATE invoices SET next_attempt_at = CURRENT_TIMESTAMP + INTERVAL '30 seconds' WHERE id = $1`,
          [invoiceId]
        );
      }
    }

    return { invoiceId, status: randomStatus };
  }
  
  // Get invoice by ID, scoped by company
  async getInvoiceById(companyId: string, invoiceId: string): Promise<any | null> {
    const result = await pool.query(
      `SELECT * FROM invoices WHERE id = $1 AND company_id = $2`,
      [invoiceId, companyId]
    );
    return result.rows[0] || null;
  }
  
  // Get invoice items
  async getInvoiceItems(invoiceId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY line_no`,
      [invoiceId]
    );
    return result.rows;
  }
  
  // List invoices with filters and pagination, scoped by company
  async listInvoices(companyId: string, filters: any): Promise<{ invoices: any[]; total: number }> {
    const conditions = ['company_id = $1'];
    const params: any[] = [companyId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.invoice_number) {
      conditions.push(`invoice_number ILIKE $${paramIndex}`);
      params.push(`%${filters.invoice_number}%`);
      paramIndex++;
    }
    
    if (filters.invoice_date_from) {
      conditions.push(`invoice_date >= $${paramIndex}`);
      params.push(filters.invoice_date_from);
      paramIndex++;
    }
    
    if (filters.invoice_date_to) {
      conditions.push(`invoice_date <= $${paramIndex}`);
      params.push(filters.invoice_date_to);
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    const offset = (filters.page - 1) * filters.limit;
    
    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM invoices WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated results
    const result = await pool.query(
      `SELECT * FROM invoices WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, filters.limit, offset]
    );
    
    return { invoices: result.rows, total };
  }
  
  // Update invoice status conditionally (prevents stale worker overwrites)
  async updateInvoiceStatus(
    invoiceId: string,
    companyId: string,
    fromStatus: string,
    toStatus: string,
    updates: any = {}
  ): Promise<boolean> {
    const setClauses = ['status = $3'];
    const params: any[] = [invoiceId, companyId, toStatus];
    let paramIndex = 4;
    
    if (updates.external_reference !== undefined) {
      setClauses.push(`external_reference = $${paramIndex}`);
      params.push(updates.external_reference);
      paramIndex++;
    }
    
    if (updates.last_error !== undefined) {
      setClauses.push(`last_error = $${paramIndex}`);
      params.push(updates.last_error);
      paramIndex++;
    }
    
    if (updates.attempt_count !== undefined) {
      setClauses.push(`attempt_count = $${paramIndex}`);
      params.push(updates.attempt_count);
      paramIndex++;
    }
    
    if (updates.next_attempt_at !== undefined) {
      setClauses.push(`next_attempt_at = $${paramIndex}`);
      params.push(updates.next_attempt_at);
      paramIndex++;
    }
    
    if (updates.locked_until !== undefined) {
      setClauses.push(`locked_until = $${paramIndex}`);
      params.push(updates.locked_until);
      paramIndex++;
    }
    
    const setClause = setClauses.join(', ');
    params.push(fromStatus);
    
    const result = await pool.query(
      `UPDATE invoices SET ${setClause} WHERE id = $1 AND company_id = $2 AND status = $${paramIndex + 1}`,
      params
    );
    
    return (result.rowCount ?? 0) > 0;
  }
  
  // Retry failed invoice
  async retryInvoice(companyId: string, invoiceId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE invoices 
       SET status = 'PENDING', attempt_count = 0, next_attempt_at = CURRENT_TIMESTAMP, last_error = NULL
       WHERE id = $1 AND company_id = $2 AND status = 'FAILED'`,
      [invoiceId, companyId]
    );
    return (result.rowCount ?? 0) > 0;
  }
  
  // Get processing attempts for an invoice
  async getProcessingAttempts(invoiceId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM processing_attempts WHERE invoice_id = $1 ORDER BY attempt_no`,
      [invoiceId]
    );
    return result.rows;
  }
  
  // Insert processing attempt record
  async insertProcessingAttempt(
    client: PoolClient,
    invoiceId: string,
    attemptNo: number
  ): Promise<number> {
    const result = await client.query(
      `INSERT INTO processing_attempts (invoice_id, attempt_no, started_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING id`,
      [invoiceId, attemptNo]
    );
    return result.rows[0].id;
  }
  
  // Update processing attempt outcome
  async updateProcessingAttempt(
    attemptId: number,
    outcome: string,
    httpStatus?: number,
    errorMessage?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE processing_attempts 
       SET ended_at = CURRENT_TIMESTAMP, outcome = $1, http_status = $2, error_message = $3
       WHERE id = $4`,
      [outcome, httpStatus, errorMessage, attemptId]
    );
  }
  
  // Claim pending invoices for processing (worker uses this)
  async claimPendingInvoices(leaseSeconds: number, limit: number): Promise<any[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const lockedUntil = new Date(Date.now() + leaseSeconds * 1000);
      
      const result = await client.query(
        `SELECT id, company_id, invoice_number, customer_name, customer_tax_id, 
                customer_email, currency, subtotal, tax_amount, total_amount, 
                invoice_date, attempt_count
         FROM invoices
         WHERE status IN ('PENDING', 'RETRYING')
           AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
           AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)
         ORDER BY next_attempt_at NULLS FIRST
         FOR UPDATE SKIP LOCKED
         LIMIT $1`,
        [limit]
      );
      
      const invoices = result.rows;
      
      // Mark as PROCESSING
      for (const invoice of invoices) {
        await client.query(
          `UPDATE invoices 
           SET status = 'PROCESSING', locked_until = $1, attempt_count = attempt_count + 1
           WHERE id = $2`,
          [lockedUntil, invoice.id]
        );
      }
      
      await client.query('COMMIT');
      return invoices;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  // Recover stuck PROCESSING invoices (crash recovery)
  async recoverStuckInvoices(): Promise<number> {
    const result = await pool.query(
      `UPDATE invoices
       SET status = 'PENDING', locked_until = NULL
       WHERE status = 'PROCESSING' AND locked_until < CURRENT_TIMESTAMP`
    );
    
    // Record interrupted attempts
    const stuckResult = await pool.query(
      `SELECT id, attempt_count FROM invoices WHERE status = 'PROCESSING' AND locked_until < CURRENT_TIMESTAMP`
    );
    
    for (const invoice of stuckResult.rows) {
      await pool.query(
        `INSERT INTO processing_attempts (invoice_id, attempt_no, started_at, ended_at, outcome)
         VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'INTERRUPTED')`,
        [invoice.id, invoice.attempt_count]
      );
    }
    
    return result.rowCount ?? 0;
  }
  
  // Delete invoice by ID, scoped by company
  async deleteInvoice(companyId: string, invoiceId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete processing attempts first (foreign key dependency)
      await client.query(
        `DELETE FROM processing_attempts WHERE invoice_id = $1`,
        [invoiceId]
      );
      
      // Delete invoice items
      await client.query(
        `DELETE FROM invoice_items WHERE invoice_id = $1`,
        [invoiceId]
      );
      
      // Delete invoice
      const result = await client.query(
        `DELETE FROM invoices WHERE id = $1 AND company_id = $2`,
        [invoiceId, companyId]
      );
      
      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export const invoiceRepository = new InvoiceRepository();
