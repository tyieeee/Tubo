import { Pool, PoolClient } from 'pg';
import 'dotenv/config';

// Use Neon's connection string directly
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing DATABASE_URL in .env file');
}

// API pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

// Worker and migrations pool
const poolDirect = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
});

export { pool, poolDirect };
export type { PoolClient };
