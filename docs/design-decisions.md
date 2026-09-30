# Design Decisions Documentation

## Money Handling

### Rounding Rule
All monetary calculations use "round half up" to 2 decimal places:
```javascript
const round2 = (n: number) => Math.round(n * 100) / 100;
```

### Why NUMERIC instead of FLOAT?
- Floating point arithmetic has precision issues (e.g., 0.1 + 0.2 !== 0.3)
- NUMERIC(14,2) provides exact decimal representation
- Prevents cumulative rounding errors in financial calculations

### Server-Side Recalculation
The server recalculates all totals from line items and rejects requests where client totals don't match. This prevents:
- Clients manipulating totals
- Rounding discrepancies between client and server
- Invalid data reaching the database

## Idempotency

### Invoice Creation
- Optional `Idempotency-Key` header in request
- Currently simple implementation (should use database in production)
- Prevents duplicate invoice creation on network retries

### Government API Calls
- Always includes `Idempotency-Key: <invoice id>` header
- Same key used on every retry for the same invoice
- Mock gov API dedupes responses based on this key
- Ensures that retries don't create duplicate submissions

## Locking and Leases

### Worker Job Claiming
```sql
SELECT ... FROM invoices
WHERE status IN ('PENDING', 'RETRYING')
  AND (next_attempt_at IS NULL OR next_attempt_at <= CURRENT_TIMESTAMP)
  AND (locked_until IS NULL OR locked_until < CURRENT_TIMESTAMP)
FOR UPDATE SKIP LOCKED
```

- `FOR UPDATE`: Locks selected rows
- `SKIP LOCKED`: Concurrent workers skip already-locked rows
- Prevents multiple workers processing the same invoice

### Lease Mechanism
- Worker sets `locked_until = now() + 30s` when claiming a job
- Lease (30s) is longer than HTTP timeout (10s)
- If worker crashes, lease expires and job becomes claimable
- Prevents jobs from being stuck indefinitely

### Crash Recovery
On startup, worker runs:
```sql
UPDATE invoices
SET status = 'PENDING', locked_until = NULL
WHERE status = 'PROCESSING' AND locked_until < CURRENT_TIMESTAMP
```

Also records interrupted attempts:
```sql
INSERT INTO processing_attempts (invoice_id, attempt_no, started_at, ended_at, outcome)
VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'INTERRUPTED')
```

## Conditional Status Updates

All final status updates are conditional:
```sql
UPDATE invoices SET status = 'SUBMITTED'
WHERE id = $1 AND company_id = $2 AND status = 'PROCESSING'
```

This prevents a stale worker from overwriting newer results:
- If another worker already updated the status, the UPDATE affects 0 rows
- Worker can detect this and log the conflict
- Ensures the most recent result wins

## Exponential Backoff with Jitter

### Backoff Schedule
- Attempt 1: 30 seconds
- Attempt 2: 1 minute
- Attempt 3: 2 minutes
- Attempt 4: 5 minutes
- Attempt 5+: 15 minutes (capped)

### Jitter
Adds ±20% random jitter to prevent thundering herd:
```javascript
const jitter = baseDelay * 0.2 * (Math.random() * 2 - 1);
return baseDelay + jitter;
```

### Why Jitter?
- Prevents all retries from happening simultaneously
- Reduces load on the government API
- Improves overall system stability

## Company Scoping

### JWT Payload
```typescript
{
  companyId: string;
  userId: string;
  email: string;
}
```

### All Queries Scoped by Company
Every query includes `WHERE company_id = $1`:
- Prevents cross-company data access
- Returns 404 (not 403) for other companies' data
- Company ID never comes from request body

### Security Benefits
- No way to access another company's data
- Simple authorization model
- Easy to audit and reason about

## Database Connections

### Two Connection Pools
1. **API Routes** (`DATABASE_URL`): Transaction pooler on port 6543
   - No prepared statements (pooler limitation)
   - High concurrency for HTTP requests

2. **Worker & Migrations** (`DATABASE_URL_DIRECT`): Direct connection on port 5432
   - Full PostgreSQL features
   - Lower concurrency (worker is single-process)
   - Needed for migrations and complex locking queries

## Rate Limiting

### Token Bucket Algorithm
- Simple in-memory implementation
- 80 requests per second for worker
- 5 requests per minute for login
- 20 requests per minute for invoice creation

### Why In-Memory?
- Simple implementation for assessment
- In production, use Redis or similar
- Resets on server restart (acceptable for assessment)

## Processing Attempts Table

### Append-Only Design
- Records are never updated (except to close the row)
- Each attempt gets a new row
- Provides complete audit trail
- Unique constraint on (invoice_id, attempt_no)

### Outcomes
- `SUCCESS`: Invoice submitted successfully
- `PERMANENT_ERROR`: 400 response, don't retry
- `TRANSIENT_ERROR`: 503 response, retry with backoff
- `TIMEOUT`: Request timed out, retry with backoff
- `INTERRUPTED`: Worker crashed during processing

## Error Handling

### Consistent JSON Error Format
```json
{
  "error": "Error message",
  "details": {} // Optional validation details
}
```

### HTTP Status Codes
- 400: Bad request / validation error
- 401: Unauthorized
- 404: Not found (including other company's data)
- 409: Conflict (duplicate invoice, not eligible for retry)
- 429: Rate limited
- 500: Internal server error
