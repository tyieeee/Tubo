import { Pool, PoolClient } from 'pg';

// API uses transaction pooler (port 6543, no prepared statements)
const pool = new Pool({
  host: process.env.DB_HOST || 'db.ipmqudrcfnlzwlbxcejo.supabase.co',
  port: parseInt(process.env.DB_PORT || '6543'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9Ern466q8!123',
  max: 20,
});

// Worker and migrations use direct connection (port 5432)
const poolDirect = new Pool({
  host: process.env.DB_HOST || 'db.ipmqudrcfnlzwlbxcejo.supabase.co',
  port: parseInt(process.env.DB_PORT_DIRECT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '9Ern466q8!123',
  max: 5,
});

export { pool, poolDirect };
export type { PoolClient };
