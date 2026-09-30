import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { pool } from './db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface JWTPayload {
  companyId: string;
  userId: string;
  email: string;
}

// Generate JWT token
export async function generateToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
  return token;
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Get current user from cookie
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token);
}

// Set auth cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });
}

// Clear auth cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}

// Verify user credentials
export async function verifyCredentials(email: string, password: string): Promise<{ companyId: string; userId: string; email: string } | null> {
  const result = await pool.query(
    `SELECT u.id, u.company_id, u.email, u.password_hash, c.id as company_exists
     FROM users u
     JOIN companies c ON u.company_id = c.id
     WHERE u.email = $1`,
    [email]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  const user = result.rows[0];
  const { compare } = await import('bcrypt');
  const isValid = await compare(password, user.password_hash);
  
  if (!isValid) {
    return null;
  }
  
  return {
    companyId: user.company_id,
    userId: user.id,
    email: user.email,
  };
}
