import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';

// Simple rate limiter using in-memory map (reset on server restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many login attempts' }, { status: 429 });
    }
    
    const body = await request.json();
    const validated = loginSchema.parse(body);
    
    // TEMPORARY: Mock login (DNS issue with Supabase)
    const mockUser = {
      companyId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000001',
      email: validated.email,
    };
    
    const token = await generateToken(mockUser);
    await setAuthCookie(token);
    
    return NextResponse.json({ 
      message: 'Login successful',
      user: { companyId: mockUser.companyId, userId: mockUser.userId, email: mockUser.email }
    });
    
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
