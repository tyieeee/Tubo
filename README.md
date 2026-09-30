# Tubo - E-Invoicing Platform

A technical assessment project for an e-invoicing platform that validates and submits invoices to a mocked government API.

## Tech Stack

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + PostgreSQL (Supabase)
- **Auth**: Custom JWT implementation using `jose` and `bcrypt`
- **Validation**: Zod + React Hook Form
- **Worker**: Separate background process for invoice processing
- **Testing**: Vitest
- **Database**: Raw SQL queries with `pg` (no ORM)

## Database Schema

- `companies`: Business entities
- `users`: Company users with credentials
- `invoices`: Invoice records with processing status
- `invoice_items`: Line items for each invoice
- `processing_attempts`: Append-only log of processing attempts

## Key Features

- **Company-scoped data**: All queries scoped by `company_id` from JWT
- **Idempotency**: Idempotency-Key header for invoice creation and gov API calls
- **Locking**: `FOR UPDATE SKIP LOCKED` for worker job claiming
- **Leases**: Time-based locks with crash recovery
- **Exponential backoff**: With jitter for retries (30s, 1m, 2m, 5m, 15m)
- **Money handling**: NUMERIC(14,2) with round-half-up to 2 decimals
- **Server-side validation**: Totals recalculated and verified

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
DATABASE_URL=postgresql://postgres:password@host:6543/postgres
DATABASE_URL_DIRECT=postgresql://postgres:password@host:5432/postgres
JWT_SECRET=your-secret-key-here
GOV_API_URL=http://localhost:3000/api/mock-gov
GOV_API_KEY=your-gov-api-key
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (see above)

3. Run migrations:
```bash
npm run migrate
```

4. Seed database:
```bash
npm run seed
```

## Running the Application

Start the development server:
```bash
npm run dev
```

Start the background worker (in a separate terminal):
```bash
npm run worker
```

## API Endpoints

- `POST /api/v1/auth/login` - User login
- `GET /api/health` - Health check
- `GET /api/v1/invoices` - List invoices (filtered by company)
- `POST /api/v1/invoices` - Create invoice
- `GET /api/v1/invoices/:id` - Get invoice details
- `POST /api/v1/invoices/:id/retry` - Retry failed invoice
- `POST /api/mock-gov/submit` - Mock government API

## Frontend Pages

- `/` - Landing page
- `/login` - Login page
- `/dashboard` - Invoice dashboard with filters
- `/invoices/create` - Create invoice form
- `/invoices/:id` - Invoice details with processing timeline

## Seed Data

After running `npm run seed`, you can login with:

- Company 1: `user1@acme.com` / `password123`
- Company 2: `user2@beta.com` / `password123`

## Architecture Decisions

### Database Connections
- `DATABASE_URL` (port 6543): Transaction pooler for API routes (no prepared statements)
- `DATABASE_URL_DIRECT` (port 5432): Direct connection for worker and migrations

### Worker Processing
- Claims jobs with `SELECT ... FOR UPDATE SKIP LOCKED`
- Sets `PROCESSING` status with `locked_until` lease
- Inserts attempt record BEFORE calling gov API
- Uses exponential backoff with jitter for retries
- Conditional updates prevent stale worker overwrites
- Crash recovery re-queues stuck invoices

### Money Handling
- All monetary values stored as NUMERIC(14,2)
- Server recalculates totals from line items
- Rounding rule: round half up to 2 decimals
- Tax is stored as a percentage rate

### Security
- JWT tokens in httpOnly cookies
- Company ID from JWT only (never from request body)
- Rate limiting on login and create endpoints
- Passwords hashed with bcrypt
