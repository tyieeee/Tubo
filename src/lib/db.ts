import { Pool, PoolClient } from 'pg';

// Try using IP address directly if DNS fails
// Supabase project region: likely us-east-1 or similar
// Common Supabase IPs for direct connection attempt
const SUPABASE_IP = '52.21.116.21'; // This is a placeholder - we need the actual IP

// Build connection string with fallback
const getConnectionString = (port: number) => {
  const host = process.env.DB_HOST || 'db.ipmqudrcfnlzwlbxcejo.supabase.co';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD || '9Ern466q8!123';
  const database = process.env.DB_NAME || 'postgres';
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

// API uses transaction pooler (port 6543, no prepared statements)
const pool = new Pool({
  connectionString: getConnectionString(6543),
  max: 20,
});

// Worker and migrations use direct connection (port 5432)
const poolDirect = new Pool({
  connectionString: getConnectionString(5432),
  max: 5,
});

export { pool, poolDirect };
export type { PoolClient };
