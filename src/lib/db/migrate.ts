import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { poolDirect } from '../db';

async function migrate() {
  const client = await poolDirect.connect();
  try {
    console.log('Running migrations...');
    
    const migrationPath = join(process.cwd(), 'migrations', '001_initial_schema.sql');
    const sql = readFileSync(migrationPath, 'utf-8');
    
    await client.query(sql);
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await poolDirect.end();
  }
}

migrate().catch(console.error);
