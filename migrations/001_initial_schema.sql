-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (company_id, email)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_tax_id VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(14,2) NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'RETRYING', 'SUBMITTED', 'FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP,
  locked_until TIMESTAMP,
  external_reference VARCHAR(255),
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE (company_id, invoice_number)
);

-- Invoice items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_no INTEGER NOT NULL,
  description VARCHAR(500) NOT NULL,
  quantity NUMERIC(14,2) NOT NULL CHECK (quantity >= 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  tax NUMERIC(5,2) NOT NULL CHECK (tax >= 0),
  line_total NUMERIC(14,2) NOT NULL CHECK (line_total >= 0),
  UNIQUE (invoice_id, line_no)
);

-- Processing attempts table (append-only)
CREATE TABLE IF NOT EXISTS processing_attempts (
  id SERIAL PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  http_status INTEGER,
  error_message TEXT,
  outcome VARCHAR(20) CHECK (outcome IN ('SUCCESS', 'PERMANENT_ERROR', 'TRANSIENT_ERROR', 'TIMEOUT', 'INTERRUPTED')),
  UNIQUE (invoice_id, attempt_no)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoices_company_status_date ON invoices(company_id, status, invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_company_number ON invoices(company_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_next_attempt ON invoices(next_attempt_at) WHERE status IN ('PENDING', 'RETRYING');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
