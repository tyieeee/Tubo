import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { pool } from '@/lib/db';
import 'dotenv/config';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch company name
    const companyResult = await pool.query(
      'SELECT name FROM companies WHERE id = $1',
      [user.companyId]
    );

    const companyName = companyResult.rows[0]?.name || '';

    return NextResponse.json({ email: user.email, companyId: user.companyId, companyName });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
