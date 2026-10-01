import { NextRequest, NextResponse } from 'next/server';

// In-memory idempotency store (reset on server restart)
const idempotencyStore = new Map<string, { status: number; data: any }>();

// Weighted random outcomes: 70% success, 15% transient error, 10% permanent error, 5% timeout
function getRandomOutcome(): { status: number; data?: any; delay?: number } {
  const rand = Math.random();

  if (rand < 0.70) {
    return { status: 200, data: { reference: `GOV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` } };
  } else if (rand < 0.85) {
    return { status: 503, data: { error: 'Service temporarily unavailable' } };
  } else if (rand < 0.95) {
    return { status: 400, data: { error: 'Invalid invoice data' } };
  } else {
    return { status: 200, delay: 15000 }; // Hang for 15 seconds (timeout)
  }
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get('Idempotency-Key');

  if (!idempotencyKey) {
    return NextResponse.json({ error: 'Missing Idempotency-Key header' }, { status: 400 });
  }

  // Check idempotency store
  if (idempotencyStore.has(idempotencyKey)) {
    const cached = idempotencyStore.get(idempotencyKey)!;
    return NextResponse.json(cached.data, { status: cached.status });
  }

  // Generate random outcome
  const outcome = getRandomOutcome();

  // Simulate delay if needed (timeout scenario)
  if (outcome.delay) {
    await new Promise(resolve => setTimeout(resolve, outcome.delay));
  }

  // Store in idempotency cache
  idempotencyStore.set(idempotencyKey, { status: outcome.status, data: outcome.data });

  return NextResponse.json(outcome.data, { status: outcome.status });
}
