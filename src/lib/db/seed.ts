import { poolDirect } from '../db';
import { hash } from 'bcrypt';
import 'dotenv/config';

async function seed() {
  const client = await poolDirect.connect();
  try {
    await client.query('BEGIN');
    
    // Insert companies
    const company1Result = await client.query(
      'INSERT INTO companies (name, tax_id) VALUES ($1, $2) ON CONFLICT (tax_id) DO NOTHING RETURNING id',
      ['Acme Corp', 'TAX-001']
    );
    const company1Id = company1Result.rows[0]?.id || (await client.query('SELECT id FROM companies WHERE tax_id = $1', ['TAX-001'])).rows[0].id;
    
    const company2Result = await client.query(
      'INSERT INTO companies (name, tax_id) VALUES ($1, $2) ON CONFLICT (tax_id) DO NOTHING RETURNING id',
      ['Beta Inc', 'TAX-002']
    );
    const company2Id = company2Result.rows[0]?.id || (await client.query('SELECT id FROM companies WHERE tax_id = $1', ['TAX-002'])).rows[0].id;
    
    // Hash passwords
    const passwordHash1 = await hash('password123', 10);
    const passwordHash2 = await hash('password123', 10);
    
    // Insert users
    await client.query(
      'INSERT INTO users (company_id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (company_id, email) DO NOTHING',
      [company1Id, 'user1@acme.com', passwordHash1]
    );
    
    await client.query(
      'INSERT INTO users (company_id, email, password_hash) VALUES ($1, $2, $3) ON CONFLICT (company_id, email) DO NOTHING',
      [company2Id, 'user2@beta.com', passwordHash2]
    );
    
    await client.query('COMMIT');
    console.log('Seed data inserted successfully');
    console.log('Company 1: Acme Corp, user: user1@acme.com, password: password123');
    console.log('Company 2: Beta Inc, user: user2@beta.com, password: password123');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await poolDirect.end();
  }
}

seed().catch(console.error);
