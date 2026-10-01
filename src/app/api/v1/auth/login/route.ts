import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, generateToken, setAuthCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import 'dotenv/config';

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

    // Verify credentials against database
    const user = await verifyCredentials(validated.email, validated.password);

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await generateToken(user);
    await setAuthCookie(token);

    return NextResponse.json({
      message: 'Login successful',
      user: { companyId: user.companyId, userId: user.userId, email: user.email }
    });

  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
